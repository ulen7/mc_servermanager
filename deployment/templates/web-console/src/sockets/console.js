const { spawn } = require('child_process');

module.exports = function (socket) {
  const containerName = process.env.MC_CONTAINER;
  if (!containerName) {
    socket.emit('log', '[Server] MC_CONTAINER not set.');
    return;
  }

  const logStream = spawn('docker', ['logs', '-f', containerName]);

  logStream.stdout.on('data', data => {
    socket.emit('log', data.toString());
  });

  logStream.stderr.on('data', data => {
    socket.emit('log', `[ERROR] ${data.toString()}`);
  });

  logStream.on('close', code => {
    socket.emit('log', `[Server] Log stream closed (code ${code})`);
  });

  socket.on('disconnect', () => {
    logStream.kill();
  });
};
