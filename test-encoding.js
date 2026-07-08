var fs = require('fs');
var path = require('path');

function containsGarbledText(text) {
  if (!text) return false;
  var invalidPatterns = [
    /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,
    /([^\u4e00-\u9fff\u0020-\u007e\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff65-\uff9f]){5,}/g,
    /(SETI|BXJIS|ARDUOR|SERR|RIE|PEARKNERER|RELSNEEINE|MNREH|RARXRZNTRAEE|BY2potie)/gi
  ];
  for (var i = 0; i < invalidPatterns.length; i++) {
    if (invalidPatterns[i].test(text)) {
      return true;
    }
  }
  var charCount = text.length;
  var validChineseCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  var validAsciiCount = (text.match(/[\u0020-\u007e]/g) || []).length;
  var validCount = validChineseCount + validAsciiCount;
  return validCount / charCount < 0.6;
}

function filterGarbledText(text) {
  if (!text) return text;
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  text = text.replace(/(SETI|BXJIS|ARDUOR|SERR|RIE|PEARKNERER|RELSNEEINE|MNREH|RARXRZNTRAEE|BY2potie|HHXXK)/gi, '');
  text = text.replace(/([^\u4e00-\u9fff\u0020-\u007e\u3000-\u303f]){3,}/g, '');
  text = text.replace(/\s{3,}/g, ' ');
  text = text.replace(/[^\u4e00-\u9fff\u0020-\u007e\u3000-\u303f\n\r]/g, '');
  return text.trim();
}

function validateTextQuality(text) {
  if (!text || text.length < 10) {
    return { valid: false, reason: '文本过短' };
  }
  var validChineseCount = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  var validAsciiCount = (text.match(/[\u0020-\u007e]/g) || []).length;
  var totalValid = validChineseCount + validAsciiCount;
  var quality = totalValid / text.length;
  if (quality < 0.6) {
    return { valid: false, reason: '文本质量过低，可能包含大量乱码', quality: quality };
  }
  var lineCount = text.split('\n').filter(function(line) { return line.trim().length > 0; }).length;
  if (lineCount < 2 && validChineseCount < 20) {
    return { valid: false, reason: '有效内容不足' };
  }
  return { valid: true, quality: quality, chineseCount: validChineseCount };
}

var testCases = [
  {
    name: '正常中文文本',
    text: '甲方：张三\n乙方：李四公司\n\n一、服务内容\n乙方为甲方提供合同审查服务，服务期限为一年。'
  },
  {
    name: '包含乱码的文本',
    text: '十三、乙万不得私私下权宜，如需转框在必有通知中万站地\nSETIHXIBXJIS ARDUOR SERR 5R,则甲方有权收回房屋，并扣除所有押金'
  },
  {
    name: '严重乱码文本',
    text: 'RIE (PEARKNERER) | (FEARRNERTEETEEE) RELSNEEINE, £F%. 8E.\nBY2potie, WERE_ MNREH—R, RARXRZNTRAEE'
  },
  {
    name: 'OCR识别质量差的文本',
    text: '第 九 条 协议 变更 与 解除\n开 二 协 义 在 尾行 过 程 中 国 上 因 甲 方 汪 荔 调整 或 乙方 个 人 情况 变化 等 原因'
  },
  {
    name: '混合乱码文本',
    text: '甲方有权在任何时候，无需提前通知或说明理由，即可单方面解除合同。\nSETI BXJIS ARDUOR SERR\n乙方应当按照合同约定支付费用。'
  }
];

console.log('=== 乱码检测与过滤功能测试 ===\n');

testCases.forEach(function(testCase, index) {
  console.log('[' + (index + 1) + '] ' + testCase.name);
  console.log('原始文本长度:', testCase.text.length);
  
  var hasGarbled = containsGarbledText(testCase.text);
  console.log('检测到乱码:', hasGarbled ? '是' : '否');
  
  var filteredText = filterGarbledText(testCase.text);
  console.log('过滤后长度:', filteredText.length);
  
  var quality = validateTextQuality(filteredText);
  console.log('文本质量:', quality.valid ? '合格' : '不合格');
  if (!quality.valid) {
    console.log('质量问题:', quality.reason);
  }
  
  console.log('过滤后文本预览:', filteredText.substring(0, 100) + (filteredText.length > 100 ? '...' : ''));
  console.log('');
});

console.log('=== 测试完成 ===');
