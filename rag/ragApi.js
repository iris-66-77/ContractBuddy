var EnhancedAnalyzer = require('./enhancedAnalysis');
var VectorStore = require('./vectorStore');
var EmbeddingService = require('./embeddingService');

var analyzer = null;
var knowledgeStore = null;
var embeddingService = null;

async function initRagServices() {
  if (!embeddingService) {
    embeddingService = new EmbeddingService();
    await embeddingService.init();
  }
  if (!knowledgeStore) {
    knowledgeStore = new VectorStore(embeddingService);
  }
  if (!analyzer) {
    analyzer = new EnhancedAnalyzer(knowledgeStore, embeddingService);
    await analyzer.initializeKnowledgeBaseAsync();
  }
}

async function handleEnhancedAnalysis(req, res, pb) {
  try {
    var body = await pb(req);
    var text = body.text;

    if (!text || text.trim().length < 20) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: '合同文本太短，需要至少20个字符' }));
      return;
    }

    await initRagServices();

    var result = await analyzer.analyzeContractEnhanced(text);

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(result));
  } catch (error) {
    console.error('增强分析错误:', error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: '分析失败: ' + error.message }));
  }
}

async function handleKnowledgeSearch(req, res, pb, urlObj) {
  try {
    var body = await pb(req);
    var query = body.query || (urlObj && urlObj.query && urlObj.query.q) || '';

    if (!query || query.trim().length < 2) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: '搜索关键词太短' }));
      return;
    }

    await initRagServices();

    var options = {
      limit: parseInt(body.limit) || 5,
      category: body.category || null
    };

    var result = await knowledgeStore.search(query, options);

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(result));
  } catch (error) {
    console.error('搜索错误:', error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: '搜索失败: ' + error.message }));
  }
}

async function handleAddKnowledge(req, res, pb) {
  try {
    var body = await pb(req);
    var content = body.content;
    var metadata = body.metadata || {};

    if (!content || content.trim().length < 10) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: '文档内容太短' }));
      return;
    }

    await initRagServices();

    var doc = await knowledgeStore.addDocumentWithEmbedding({
      content: content,
      metadata: metadata
    });

    res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ success: true, document: doc }));
  } catch (error) {
    console.error('添加知识错误:', error);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: '添加失败: ' + error.message }));
  }
}

function handleKnowledgeStatus(req, res) {
  if (!knowledgeStore) {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ totalDocuments: 0, docs: [] }));
    return;
  }

  var documents = knowledgeStore.getAllDocuments();

  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({
    totalDocuments: documents.length,
    docs: documents
  }));
}

module.exports = {
  initRagServices: initRagServices,
  handleEnhancedAnalysis: handleEnhancedAnalysis,
  handleKnowledgeSearch: handleKnowledgeSearch,
  handleAddKnowledge: handleAddKnowledge,
  handleKnowledgeStatus: handleKnowledgeStatus
};