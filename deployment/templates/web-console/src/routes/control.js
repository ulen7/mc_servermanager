// src/routes/control.js

const express = require('express');
const router = express.Router();
const { startContainer, stopContainer, restartContainer } = require('../utils/docker');

/**
 * A helper function to create a standard route handler for control actions.
 * @param {function} action - The container action to perform (e.g., startContainer).
 * @param {object} res - The Express response object.
 */
const handleContainerAction = async (action, res) => {
  try {
    // Await the result from the docker utility function.
    const result = await action();
    // If successful, send a JSON response indicating success.
    res.json({ success: true, message: `Container action successful: ${result}` });
  } catch (error) {
    // If an error occurs, log it on the server for debugging.
    console.error(`Container action failed:`, error);
    // Send a 500 Internal Server Error status with a JSON object containing the error message.
    res.status(500).json({ success: false, error: error.message });
  }
};

// --- Define API Routes ---

// @route   POST /api/control/start
// @desc    Starts the configured Docker container
// @access  Private (protected by requireAuth middleware in app.js)
router.post('/start', (req, res) => {
  handleContainerAction(startContainer, res);
});

// @route   POST /api/control/stop
// @desc    Stops the configured Docker container
// @access  Private
router.post('/stop', (req, res) => {
  handleContainerAction(stopContainer, res);
});

// @route   POST /api/control/restart
// @desc    Restarts the configured Docker container
// @access  Private
router.post('/restart', (req, res) => {
  handleContainerAction(restartContainer, res);
});

module.exports = router;
