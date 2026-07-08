
const http = require('http');

console.log('=== Testing Project ===');

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
    console.log('\n1. Testing homepage...');
    const index = await makeRequest({ hostname: 'localhost', port: 3000, path: '/', method: 'GET' });
    console.log(index.status === 200 ? '  OK - Homepage works' : '  ERROR - Homepage failed');

    console.log('\n2. Testing OCR API...');
    const ocrData = JSON.stringify({ image: 'fake' });
    const ocr = await makeRequest({
      hostname: 'localhost', port: 3000, path: '/api/ocr', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(ocrData) }
    }, ocrData);
    if (ocr.status === 200 &amp;&amp; ocr.data &amp;&amp; ocr.data.text) {
      console.log('  OK - OCR works');
    } else {
      console.log('  ERROR - OCR failed');
    }

    console.log('\n3. Testing analyze API...');
    const analyzeData = JSON.stringify({
      text: '甲方：张三 乙方：李四公司 甲方不得提前解除合同，否则需支付全额费用作为违约金。本合同最终解释权归乙方所有。'
    });
    const analyze = await makeRequest({
      hostname: 'localhost', port: 3000, path: '/api/analyze', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(analyzeData) }
    }, analyzeData);
    if (analyze.status === 200 &amp;&amp; analyze.data) {
      console.log('  OK - Analyze works');
      console.log('    Risk level:', analyze.data.overall_risk);
      console.log('    Risk score:', analyze.data.risk_score);
    } else {
      console.log('  ERROR - Analyze failed');
    }

    console.log('\n=== All tests done! ===');

  } catch (e) {
    console.error('Test error:', e);
  }
}

testAll();
