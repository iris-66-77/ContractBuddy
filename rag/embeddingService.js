var fs = require('fs');
var path = require('path');

function cosineSimilarity(a, b) {
  var dot = 0, i;
  for (i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

function dotProduct(a, b) {
  var dot = 0, i;
  for (i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

function normalize(vec) {
  var sum = 0, i;
  for (i = 0; i < vec.length; i++) sum += vec[i] * vec[i];
  var len = Math.sqrt(sum);
  if (len === 0) return vec;
  var result = [];
  for (i = 0; i < vec.length; i++) result[i] = vec[i] / len;
  return result;
}

var CACHE_PATH = path.join(__dirname, '..', 'data', 'embeddings_cache.json');

function EmbeddingService() {
  this.pipeline = null;
  this.ready = false;
  this.modelName = 'Xenova/all-MiniLM-L6-v2';
  this.dim = 384;
  this._cache = {};
  this._loadCache();
}

EmbeddingService.prototype._loadCache = function() {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      this._cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
    }
  } catch (e) {
    this._cache = {};
  }
};

EmbeddingService.prototype._saveCache = function() {
  try {
    var dir = path.dirname(CACHE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(CACHE_PATH, JSON.stringify(this._cache), 'utf-8');
  } catch (e) {}
};

EmbeddingService.prototype.init = async function() {
  try {
    var t = require('@xenova/transformers');
    this.pipeline = await t.pipeline('feature-extraction', this.modelName, {
      quantized: true
    });
    this.ready = true;
    console.log('[Embedding] 模型加载完成 (' + this.modelName + ', ' + this.dim + '维)');
  } catch (e) {
    console.error('[Embedding] 模型加载失败，将使用关键词检索作为降级:', e.message);
    this.ready = false;
  }
};

EmbeddingService.prototype.embed = async function(text) {
  var cacheKey = text.substring(0, 200);
  if (this._cache[cacheKey]) return this._cache[cacheKey];

  if (!this.ready || !this.pipeline) {
    return null;
  }

  try {
    var output = await this.pipeline(text, { pooling: 'mean', normalize: true });
    var vec = Array.from(output.data);
    this._cache[cacheKey] = vec;
    if (Object.keys(this._cache).length % 50 === 0) this._saveCache();
    return vec;
  } catch (e) {
    console.error('[Embedding] 向量化失败:', e.message);
    return null;
  }
};

EmbeddingService.prototype.embedBatch = async function(texts) {
  var results = [], i;
  for (i = 0; i < texts.length; i++) {
    results.push(await this.embed(texts[i]));
  }
  this._saveCache();
  return results;
};

EmbeddingService.prototype.similarity = function(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  return cosineSimilarity(a, b);
};

EmbeddingService.prototype.search = function(queryVector, documents, topK) {
  if (!queryVector) return [];
  if (!topK) topK = 5;
  var scored = [], i, doc;
  for (i = 0; i < documents.length; i++) {
    doc = documents[i];
    if (!doc.embedding) continue;
    var sim = cosineSimilarity(queryVector, doc.embedding);
    if (sim > 0.3) {
      scored.push({ index: i, doc: doc, score: Math.round(sim * 100) });
    }
  }
  scored.sort(function(a, b) { return b.score - a.score; });
  return scored.slice(0, topK);
};

module.exports = EmbeddingService;