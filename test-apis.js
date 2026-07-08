
const http = require('http');

console.log('=== 测试项目功能 ===');

function makeRequest(options, data) {
  return new Promise(function(resolve, reject) {
    const req = http.request(options, function(res) {
      let body = '';
      res.on('data', function(chunk) { body += chunk; });
      res.on('end', function() {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function testAll() {
  try {
    console.log('\n1. 测试服务器是否正常响应...');
    const index = await makeRequest({ hostname: 'localhost', port: 3000, path: '/', method: 'GET' });
    console.log(index.status === 200 ? '  ✓ 首页正常' : '  ✗ 首页有问题');

    console.log('\n2. 测试 SerpAPI 网页搜索...');
    const searchData = JSON.stringify({ query: '民法典 违约金规定', options: { num: 3 } });
    const search = await makeRequest({
      hostname: 'localhost', port: 3000, path: '/api/web/search', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(searchData) }
    }, searchData);
    if (search.status === 200 &amp;&amp; search.data &amp;&amp; search.data.results) {
      console.log('  ✓ 网页搜索正常');
      console.log('    搜索结果数量:', search.data.results.length);
      if (search.data.results.length &gt; 0) {
        console.log('    第一条结果标题:', search.data.results[0].title.substring(0, 30) + '...');
      }
    } else {
      console.log('  ✗ 网页搜索有问题');
      console.log('  响应:', JSON.stringify(search.data));
    }

    console.log('\n3. 测试 RAG 知识库搜索...');
    const ragSearchData = JSON.stringify({ query: '押金不退' });
    const ragSearch = await makeRequest({
      hostname: 'localhost', port: 3000, path: '/api/rag/search', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(ragSearchData) }
    }, ragSearchData);
    if (ragSearch.status === 200 &amp;&amp; ragSearch.data &amp;&amp; ragSearch.data.results) {
      console.log('  ✓ RAG 知识库搜索正常');
      console.log('    搜索结果数量:', ragSearch.data.results.length);
    } else {
      console.log('  ✗ RAG 知识库搜索有问题');
    }

    console.log('\n4. 测试 RAG 知识库状态...');
    const status = await makeRequest({ hostname: 'localhost', port: 3000, path: '/api/rag/status', method: 'GET' });
    if (status.status === 200 &amp;&amp; status.data) {
      console.log('  ✓ RAG 知识库状态正常');
      console.log('    文档总数:', status.data.totalDocuments);
    } else {
      console.log('  ✗ RAG 知识库状态有问题');
    }

    console.log('\n5. 测试模拟 OCR 识别...');
    const ocrData = JSON.stringify({ image: 'fake_image_data' });
    const ocr = await makeRequest({
      hostname: 'localhost', port: 3000, path: '/api/ocr', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(ocrData) }
    }, ocrData);
    if (ocr.status === 200 &amp;&amp; ocr.data &amp;&amp; ocr.data.text) {
      console.log('  ✓ OCR 识别正常（使用模拟数据）');
    } else {
      console.log('  ✗ OCR 识别有问题');
    }

    console.log('\n6. 测试合同分析...');
    const analyzeData = JSON.stringify({
      text: '甲方：张三\n乙方：李四公司\n\n一、服务内容\n乙方为甲方提供合同审查服务。\n\n二、费用\n甲方需一次性支付服务费人民币10000元。\n\n三、违约责任\n若甲方逾期支付费用，每逾期一日需支付总金额5%的违约金。\n甲方不得提前解除合同，否则需支付全额费用作为违约金。\n\n四、其他\n本合同最终解释权归乙方所有。'
    });
    const analyze = await makeRequest({
      hostname: 'localhost', port: 3000, path: '/api/analyze', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(analyzeData) }
    }, analyzeData);
    if (analyze.status === 200 &amp;&amp; analyze.data) {
      console.log('  ✓ 合同分析正常（使用模拟数据，因为需要 DeepSeek API）');
      console.log('    风险等级:', analyze.data.overall_risk);
      console.log('    风险评分:', analyze.data.risk_score);
      console.log('    发现霸王条款:', analyze.data.clauses ? analyze.data.clauses.length : 0, '条');
    } else {
      console.log('  ✗ 合同分析有问题');
    }

    console.log('\n=== 所有测试完成 ===');

  } catch (e) {
    console.error('测试出错:', e);
  }
}

testAll();
