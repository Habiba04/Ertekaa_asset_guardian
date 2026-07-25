const { sequelize } = require('../../config/database');
const User = require('./user.model');
const Device = require('./device.model');
const StagingDevice = require('./stagingDevice.model');
const AuditLog = require('./auditLog.model');
const Dropdown = require('./dropdown.model');
const SystemSetting = require('./systemSetting.model');

// ── Associations ──────────────────────────────────────────
Device.hasMany(AuditLog, { foreignKey: 'deviceId', as: 'activityLogs' });
AuditLog.belongsTo(Device, { foreignKey: 'deviceId', as: 'device' });

const DEFAULT_DEPARTMENTS = ['Engineering', 'Marketing', 'Finance', 'Operations', 'HR', 'Legal', 'IT'];
const DEFAULT_LOCATIONS = [
  'HQ · Floor 1',
  'HQ · Floor 2',
  'HQ · Floor 3',
  'Remote · WFH',
  'Remote · Client Site',
];

async function seedDropdownDefaults() {
  const count = await Dropdown.count();
  if (count > 0) return;
  const rows = [
    ...DEFAULT_DEPARTMENTS.map((value) => ({ type: 'DEPARTMENT', value })),
    ...DEFAULT_LOCATIONS.map((value) => ({ type: 'LOCATION', value })),
  ];
  await Dropdown.bulkCreate(rows);
  console.log('[models] Seeded default department/location dropdown values.');
}

async function syncDatabase() {
  await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
  await seedDropdownDefaults();
  console.log('[models] Database synced.');
}

module.exports = {
  sequelize,
  User,
  Device,
  StagingDevice,
  AuditLog,
  Dropdown,
  SystemSetting,
  syncDatabase,
};
