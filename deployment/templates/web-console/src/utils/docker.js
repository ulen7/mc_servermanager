// src/utils/docker.js

// Import the 'exec' function from Node's built-in child_process module.
// This allows us to run shell commands from our Node.js application.
const { exec } = require('child_process');

// Retrieve the name of the target container from environment variables.
// This makes the container name configurable without changing the code.
const containerName = process.env.MC_CONTAINER;

/**
 * A helper function to execute a Docker command.
 * It wraps the callback-based `exec` function in a Promise for easier use with async/await.
 * @param {string} command - The full shell command to execute.
 * @returns {Promise<string>} A promise that resolves with the command's stdout on success,
 * or rejects with an error on failure.
 */
const executeDockerCommand = (command) => {
  return new Promise((resolve, reject) => {
    // Check if the target container name is defined in the environment variables.
    if (!containerName) {
      const errorMessage = 'Error: MC_CONTAINER environment variable is not set.';
      console.error(errorMessage);
      // Reject the promise if the container name is missing.
      return reject(new Error(errorMessage));
    }

    console.log(`Executing command: ${command}`);
    exec(command, (error, stdout, stderr) => {
      // The 'exec' callback provides three arguments: error, stdout, and stderr.

      if (error) {
        // If the 'error' object exists, it means the command failed to execute.
        console.error(`Exec error: ${error.message}`);
        // Reject the promise with the error.
        return reject(error);
      }

      if (stderr) {
        // Stderr can contain warnings or other non-critical error messages.
        // For some Docker commands, stderr might be used for progress, but here we treat it as a potential issue.
        console.warn(`Stderr: ${stderr}`);
      }

      // If the command executes successfully, resolve the promise with the standard output.
      // For commands like start/stop/restart, stdout usually just confirms the action by printing the container name.
      resolve(stdout.trim());
    });
  });
};

/**
 * Starts the specified Docker container.
 * @returns {Promise<string>} A promise that resolves with the container name on success.
 */
const startContainer = () => {
  const command = `docker start ${containerName}`;
  return executeDockerCommand(command);
};

/**
 * Stops the specified Docker container.
 * @returns {Promise<string>} A promise that resolves with the container name on success.
 */
const stopContainer = () => {
  const command = `docker stop ${containerName}`;
  return executeDockerCommand(command);
};

/**
 * Restarts the specified Docker container.
 * @returns {Promise<string>} A promise that resolves with the container name on success.
 */
const restartContainer = () => {
  const command = `docker restart ${containerName}`;
  return executeDockerCommand(command);
};

// Export the functions to be used in other parts of the application (e.g., your future control.js route).
module.exports = {
  startContainer,
  stopContainer,
  restartContainer,
};
