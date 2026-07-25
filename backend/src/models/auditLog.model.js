const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../config/database');

class AuditLog extends Model {}

AuditLog.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    deviceId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    hostname: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
    eventType: {
      type: DataTypes.STRING(60),
      allowNull: false, // e.g. Created, Updated, Agent Sync, Approved, Deleted, Alert
    },
    eventCategory: {
      type: DataTypes.ENUM('created', 'updated', 'checkin', 'alert', 'deleted', 'approved'),
      allowNull: false,
      defaultValue: 'updated',
    },
    userSource: {
      type: DataTypes.STRING(160),
      allowNull: false, // e.g. "J. Martinez", "Guardian Agent v2.1", "Network Scan", "System"
    },
    changeSummary: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    changeDetails: {
      type: DataTypes.JSONB,
      allowNull: true, // structured before/after diff, if applicable
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    indexes: [
      { fields: ['device_id'] },
      { fields: ['event_category'] },
      { fields: ['timestamp'] },
    ],
  }
);

module.exports = AuditLog;
