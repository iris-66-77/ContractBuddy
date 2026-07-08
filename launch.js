const { spawn } = require("child_process");
const path = require("path");

const serverPath = path.join(__dirname, "server.js");
const env = { ...process.env, PORT: process.env.PORT || "3000" };

function start() {
  const child = spawn("node", [serverPath], {
    stdio: ["ignore", "pipe", "pipe"],
    env: env,
    cwd: __dirname
  });

  child.stdout.on("data", d => process.stdout.write(d));
  child.stderr.on("data", d => process.stderr.write(d));
  
  child.on("exit", (code) => {
    console.log("Server exited (" + code + "), restarting in 1s...");
    setTimeout(start, 1000);
  });
  
  console.log("Server starting (PID: " + child.pid + ") on port " + (env.PORT || 3000));
}

start();
// Keep alive
setInterval(() => {}, 60000);