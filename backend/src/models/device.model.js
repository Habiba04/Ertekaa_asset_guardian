const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../config/database');

class Device extends Model {}

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
    // 3. IP Address
    ipAddress: { type: DataTypes.STRING(45), allowNull: true },
    // 4. Device Type
    deviceType: {
      type: DataTypes.ENUM('Laptop', 'PC', 'Switch', 'Server', 'Printer', 'Router', 'Other'),
      allowNull: false,
      defaultValue: 'Laptop',
    },
    // 5. Manufacturer
    manufacturer: { type: DataTypes.STRING(80), allowNull: true, defaultValue: '' },
    // 6. Model
    model: { type: DataTypes.STRING(120), allowNull: true, defaultValue: '' },
    // 7. Processor
    processor: { type: DataTypes.STRING(160), allowNull: true, defaultValue: '' },
    // 8. Memory (RAM)
    memory: { type: DataTypes.STRING(60), allowNull: true, defaultValue: '' },
    // 9. Operating System
    operatingSystem: { type: DataTypes.STRING(80), allowNull: true, defaultValue: '' },
    // 10. Serial Number
    serialNumber: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    // 11. MAC Address
    macAddress: { type: DataTypes.STRING(60), allowNull: false, unique: true },
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
