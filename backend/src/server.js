require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { testConnection } = require('../config/database');
const { syncDatabase } = require('./models');
const apiRouter = require('./routes');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler.middleware');
const { updateOfflineDevices } = require('../src/controllers/asset.controller');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(
  cors({
    origin: [
      process.env.CLIENT_ORIGIN,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://10.20.1.19:5173',
    ].filter(Boolean),
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'asset-guardian-backend', timestamp: new Date().toISOString() });
});

// Serve the PowerShell agent + installer as direct downloads for the
// Settings > Agent Deployment Hub screen.
app.use('/downloads', express.static(path.join(__dirname, '..', '..', 'agent')));

app.use('/api', apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

setInterval(() => {
  updateOfflineDevices();
}, 5 * 60 * 1000);

async function start() {
  try {
    await testConnection();
    await syncDatabase();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[server] Asset Guardian API listening on http://0.0.0.0:${PORT}`);
    });
  } catch (err) {
    console.error('[server] Failed to start:', err);
    process.exit(1);
  }
}

start();

module.exports = app;
