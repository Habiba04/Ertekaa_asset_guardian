const express = require('express');
const { listDropdowns, addDropdownValue, deleteDropdownValue } = require('../controllers/settings.controller');
const { requireAuth, blockReadOnly } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(requireAuth);

router.get('/dropdowns', listDropdowns);
router.post('/dropdowns/:type', blockReadOnly, addDropdownValue); // type: departments | locations
router.delete('/dropdowns/:type/:id', blockReadOnly, deleteDropdownValue);

module.exports = router;
