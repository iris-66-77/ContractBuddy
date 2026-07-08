const ngrok = require('ngrok');

async function startNgrok() {
  try {
    console.log('正在启动ngrok...');
    const url = await ngrok.connect({
      proto: 'http',
      addr: 3000,
      host_header: 'localhost:3000',
      bind_tls: true,
    });
    
    console.log('');
    console.log('🚀 公网访问地址已获取！');
    console.log('');
    console.log('📱 公网访问链接（任何网络都可以访问）：');
    console.log(`   ${url}`);
    console.log('');
    console.log('💡 说明：');
    console.log('   - 此链接可以在任何WiFi/移动网络下访问');
    console.log('   - 免费版ngrok可能会有速率限制');
    console.log('   - 重新启动ngrok后链接会变化');
    console.log('');
    console.log('按 Ctrl+C 停止ngrok');
    
  } catch (error) {
    console.error('ngrok启动失败:', error);
    process.exit(1);
  }
}

startNgrok();
