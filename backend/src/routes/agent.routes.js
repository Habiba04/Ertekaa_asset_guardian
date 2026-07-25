const express = require('express');
const {
  stageDevice, listStagingQueue, getStagingCounts, approveStagedDevice, rejectStagedDevice,
} = require('../controllers/agent.controller');
const { requireAgentKey } = require('../middlewares/agentAuth.middleware');
const { requireAuth, blockReadOnly } = require('../middlewares/auth.middleware');

const router = express.Router();

// ── Called by the PowerShell agent (shared static API key) ──
router.post('/stage', requireAgentKey, stageDevice);

// ── Called by the IT admin frontend (JWT) ──
router.get('/staging', requireAuth, listStagingQueue);
router.get('/staging/counts', requireAuth, getStagingCounts);
router.post('/staging/:id/approve', requireAuth, blockReadOnly, approveStagedDevice);
router.post('/staging/:id/reject', requireAuth, blockReadOnly, rejectStagedDevice);

module.exports = router;
