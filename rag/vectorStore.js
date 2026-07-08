var fs = require('fs');
var path = require('path');

var VECTOR_CACHE_PATH = path.join(__dirname, '..', 'data', 'vector_store.json');

function VectorStore(embeddingService) {
  this.documents = [];
  this.indices = {};
  this.embeddingService = embeddingService || null;
  this._loadFromDisk();
}

VectorStore.prototype._loadFromDisk = function() {
  try {
    if (fs.existsSync(VECTOR_CACHE_PATH)) {
      var data = JSON.parse(fs.readFileSync(VECTOR_CACHE_PATH, 'utf-8'));
      this.documents = data.documents || [];
      this.indices = data.indices || {};
    }
  } catch (e) {
    this.documents = [];
    this.indices = {};
  }
};

VectorStore.prototype._saveToDisk = function() {
  try {
    var dir = path.dirname(VECTOR_CACHE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(VECTOR_CACHE_PATH, JSON.stringify({
      documents: this.documents,
      indices: this.indices
    }), 'utf-8');
  } catch (e) {}
};

VectorStore.prototype.addDocument = function(doc) {
  var document = {
    id: doc.id || this.generateId(),
    content: doc.content,
    metadata: doc.metadata || {},
    embedding: doc.embedding || null,
    createdAt: new Date().toISOString()
  };
  this.documents.push(document);
  if (doc.metadata && doc.metadata.category) {
    if (!this.indices[doc.metadata.category]) {
      this.indices[doc.metadata.category] = [];
    }
    this.indices[doc.metadata.category].push(document.id);
  }
  return document;
};

VectorStore.prototype.addDocumentWithEmbedding = async function(doc) {
  var document = this.addDocument(doc);
  if (this.embeddingService && this.embeddingService.ready) {
    document.embedding = await this.embeddingService.embed(doc.content);
    this._saveToDisk();
  }
  return document;
};

VectorStore.prototype.embedAllDocuments = async function() {
  if (!this.embeddingService || !this.embeddingService.ready) return;
  var i, doc;
  for (i = 0; i < this.documents.length; i++) {
    doc = this.documents[i];
    if (!doc.embedding) {
      doc.embedding = await this.embeddingService.embed(doc.content);
    }
  }
  this._saveToDisk();
  console.log('[VectorStore] 已为 ' + this.documents.length + ' 条文档生成向量');
};

VectorStore.prototype.semanticSearch = function(queryVector, options) {
  if (!queryVector) return { query: '', results: [], total: 0 };
  if (!options) options = {};

  var limit = options.limit || 5;
  var category = options.category || null;
  var minScore = options.minScore || 30;
  var scored = [], i, doc;

  for (i = 0; i < this.documents.length; i++) {
    doc = this.documents[i];
    if (category && doc.metadata.category !== category) continue;
    if (!doc.embedding) continue;

    var sim = this._cosineSimilarity(queryVector, doc.embedding) * 100;
    if (sim >= minScore) {
      scored.push({
        id: doc.id, content: doc.content, metadata: doc.metadata,
        score: Math.round(sim), source: 'semantic'
      });
    }
  }
  scored.sort(function(a, b) { return b.score - a.score; });
  return {
    query: 'semantic',
    results: scored.slice(0, limit),
    total: scored.length
  };
};

VectorStore.prototype.keywordSearch = function(query, options) {
  if (!options) options = {};
  var limit = options.limit || 5;
  var category = options.category || null;
  var minScore = options.minScore || 0;
  var results = [];
  var queryLower = query.toLowerCase();
  var i, doc;

  for (i = 0; i < this.documents.length; i++) {
    doc = this.documents[i];
    if (category && doc.metadata.category !== category) continue;
    var score = this.calculateKeywordScore(doc.content, queryLower);
    if (score > minScore) {
      results.push({
        id: doc.id, content: doc.content, metadata: doc.metadata,
        score: score, source: 'keyword'
      });
    }
  }
  results.sort(function(a, b) { return b.score - a.score; });
  return {
    query: query,
    results: results.slice(0, limit),
    total: results.length
  };
};

VectorStore.prototype.hybridSearch = function(query, options) {
  if (!options) options = {};

  var keywordResults = this.keywordSearch(query, { limit: 10, category: options.category });
  var keywordMap = {};
  var i, r;
  for (i = 0; i < keywordResults.results.length; i++) {
    r = keywordResults.results[i];
    keywordMap[r.id] = r;
  }

  var merged = [];
  for (i = 0; i < keywordResults.results.length; i++) {
    r = keywordResults.results[i];
    merged.push({
      id: r.id, content: r.content, metadata: r.metadata,
      score: r.score, sources: ['keyword'], source: 'keyword'
    });
  }

  merged.sort(function(a, b) { return b.score - a.score; });
  return {
    query: query,
    results: merged.slice(0, options.limit || 5),
    total: merged.length,
    mode: (this.embeddingService && this.embeddingService.ready) ? 'hybrid' : 'keyword'
  };
};

VectorStore.prototype.hybridSearchWithEmbedding = async function(query, options) {
  if (!options) options = {};
  var limit = options.limit || 5;
  var queryVector = null;

  if (this.embeddingService && this.embeddingService.ready) {
    queryVector = await this.embeddingService.embed(query);
  }

  var semResults = this.semanticSearch(queryVector, { limit: 10, category: options.category, minScore: 20 });
  var kwResults = this.keywordSearch(query, { limit: 10, category: options.category });

  var semMap = {}, kwMap = {};
  var i, r;
  for (i = 0; i < semResults.results.length; i++) {
    r = semResults.results[i];
    semMap[r.id] = r;
  }
  for (i = 0; i < kwResults.results.length; i++) {
    r = kwResults.results[i];
    kwMap[r.id] = r;
  }

  var mergedMap = {};
  for (i = 0; i < semResults.results.length; i++) {
    r = semResults.results[i];
    var kwScore = kwMap[r.id] ? kwMap[r.id].score : 0;
    var hybridScore = Math.round(r.score * 0.7 + kwScore * 0.3);
    mergedMap[r.id] = {
      id: r.id, content: r.content, metadata: r.metadata,
      score: hybridScore, sources: kwMap[r.id] ? ['semantic', 'keyword'] : ['semantic'],
      source: kwMap[r.id] ? 'hybrid' : 'semantic'
    };
  }
  for (i = 0; i < kwResults.results.length; i++) {
    r = kwResults.results[i];
    if (!mergedMap[r.id]) {
      mergedMap[r.id] = {
        id: r.id, content: r.content, metadata: r.metadata,
        score: r.score, sources: ['keyword'], source: 'keyword'
      };
    }
  }

  var merged = Object.values(mergedMap);
  merged.sort(function(a, b) { return b.score - a.score; });

  return {
    query: query,
    results: merged.slice(0, limit),
    total: merged.length,
    mode: queryVector ? 'hybrid' : 'keyword'
  };
};

VectorStore.prototype.search = async function(query, options) {
  if (this.embeddingService && this.embeddingService.ready) {
    return await this.hybridSearchWithEmbedding(query, options);
  }
  return this.hybridSearch(query, options);
};

VectorStore.prototype.calculateKeywordScore = function(content, query) {
  var score = 0;
  var contentLower = content.toLowerCase();
  if (contentLower.indexOf(query) !== -1) score += 100;
  var queryWords = query.split(/\s+/);
  var matchCount = 0, j, word;
  for (j = 0; j < queryWords.length; j++) {
    word = queryWords[j];
    if (word.length > 1 && contentLower.indexOf(word) !== -1) {
      matchCount++; score += 20;
    }
  }
  if (matchCount > 0) score += (matchCount / queryWords.length) * 50;
  return Math.min(score, 100);
};

VectorStore.prototype._cosineSimilarity = function(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  var dot = 0, i;
  for (i = 0; i < a.length; i++) dot += a[i] * b[i];
  return Math.max(0, Math.min(1, dot));
};

VectorStore.prototype.getDocument = function(id) {
  var i, doc;
  for (i = 0; i < this.documents.length; i++) {
    if (this.documents[i].id === id) return this.documents[i];
  }
  return null;
};

VectorStore.prototype.getAllDocuments = function() {
  return this.documents;
};

VectorStore.prototype.deleteDocument = function(id) {
  var idx = -1, i;
  for (i = 0; i < this.documents.length; i++) {
    if (this.documents[i].id === id) { idx = i; break; }
  }
  if (idx !== -1) {
    this.documents.splice(idx, 1);
    var cat;
    for (cat in this.indices) {
      if (this.indices.hasOwnProperty(cat)) {
        var ci = this.indices[cat].indexOf(id);
        if (ci !== -1) this.indices[cat].splice(ci, 1);
      }
    }
    this._saveToDisk();
  }
};

VectorStore.prototype.clear = function() {
  this.documents = [];
  this.indices = {};
};

VectorStore.prototype.generateId = function() {
  return 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

module.exports = VectorStore;