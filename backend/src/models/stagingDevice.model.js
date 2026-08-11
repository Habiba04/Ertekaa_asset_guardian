const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../config/database');
const { DEVICE_TYPES } = require('./device.model');

class StagingDevice extends Model {}

StagingDevice.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    hostName: { type: DataTypes.STRING(120), allowNull: false },
    ipAddress: { type: DataTypes.STRING(255), allowNull: true },
    serialNumber: { type: DataTypes.STRING(120), allowNull: true },
    macAddress: { type: DataTypes.STRING(255), allowNull: true },
    processor: { type: DataTypes.STRING(160), allowNull: true },
    memory: { type: DataTypes.INTEGER, allowNull: true },
    diskStorageGB: { type: DataTypes.INTEGER, allowNull: true },
    installedApps: { type: DataTypes.JSONB, allowNull: true, defaultValue: [] },
    operatingSystem: { type: DataTypes.STRING(80), allowNull: true },
    manufacturer: { type: DataTypes.STRING(80), allowNull: true },
    model: { type: DataTypes.STRING(120), allowNull: true },
    deviceType: {
      type: DataTypes.ENUM(...DEVICE_TYPES),
      allowNull: false,
      defaultValue: 'PC',
    },
    // Raw JSON payload exactly as received from the PowerShell agent
    rawPayload: { type: DataTypes.JSONB, allowNull: true },
    status: {
      type: DataTypes.ENUM('PENDING_REVIEW', 'APPROVED', 'REJECTED'),
      allowNull: false,
      defaultValue: 'PENDING_REVIEW',
    },
    submittedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    reviewedBy: { type: DataTypes.STRING(160), allowNull: true },
    reviewedAt: { type: DataTypes.DATE, allowNull: true },
    // Filled in by IT admin during review before approval
    owner: { type: DataTypes.STRING(120), allowNull: true },
    department: { type: DataTypes.STRING(120), allowNull: true },
    location: { type: DataTypes.STRING(120), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    // Resulting active device once approved
    approvedDeviceId: { type: DataTypes.UUID, allowNull: true },
  },
  {
    sequelize,
    modelName: 'StagingDevice',
    tableName: 'pending_assets',
    indexes: [{ fields: ['status'] }, { fields: ['mac_address'] }],
  }
);

module.exports = StagingDevice;