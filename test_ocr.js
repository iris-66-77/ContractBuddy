
const http = require('http');

// 测试OCR功能
console.log('=== 测试OCR功能 ===\n');

// 创建一个简单的测试图片（简单的base64编码的1x1像素图片）
const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const postData = JSON.stringify({
    image: testImage
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/ocr',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
    }
};

console.log('正在调用 /api/ocr ...');
console.log('请求URL:', 'http://localhost:3000/api/ocr');
console.log('请求数据长度:', Buffer.byteLength(postData), 'bytes\n');

const req = http.request(options, (res) => {
    console.log('响应状态码:', res.statusCode);
    console.log('响应头:', res.headers);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('\n响应内容:');
        try {
            const json = JSON.parse(data);
            console.log(JSON.stringify(json, null, 2));

            if (json.text) {
                console.log('\n✅ OCR成功! 识别到的文本:');
                console.log(json.text);
            } else if (json.error) {
                console.log('\n❌ OCR失败:', json.error);
            } else {
                console.log('\n⚠️ 响应格式异常');
            }
        } catch (e) {
            console.log('无法解析JSON响应:', data);
        }
    });
});

req.on('error', (e) => {
    console.error('请求失败:', e.message);
});

req.write(postData);
req.end();

