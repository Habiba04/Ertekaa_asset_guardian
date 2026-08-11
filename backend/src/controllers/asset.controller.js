const { Op } = require('sequelize');
const ping = require('ping');
const { exec } = require('child_process');
const os = require('os');
const { Device, AuditLog } = require('../models');
const { DEVICE_TYPES } = require('../models/device.model');

const MAC_ADDRESS_REGEX = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/;

function diffFields(before, after, fields) {
  const changes = [];
  fields.forEach((f) => {
    const b = before?.[f] ?? '';
    const a = after?.[f] ?? '';
    if (String(b) !== String(a)) changes.push({ field: f, from: b, to: a });
  });
  return changes;
}

const TRACKED_FIELDS = [
  'hostName', 'oldHostName', 'ipAddress', 'deviceType', 'manufacturer', 'model',
  'processor', 'memory', 'diskStorageGB', 'operatingSystem', 'serialNumber', 'macAddress', 'location',
  'lastUser', 'owner', 'department', 'dataSource', 'lastMaintenanceDate', 'achievedBy',
  'notes', 'status',
];

async function logEvent({ deviceId, hostname, eventType, eventCategory, userSource, changeSummary, changeDetails }) {
  await AuditLog.create({
    deviceId, hostname, eventType, eventCategory, userSource, changeSummary, changeDetails,
  });
}

/**
 * Slugifies a free-text dropdown value (location/department) into a short,
 * hostname-safe fragment: strips anything that isn't a letter/number,
 * uppercases it. e.g. "HQ · Floor 1" -> "HQFLOOR1"
 */
