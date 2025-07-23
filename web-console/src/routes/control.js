const express = require('express');
const router = express.Router();
const { startContainer, stopContainer, restartContainer } = require('../utils/docker');
const { requireAuth } = require('../middlewares/auth');

const containerName = process.env.MC_CONTAINER;

// Protect all routes
router.use(requireAuth);

// POST /api/control/start
router.post('/start', async (req, res) => {
  try {
    const output = await startContainer(containerName);
    res.status(200).json({ success: true, message: output });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/control/stop
router.post('/stop', async (req, res) => {
  try {
    const output = await stopContainer(containerName);
    res.status(200).json({ success: true, message: output });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/control/restart
router.post('/restart', async (req, res) => {
  try {
    const output = await restartContainer(containerName);
    res.status(200).json({ success: true, message: output });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
