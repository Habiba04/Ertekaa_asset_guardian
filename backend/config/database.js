require('dotenv').config();
const { Sequelize } = require('sequelize');

const {
  DB_HOST = 'localhost',
  DB_PORT = '5432',
  DB_NAME = 'asset_guardian',
  DB_USER = 'postgres',
  DB_PASSWORD = '',
  DB_SSL = 'false',
  NODE_ENV = 'development',
} = process.env;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: Number(DB_PORT),
  dialect: 'postgres',
  logging: NODE_ENV === 'development' ? console.log : false,
  dialectOptions:
    DB_SSL === 'true'
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        }
      : {},
  define: {
    underscored: true,
    timestamps: true,
  },
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('[database] PostgreSQL connection established successfully.');
  } catch (error) {
    console.error('[database] Unable to connect to PostgreSQL:', error.message);
    throw error;
  }
};

module.exports = { sequelize, testConnection };
