const express = require('express');
const {
  listAssets, getAsset, pingAsset, getAssetActivity, createAsset, updateAsset,
  deleteAsset, bulkDeleteAssets, syncAssets, bulkImportAssets,
} = require('../controllers/asset.controller');
const { requireAuth, blockReadOnly } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(requireAuth);

router.get('/', listAssets);
router.get('/:id', getAsset);
router.get('/:id/activity', getAssetActivity);

router.post('/', blockReadOnly, createAsset);
router.post('/import', blockReadOnly, bulkImportAssets);
router.post('/sync', blockReadOnly, syncAssets);
router.post('/bulk-delete', blockReadOnly, bulkDeleteAssets);

router.patch('/:id', blockReadOnly, updateAsset);
router.delete('/:id', blockReadOnly, deleteAsset);

router.get('/:id/ping', pingAsset);

module.exports = router;
