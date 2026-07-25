const express = require('express');

const setupRoutes = require('./setup.routes');
const authRoutes = require('./auth.routes');
const assetRoutes = require('./asset.routes');
const agentRoutes = require('./agent.routes');
const auditRoutes = require('./audit.routes');
const settingsRoutes = require('./settings.routes');

const router = express.Router();

router.use('/setup', setupRoutes);
router.use('/auth', authRoutes);
router.use('/assets', assetRoutes);
router.use('/agent', agentRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/settings', settingsRoutes);

module.exports = router;
