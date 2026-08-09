const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../config/database');

class Device extends Model {}

// Expanded beyond the original 7 categories to match the real device
// types tracked in the office inventory (fingerprint scanners, access
// points, firewalls, DVRs, screens, etc.), based on the abbreviation
// codes actually used in the imported spreadsheet.
const DEVICE_TYPES = [
  'Laptop', 'PC', 'Switch', 'Server', 'Printer', 'Router', 'Other',
  'Firewall', 'Access Point', 'DVR', 'Fingerprint Scanner', 'Screen',
];

Device.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    // 1. Old Host Name / Old Name
    oldHostName: { type: DataTypes.STRING(120), allowNull: true, defaultValue: '' },
    // 2. Name / Host Name
    hostName: { type: DataTypes.STRING(120), allowNull: false },
    // 3. IP Address — optional: many assets (switches behind NAT, older
    // printers, non-networked hardware) never get a usable IP on record.
    ipAddress: { type: DataTypes.STRING(45), allowNull: true },
    // 4. Device Type
    deviceType: {
      type: DataTypes.ENUM(...DEVICE_TYPES),
      allowNull: false,
      defaultValue: 'Laptop',
    },
    // 5. Manufacturer
    manufacturer: { type: DataTypes.STRING(80), allowNull: true, defaultValue: '' },
    // 6. Model
    model: { type: DataTypes.STRING(120), allowNull: true, defaultValue: '' },
    // 7. Processor
    processor: { type: DataTypes.STRING(160), allowNull: true, defaultValue: '' },
    // 8. Memory (RAM) — stored as a plain integer, always GB
    memory: { type: DataTypes.INTEGER, allowNull: true },
    // Disk / storage capacity — plain integer, always GB
    diskStorageGB: { type: DataTypes.INTEGER, allowNull: true },
    // 9. Operating System
    operatingSystem: { type: DataTypes.STRING(80), allowNull: true, defaultValue: '' },
    // 10. Serial Number
    serialNumber: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    // 11. MAC Address — optional: not every asset type has one (a screen,
    // a UPS, some printers) and manual entries shouldn't be blocked by it.
    // Postgres allows multiple NULLs under a UNIQUE constraint (NULLs are
    // never considered equal to each other), so this stays safe even with
    // many devices that have no MAC on record.
    macAddress: { type: DataTypes.STRING(60), allowNull: true, unique: true },
    // 12. Location
    location: { type: DataTypes.STRING(120), allowNull: true, defaultValue: '' },
    // 13. Last User
    lastUser: { type: DataTypes.STRING(120), allowNull: true, defaultValue: '' },
    // 14. Owner (Current)
    owner: { type: DataTypes.STRING(120), allowNull: true, defaultValue: '' },
    // 15. Description / Department
    department: { type: DataTypes.STRING(120), allowNull: true, defaultValue: '' },
    // 16. Data Source
    dataSource: {
      type: DataTypes.ENUM('Agent', 'Manual', 'CSV Import'),
      allowNull: false,
      defaultValue: 'Manual',
    },
    // 17. Last Maintenance Date
    lastMaintenanceDate: { type: DataTypes.DATEONLY, allowNull: true },
    // 18. Achieved By (visible/populated when Data Source is NOT Agent)
    achievedBy: { type: DataTypes.STRING(160), allowNull: true, defaultValue: '' },
    // 19. Notes
    notes: { type: DataTypes.TEXT, allowNull: true, defaultValue: '' },
    // Non-preinstalled applications collected by the Guardian Agent
    installedApps: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },

    // Operational / derived fields
    status: {
      type: DataTypes.ENUM('online', 'remote', 'unregistered'),
      allowNull: false,
      defaultValue: 'online',
    },
    lastSeen: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'Device',
    tableName: 'devices',
    indexes: [
      { fields: ['host_name'] },
      { fields: ['department'] },
      { fields: ['location'] },
      { fields: ['status'] },
    ],
  }
);

module.exports = Device;
module.exports.DEVICE_TYPES = DEVICE_TYPES;
