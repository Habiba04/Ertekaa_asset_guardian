const express = require('express');
const { getSetupStatus, initializeSetup } = require('../controllers/setup.controller');

const router = express.Router();

router.get('/status', getSetupStatus);
router.post('/init', initializeSetup);

module.exports = router;
