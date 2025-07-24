// src/utils/logs.js

const { spawn } = require('child_process');

const containerName = process.env.MC_CONTAINER;

/**
 * Attaches to a container's log stream and forwards it to a socket.
 * @param {object} socket - The Socket.IO socket instance for a connected client.
 */
const streamLogs = (socket) => {
  // Ensure the target container name is set in the environment variables.
  if (!containerName) {
    socket.emit('log', 'Error: MC_CONTAINER environment variable is not set.');
    return;
  }

  // Use 'spawn' for long-running processes. 'docker logs -f' follows the log output.
  // We also grab the last 50 lines (--tail 50) to provide immediate context.
  const logStream = spawn('docker', ['logs', '-f', '--tail', '50', containerName]);

  socket.emit('log', `--- Attempting to stream logs from ${containerName} ---`);

  // Handle standard output from the command.
  logStream.stdout.on('data', (data) => {
    // The data is a Buffer, so convert it to a string and send it to the client.
    socket.emit('log', data.toString().trim());
  });

  // Handle standard error output from the command.
  logStream.stderr.on('data', (data) => {
    // Send error output to the client, prefixed for clarity.
    socket.emit('log', `[STDERR] ${data.toString().trim()}`);
  });

  // Handle the command process closing.
  logStream.on('close', (code) => {
    console.log(`Log stream process exited with code ${code}`);
    socket.emit('log', `--- Log stream for ${containerName} has ended ---`);
  });

  // Handle errors in spawning the process itself.
  logStream.on('error', (err) => {
    console.error(`Failed to start log stream: ${err.message}`);
    socket.emit('log', `--- ERROR: Could not start log stream. Is Docker running? ---`);
  });

  // When the client disconnects, we must kill the child process to prevent it from running forever.
  socket.on('disconnect', () => {
    console.log('Client disconnected, killing log stream process.');
    logStream.kill();
  });
};

module.exports = { streamLogs };