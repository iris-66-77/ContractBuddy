const { spawn } = require('child_process');
const p = require('path');
const child = spawn('node', ['server.js'], { 
  cwd: 'C:\Users\denghaoyun\Documents\New project\yizhi-chuantou', 
  stdio: ['ignore','pipe','pipe'], 
  env: { ...process.env, PORT: '3000' },
  windowsHide: true
});
child.stdout.on('data', d => {});
child.stderr.on('data', d => {});
child.on('exit', c => process.exit(c));
setInterval(() => {}, 10000);
