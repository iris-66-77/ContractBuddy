
require('dotenv').config();

console.log('Testing module loading...');

try {
  console.log('1. Testing serpapi.js...');
  const serp = require('./serpapi');
  console.log('   ✓ serpapi loaded:', !!serp);
  console.log('   hasApiKey:', serp.hasApiKey);
} catch (e) {
  console.error('   ✗ serpapi error:', e.message, '\n', e.stack);
}

try {
  console.log('2. Testing rag/ragApi.js...');
  const rag = require('./rag/ragApi');
  console.log('   ✓ rag loaded:', !!rag);
} catch (e) {
  console.error('   ✗ rag error:', e.message, '\n', e.stack);
}

console.log('All tests complete!');