function slugify(value) {
  return String(value || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

/**
 * Generates a hostname for manually-added or hostname-less imported
 * assets, following the pattern: {location}{department}-{deviceType}{id}
 * The sequential id is per location+department+deviceType combination.
 */
async function generateHostname(location, department, deviceType) {
  const locationSlug = slugify(location) || 'LOC';
  const departmentSlug = slugify(department) || 'DEPT';
  const typeSlug = slugify(deviceType) || 'DEVICE';

  const existingCount = await Device.count({ where: { location, department, deviceType } });
  const nextId = String(existingCount + 1).padStart(3, '0');

  return `${locationSlug}${departmentSlug}-${typeSlug}${nextId}`;
}

// Clean invisible Unicode directional characters and trim whitespace
function sanitizeString(str) {
  if (!str) return '';
  return String(str)
    .replace(/[\u202A-\u202E\u200E\u200F\uFEFF]/g, '') // Strips hidden LTR/RTL Unicode marks
    .trim();
}

/**
 * Cleans and standardizes MAC addresses:
 * 1. Takes the FIRST MAC if multiple are comma-separated.
 * 2. Removes hidden Unicode characters.
 * 3. Standardizes separators (converts dashes/dots to colons).
 * 4. Converts to uppercase.
 */
/**
 * Cleans and standardizes one or multiple comma-separated MAC addresses.
 * e.g. "00:15:5D:07:AD:DD, C0:E4:34:DF:36:7B"
 */
function cleanMacAddress(rawMac) {
  let macStr = sanitizeString(rawMac);
  if (!macStr) return null;

  // Split by comma if multiple are present, clean each one individually
  const macs = macStr
    .split(',')
    .map((item) => {
      let m = sanitizeString(item);
      m = m.replace(/[-.]/g, ':').toUpperCase();
      return m;
    })
    .filter(Boolean);

  return macs.join(', ') || null;
}

function validateMacAddress(macStr) {
  if (!macStr) return true; // optional
  
  // Validate every comma-separated MAC address in the string
  const macs = macStr.split(',').map((s) => s.trim()).filter(Boolean);
  return macs.every((mac) => MAC_ADDRESS_REGEX.test(mac));
}

/**
 * A hostname is considered "unusable" (and gets auto-generated instead)
 * if it's blank, or if it's an Excel formula-error artifact like
 * "#NAME?", "#REF!", "#VALUE!" etc. — these show up in real spreadsheets
 * when a formula breaks, and are not real hostnames.
 */
function isUsableHostname(value) {
  if (!value || !String(value).trim()) return false;
  if (/^#[A-Z/]+[!?]?$/.test(String(value).trim())) return false; // #NAME?, #REF!, #DIV/0! etc.
  return true;
}

// Maps the abbreviation codes used in the real-world import spreadsheet
// to the app's Device Type values. Anything not recognized here falls
// back to "Other" rather than failing the import — easy to correct
// afterward from the Inventory table.
const DEVICE_TYPE_CODE_MAP = {
  lt: 'Laptop',
  dt: 'PC',
  pc: 'PC',
  pr: 'Printer',
  prn: 'Printer',
  sr: 'Server',
  srv: 'Server',
  sw: 'Switch',
  rt: 'Router',
  rtr: 'Router',
  fw: 'Firewall',
  ap: 'Access Point',
  dvr: 'DVR',
  fp: 'Fingerprint Scanner',
  screen: 'Screen',
  other: 'Other',
};

function normalizeDeviceType(rawValue) {
  const trimmed = String(rawValue || '').trim();
  if (!trimmed) return 'Other';

  // If it's already an exact, valid Device Type value, keep it as-is.
  const exactMatch = DEVICE_TYPES.find((t) => t.toLowerCase() === trimmed.toLowerCase());
  if (exactMatch) return exactMatch;

  const mapped = DEVICE_TYPE_CODE_MAP[trimmed.toLowerCase()];
  return mapped || 'Other';
}

async function listAssets(req, res, next) {
  try {
    const {
      search = '', department = 'All', location = 'All', deviceType = 'All', page = 1, pageSize = 200,
    } = req.query;

    const where = {};
    if (search) {
      where[Op.or] = [
        { hostName: { [Op.iLike]: `%${search}%` } },
        { oldHostName: { [Op.iLike]: `%${search}%` } },
        { owner: { [Op.iLike]: `%${search}%` } },
        { lastUser: { [Op.iLike]: `%${search}%` } },
        { model: { [Op.iLike]: `%${search}%` } },
        { manufacturer: { [Op.iLike]: `%${search}%` } },
        { serialNumber: { [Op.iLike]: `%${search}%` } },
        { macAddress: { [Op.iLike]: `%${search}%` } },
        { ipAddress: { [Op.iLike]: `%${search}%` } },
        { operatingSystem: { [Op.iLike]: `%${search}%` } },
        { processor: { [Op.iLike]: `%${search}%` } },
        { location: { [Op.iLike]: `%${search}%` } },
        { department: { [Op.iLike]: `%${search}%` } },
        { notes: { [Op.iLike]: `%${search}%` } },
        { achievedBy: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (department && department !== 'All') where.department = department;
    if (location && location !== 'All') where.location = { [Op.iLike]: `${location}%` };
    if (deviceType && deviceType !== 'All') where.deviceType = deviceType;

    const offset = (Number(page) - 1) * Number(pageSize);
    const { rows, count } = await Device.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: Number(pageSize),
      offset,
    });

    res.json({ assets: rows, total: count, page: Number(page), pageSize: Number(pageSize) });
  } catch (err) {
    next(err);
  }
}

async function getAsset(req, res, next) {
  try {
    const asset = await Device.findByPk(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Asset not found.' });
    res.json({ asset });
  } catch (err) {
    next(err);
  }
}

async function getAssetActivity(req, res, next) {
  try {
    const logs = await AuditLog.findAll({
      where: { deviceId: req.params.id },
      order: [['timestamp', 'DESC']],
    });
    res.json({ activity: logs });
  } catch (err) {
    next(err);
  }
}

async function createAsset(req, res, next) {
  try {
    const payload = { ...req.body };

    if (payload.macAddress && !validateMacAddress(payload.macAddress)) {
      return res.status(422).json({ message: 'MAC address must follow the format AA:BB:CC:DD:EE:FF.' });
    }

    payload.dataSource = payload.dataSource || 'Manual';
    if (payload.dataSource === 'Manual' && !payload.achievedBy) {
      payload.achievedBy = `${req.user.fullName} (Manual Input)`;
    }
    payload.status = payload.status || 'online';

    if (payload.dataSource === 'Manual') {
      payload.hostName = await generateHostname(payload.location, payload.department, payload.deviceType);
    }

    // MAC/IP are optional — normalize blank strings to null so the
    // unique constraint on macAddress never sees duplicate empty
    // strings across multiple devices that simply have none on record.
    if (!payload.macAddress) payload.macAddress = null;
    if (!payload.ipAddress) payload.ipAddress = null;

    const asset = await Device.create(payload);

    await logEvent({
      deviceId: asset.id,
      hostname: asset.hostName,
      eventType: 'Created',
      eventCategory: 'created',
      userSource: req.user.fullName,
      changeSummary: `Device enrolled manually by ${req.user.fullName}.`,
    });

    res.status(201).json({ asset });
  } catch (err) {
    next(err);
  }
}

async function updateAsset(req, res, next) {
  try {
    const asset = await Device.findByPk(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Asset not found.' });

    if (req.body.macAddress && !validateMacAddress(req.body.macAddress)) {
      return res.status(422).json({ message: 'MAC address must follow the format AA:BB:CC:DD:EE:FF.' });
    }
    if (req.body.macAddress === '') req.body.macAddress = null;
    if (req.body.ipAddress === '') req.body.ipAddress = null;

    const before = asset.toJSON();
    Object.assign(asset, req.body);
    await asset.save();

    const changes = diffFields(before, asset.toJSON(), TRACKED_FIELDS);
    if (changes.length > 0) {
      const summary = changes.map((c) => `${c.field}: "${c.from || '—'}" → "${c.to || '—'}"`).join('; ');
      await logEvent({
        deviceId: asset.id,
        hostname: asset.hostName,
        eventType: 'Updated',
        eventCategory: 'updated',
        userSource: req.user.fullName,
        changeSummary: summary,
        changeDetails: changes,
      });
    }

    res.json({ asset });
  } catch (err) {
    next(err);
  }
}

async function deleteAsset(req, res, next) {
  try {
    const asset = await Device.findByPk(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Asset not found.' });

    await logEvent({
      deviceId: asset.id,
      hostname: asset.hostName,
      eventType: 'Deleted',
      eventCategory: 'deleted',
      userSource: req.user.fullName,
      changeSummary: `Device removed from inventory by ${req.user.fullName}.`,
    });

    await asset.destroy();
    res.json({ message: 'Asset removed.' });
  } catch (err) {
    next(err);
  }
}

async function bulkDeleteAssets(req, res, next) {
  try {
    const { ids = [] } = req.body;
    const assets = await Device.findAll({ where: { id: ids } });
    await Promise.all(
      assets.map((asset) =>
        logEvent({
          deviceId: asset.id,
          hostname: asset.hostName,
          eventType: 'Deleted',
          eventCategory: 'deleted',
          userSource: req.user.fullName,
          changeSummary: `Device removed from inventory (bulk action) by ${req.user.fullName}.`,
        })
      )
    );
    await Device.destroy({ where: { id: ids } });
    res.json({ message: `${ids.length} asset(s) removed.` });
  } catch (err) {
    next(err);
  }
}

async function syncAssets(req, res, next) {
  try {
    const { ids = [] } = req.body;
    const targets = ids.length > 0
      ? await Device.findAll({ where: { id: ids } })
      : await Device.findAll({ where: { dataSource: 'Agent' } });

    await Promise.all(
      targets.map(async (asset) => {
        asset.lastSeen = new Date();
        await asset.save();
        await logEvent({
          deviceId: asset.id,
          hostname: asset.hostName,
          eventType: 'Agent Sync',
          eventCategory: 'checkin',
          userSource: 'Guardian Agent (on-demand)',
          changeSummary: 'On-demand sync triggered by IT admin — hardware inventory refreshed.',
        });
      })
    );

    res.json({ message: `Sync triggered for ${targets.length} device(s).`, syncedCount: targets.length });
  } catch (err) {
    next(err);
  }
}

/**
 * Bulk CSV/Excel import. Required fields: Device Type, Serial Number,
 * Location, Department — everything else (including Host Name and MAC
 * Address) is optional to match real-world spreadsheets where those
 * columns are frequently blank or corrupted (e.g. "#NAME?" formula
 * errors). A missing/unusable hostname is auto-generated the same way
 * as manually-added assets. De-duplicates against existing inventory by
 * Serial Number OR MAC Address (only when a MAC is actually present —
 * never matches on a blank MAC, which would incorrectly collide
 * every MAC-less row against each other).
 */
async function bulkImportAssets(req, res, next) {
  try {
    const { rows = [] } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(422).json({ message: 'No rows supplied for import.' });
    }

    const created = [];
    const updated = [];
    const skipped = [];

    for (const row of rows) {
  const serialNumber = sanitizeString(row.serialNumber);
  const location = sanitizeString(row.location);
  const department = sanitizeString(row.department);
  const deviceType = normalizeDeviceType(row.deviceType);
  
  // Clean and sanitize the MAC address
  const macAddress = cleanMacAddress(row.macAddress);

  if (!serialNumber || !location || !department) {
    skipped.push({ row, reason: 'Missing required field (Serial Number, Location, or Department).' });
    continue;
  }

  // Validate cleaned MAC
  if (macAddress && !validateMacAddress(macAddress)) {
    skipped.push({ row, reason: `Invalid MAC address format: "${row.macAddress}".` });
    continue;
  }

  let hostName = sanitizeString(row.hostName);
  if (!isUsableHostname(hostName)) {
    hostName = await generateHostname(location, department, deviceType);
  }

  const payload = {
    oldHostName: sanitizeString(row.oldHostName) || '',
    hostName,
    ipAddress: sanitizeString(row.ipAddress) || null,
    deviceType,
    manufacturer: sanitizeString(row.manufacturer) || '',
    model: sanitizeString(row.model) || '',
    processor: sanitizeString(row.processor) || '',
    memory: row.memory ? parseInt(row.memory, 10) || null : null,
    diskStorageGB: row.diskStorageGB ? parseInt(row.diskStorageGB, 10) || null : null,
    operatingSystem: sanitizeString(row.operatingSystem) || '',
    serialNumber,
    macAddress: macAddress || null,
    location,
    lastUser: sanitizeString(row.lastUser) || '',
    owner: sanitizeString(row.owner) || '',
    department,
    dataSource: 'CSV Import',
    achievedBy: sanitizeString(row.achievedBy) || `${req.user.fullName} (CSV Import)`,
    lastMaintenanceDate: row.lastMaintenanceDate || null,
    notes: sanitizeString(row.notes) || '',
    status: 'online',
  };

      // Only match on MAC address when one was actually provided — a
      // blank MAC must never be used to match rows against each other.
      const matchConditions = [{ serialNumber }];
      if (macAddress) matchConditions.push({ macAddress });

      // Each row's actual database write is isolated in its own
      // try/catch. Without this, a single row hitting a DB-level
      // constraint (column-length overflow, a duplicate unique value
      // slipping past the pre-checks, etc.) would throw all the way up
      // and abort the ENTIRE batch — silently discarding the outcome
      // of every other row already processed, with no useful feedback
      // beyond a generic 500 error.
      try {
        const existing = await Device.findOne({
          where: { [Op.or]: matchConditions },
        });

        if (existing) {
          Object.assign(existing, payload);
          await existing.save();
          await logEvent({
            deviceId: existing.id,
            hostname: existing.hostName,
            eventType: 'Updated',
            eventCategory: 'updated',
            userSource: `${req.user.fullName} (CSV Import)`,
            changeSummary: 'Existing device updated via bulk CSV/Excel import (matched by serial number or MAC address).',
          });
          updated.push(existing);
        } else {
          const asset = await Device.create(payload);
          await logEvent({
            deviceId: asset.id,
            hostname: asset.hostName,
            eventType: 'Created',
            eventCategory: 'created',
            userSource: `${req.user.fullName} (CSV Import)`,
            changeSummary: 'Device enrolled via bulk CSV/Excel import.',
          });
          created.push(asset);
        }
      } catch (rowError) {
        const reason = rowError.name === 'SequelizeUniqueConstraintError'
          ? `Duplicate value conflicts with another record: ${rowError.errors?.map((e) => e.message).join(', ') || rowError.message}`
          : rowError.name === 'SequelizeDatabaseError'
            ? `Database rejected this row: ${rowError.original?.message || rowError.message}`
            : `Failed to save this row: ${rowError.message}`;
        skipped.push({ row, reason });
      }
    }

    res.status(201).json({
      message: `${created.length} created, ${updated.length} updated, ${skipped.length} skipped.`,
      assets: [...created, ...updated],
      created: created.length,
      updated: updated.length,
      skipped,
    });
  } catch (err) {
    next(err);
  }
}

async function pingAsset(req, res, next) {
  try {
    const asset = await Device.findByPk(req.params.id);
    if (!asset) return res.status(404).json({ message: 'Asset not found.' });
    if (!asset.ipAddress) {
      return res.status(422).json({ message: 'This device has no IP address on record.' });
    }

    const isWindows = os.platform() === 'win32';
    const countFlag = isWindows ? '-n' : '-c';
    const timeoutFlag = isWindows ? '-w 2000' : '-W 2';
    const command = `ping ${countFlag} 1 ${timeoutFlag} ${asset.ipAddress}`;

    exec(command, { timeout: 5000 }, (error, stdout, stderr) => {
      const reachable = !error;
      let latencyMs = null;
      const latencyMatch = stdout && stdout.match(/time[=<]([\d.]+)\s*ms/i);
      if (latencyMatch) latencyMs = parseFloat(latencyMatch[1]);

      res.json({
        reachable,
        latencyMs,
        ipAddress: asset.ipAddress,
        checkedAt: new Date().toISOString(),
        _debugCommand: command,
        _debugError: error ? error.message : null,
        _debugStdout: stdout,
        _debugStderr: stderr,
      });
    });
  } catch (err) {
    next(err);
  }
}
/**
 * Sweeps the database for active devices whose lastSeen timestamp
 * is older than 30 minutes and updates their status to 'remote' / 'offline'.
 */
async function updateOfflineDevices() {
  try {
    const TIMEOUT_MINUTES = 30;
    const thresholdDate = new Date(Date.now() - TIMEOUT_MINUTES * 60 * 1000);

    const [updatedCount] = await Device.update(
      { status: 'remote' }, // or 'offline' depending on your ENUM
      {
        where: {
          status: 'online',
          lastSeen: {
            [Op.lt]: thresholdDate, // lastSeen < 30 minutes ago
          },
        },
      }
    );

    if (updatedCount > 0) {
      console.log(`[Status Monitor] Marked ${updatedCount} inactive device(s) as remote/offline.`);
    }
  } catch (err) {
    console.error('[Status Monitor Error]:', err);
  }
}

async function pingAgentlessDevices() {
  try {
    // Find all non-agent devices with an IP address
    const agentlessDevices = await Device.findAll({
      where: {
        dataSource: { [Op.ne]: 'Agent' }, // 'Manual' or 'CSV Import'
        ipAddress: { [Op.and]: [{ [Op.ne]: null }, { [Op.ne]: '' }] },
      },
    });

    for (const device of agentlessDevices) {
      // Perform ICMP ping with a 2-second timeout
      const res = await ping.promise.probe(device.ipAddress, {
        timeout: 2,
        extra: ['-c', '1'], // Send 1 packet
      });

      const newStatus = res.alive ? 'online' : 'remote'; // or 'offline'[cite: 3]

      // Only update and save if the status actually changed
      if (device.status !== newStatus) {
        device.status = newStatus;
        if (res.alive) {
          device.lastSeen = new Date();
        }
        await device.save();
        console.log(`[Ping Check] Device ${device.hostName} (${device.ipAddress}) is now ${newStatus}`);
      }
    }
  } catch (err) {
    console.error('[Ping Check Error]:', err);
  }
}


module.exports = {
  listAssets,
  getAsset,
  getAssetActivity,
  createAsset,
  updateAsset,
  deleteAsset,
  bulkDeleteAssets,
  syncAssets,
  bulkImportAssets,
  pingAsset,
  generateHostname,
  validateMacAddress,
  normalizeDeviceType,
  updateOfflineDevices,
  pingAgentlessDevices,
};