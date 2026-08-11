const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, SystemSetting } = require('../models');

const SETUP_COMPLETE_KEY = 'setup_complete';

async function getSetupStatus(req, res, next) {
  try {
    const userCount = await User.count();
    const flag = await SystemSetting.findByPk(SETUP_COMPLETE_KEY);
    res.json({
      isSetupComplete: userCount > 0 || flag?.value === 'true',
      adminCount: userCount,
    });
  } catch (err) {
    next(err);
  }
}

async function initializeSetup(req, res, next) {
  try {
    const userCount = await User.count();
    if (userCount > 0) {
      return res.status(409).json({ message: 'Setup has already been completed.' });
    }

    const { fullName, email, username, password } = req.body;
    if (!fullName || !email || !username || !password) {
      return res.status(422).json({ message: 'fullName, email, username, and password are all required.' });
    }
    if (/\s/.test(username)) {
      return res.status(422).json({ message: 'Username cannot contain spaces.' });
    }
    if (password.length < 8) {
      return res.status(422).json({ message: 'Password must be at least 8 characters long.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await User.create({
      fullName,
      email,
      username,
      passwordHash,
      role: 'SUPER_ADMIN',
      // The account created here, during first-launch setup, is the
      // permanent protected root account: it can never be deleted or
      // have its role changed, and only this account holder can ever
      // reset its own password.
      isRoot: true,
      mfaEnabled: false,
      isActive: true,
    });

    await SystemSetting.upsert({ key: SETUP_COMPLETE_KEY, value: 'true' });

    const token = jwt.sign({ sub: admin.id, role: admin.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });

    res.status(201).json({ token, user: admin.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

module.exports = { getSetupStatus, initializeSetup };
