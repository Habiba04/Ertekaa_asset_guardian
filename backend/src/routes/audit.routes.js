const express = require('express');
const { listAuditLogs } = require('../controllers/audit.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', requireAuth, listAuditLogs);

module.exports = router;
