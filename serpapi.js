
const axios = require('axios');

const SERPAPI_KEY = process.env.SERPAPI_KEY || '';
const SERPAPI_BASE_URL = 'https://serpapi.com/search';

async function searchWeb(query, options = {}) {
  if (!SERPAPI_KEY) {
    throw new Error('请先配置 SERPAPI_KEY 环境变量');
  }

  const params = {
    api_key: SERPAPI_KEY,
    q: query,
    engine: options.engine || 'google',
    hl: options.hl || 'zh-CN',
    gl: options.gl || 'cn',
    num: options.num || 10
  };

  try {
    const response = await axios.get(SERPAPI_BASE_URL, { params });
    return formatResults(response.data);
  } catch (error) {
    console.error('SerpAPI 调用失败:', error.message);
    throw new Error('搜索失败: ' + error.message);
  }
}

function formatResults(data) {
  const results = (data.organic_results || []).map(function(item, index) {
    return {
      title: item.title || '',
      link: item.link || '',
      snippet: item.snippet || '',
      position: index + 1
    };
  });

  return {
    query: data.search_parameters ? data.search_parameters.q : '',
    results: results,
    totalResults: data.search_information ? data.search_information.total_results : 0,
    searchTime: data.search_information ? data.search_information.time_taken_displayed : 0
  };
}

async function searchLegalInfo(legalQuery) {
  return searchWeb(legalQuery, {
    hl: 'zh-CN', gl: 'cn', num: 5 });
}

module.exports = {
  searchWeb: searchWeb,
  searchLegalInfo: searchLegalInfo,
  hasApiKey: !!SERPAPI_KEY
};
