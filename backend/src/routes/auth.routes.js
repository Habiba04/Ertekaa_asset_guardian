const express = require('express');
const {
  login, me, listAdmins, createAdmin, updateAdminRole, revokeAdmin, changeMyPassword, resetAdminPassword,
} = require('../controllers/auth.controller');
const { requireAuth, requireRole, blockReadOnly } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/login', login);
router.get('/me', requireAuth, me);
router.patch('/me/password', requireAuth, changeMyPassword);

router.get('/admins', requireAuth, requireRole('SUPER_ADMIN', 'IT_ADMIN'), listAdmins);
router.post('/admins', requireAuth, requireRole('SUPER_ADMIN'), blockReadOnly, createAdmin);
router.patch('/admins/:id/role', requireAuth, requireRole('SUPER_ADMIN'), blockReadOnly, updateAdminRole);
router.patch('/admins/:id/password', requireAuth, requireRole('SUPER_ADMIN'), blockReadOnly, resetAdminPassword);
router.delete('/admins/:id', requireAuth, requireRole('SUPER_ADMIN'), blockReadOnly, revokeAdmin);

module.exports = router;
