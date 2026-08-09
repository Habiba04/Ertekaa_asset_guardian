const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, AuditLog } = require('../models');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  });
}

async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(422).json({ message: 'Username and password are required.' });
    }

    const user = await User.findOne({
      where: { username },
    });

    if (!user || !user.isActive) {
      await AuditLog.create({
        deviceId: null,
        hostname: username,
        eventType: 'Login Failed',
        eventCategory: 'alert',
        userSource: username,
        changeSummary: `Failed login attempt for username "${username}" (account not found or inactive).`,
      });
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      await AuditLog.create({
        deviceId: null,
        hostname: user.username,
        eventType: 'Login Failed',
        eventCategory: 'alert',
        userSource: user.fullName,
        changeSummary: `Failed login attempt for ${user.fullName} (incorrect password).`,
      });
      return res.status(401).json({ message: 'Invalid credentials.' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    await AuditLog.create({
      deviceId: null,
      hostname: user.username,
      eventType: 'Login',
      eventCategory: 'checkin',
      userSource: user.fullName,
      changeSummary: `${user.fullName} signed in to Asset Guardian.`,
    });

    const token = signToken(user);
    res.json({ token, user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

async function me(req, res) {
  res.json({ user: req.user });
}

async function listAdmins(req, res, next) {
  try {
    const admins = await User.findAll({ order: [['createdAt', 'ASC']] });
    res.json({ admins: admins.map((a) => a.toSafeJSON()) });
  } catch (err) {
    next(err);
  }
}

async function createAdmin(req, res, next) {
  try {
    const { fullName, email, username, password, role } = req.body;
    if (!fullName || !email || !username || !password) {
      return res.status(422).json({ message: 'Full name, email, username and password are all required.' });
    }
    if (/\s/.test(username)) {
      return res.status(422).json({ message: 'Username cannot contain spaces.' });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(422).json({ message: 'Please enter a valid email address (e.g. name@company.com).' });
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
      role: role || 'IT_ADMIN',
      isActive: true,
      // isRoot is never settable via this endpoint — only the Setup
      // Wizard's very first account can ever be root.
    });
    res.status(201).json({ admin: admin.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

async function updateAdminRole(req, res, next) {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const admin = await User.findByPk(id);
    if (!admin) return res.status(404).json({ message: 'Administrator not found.' });

    if (admin.isRoot) {
      return res.status(403).json({ message: 'The root administrator account\'s role cannot be changed.' });
    }

    const previousRole = admin.role;
    admin.role = role;
    await admin.save();

    if (previousRole !== role) {
      await AuditLog.create({
        deviceId: null,
        hostname: admin.username,
        eventType: 'Role Changed',
        eventCategory: 'updated',
        userSource: req.user.fullName,
        changeSummary: `${admin.fullName}'s role changed from "${previousRole}" to "${role}" by ${req.user.fullName}.`,
      });
    }

    res.json({ admin: admin.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

async function revokeAdmin(req, res, next) {
  try {
    const { id } = req.params;
    const admin = await User.findByPk(id);
    if (!admin) return res.status(404).json({ message: 'Administrator not found.' });

    if (admin.isRoot) {
      return res.status(403).json({ message: 'The root administrator account cannot be deleted.' });
    }

    const total = await User.count();
    if (total <= 1) {
      return res.status(400).json({ message: 'Cannot remove the last remaining administrator.' });
    }
    if (admin.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot revoke your own access.' });
    }
    await admin.destroy();
    res.json({ message: 'Administrator access revoked.' });
  } catch (err) {
    next(err);
  }
}

async function changeMyPassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(422).json({ message: 'currentPassword and newPassword are both required.' });
    }
    if (newPassword.length < 8) {
      return res.status(422).json({ message: 'New password must be at least 8 characters long.' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const currentMatches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!currentMatches) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
}

async function resetAdminPassword(req, res, next) {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(422).json({ message: 'A new password of at least 8 characters is required.' });
    }

    const admin = await User.findByPk(id);
    if (!admin) return res.status(404).json({ message: 'Administrator not found.' });

    if (admin.isRoot) {
      return res.status(403).json({ message: 'Only the root administrator can reset their own password. Use Change Password while signed in as that account.' });
    }

    admin.passwordHash = await bcrypt.hash(newPassword, 12);
    await admin.save();

    res.json({ message: `Password reset for ${admin.fullName}.` });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login, me, listAdmins, createAdmin, updateAdminRole, revokeAdmin, changeMyPassword, resetAdminPassword,
};
