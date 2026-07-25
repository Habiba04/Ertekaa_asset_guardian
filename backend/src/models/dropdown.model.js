const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../../config/database');

class Dropdown extends Model {}

Dropdown.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    type: {
      type: DataTypes.ENUM('DEPARTMENT', 'LOCATION'),
      allowNull: false,
    },
    value: {
      type: DataTypes.STRING(120),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Dropdown',
    tableName: 'dropdown_values',
    indexes: [{ unique: true, fields: ['type', 'value'] }],
  }
);

module.exports = Dropdown;
