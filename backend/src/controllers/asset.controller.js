const { Op } = require('sequelize');
const { exec } = require('child_process');
const os = require('os');
const { Device, AuditLog } = require('../models');

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
 * Generates a hostname for manually-added assets following the pattern:
 * {location}{department}-{deviceType}{sequentialId}
 * The sequential id is per location+department+deviceType combination so
 * numbering stays predictable and short (e.g. HQFLOOR1ENGINEERING-LAPTOP001).
 */
async function generateHostname(location, department, deviceType) {
  const locationSlug = slugify(location) || 'LOC';
  const departmentSlug = slugify(department) || 'DEPT';
  const typeSlug = slugify(deviceType) || 'DEVICE';

  const existingCount = await Device.count({ where: { location, department, deviceType } });
  const nextId = String(existingCount + 1).padStart(3, '0');

  return `${locationSlug}${departmentSlug}-${typeSlug}${nextId}`;
}

function validateMacAddress(mac) {
  if (!mac) return true; // optional in some flows (e.g. partial CSV rows are rejected elsewhere)
  return MAC_ADDRESS_REGEX.test(mac);
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

    // Manually-created assets always carry these fields automatically
    payload.dataSource = payload.dataSource || 'Manual';
    if (payload.dataSource === 'Manual' && !payload.achievedBy) {
      payload.achievedBy = `${req.user.fullName} (Manual Input)`;
    }
    payload.status = payload.status || 'online';

    // Hostname for manually-added assets is always system-generated from
    // Location + Department + Device Type, never freely typed by the user.
    if (payload.dataSource === 'Manual') {
      payload.hostName = await generateHostname(payload.location, payload.department, payload.deviceType);
    }

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

/**
 * On-demand agent polling. In production this would push a wake/poll
 * signal to the target machines (e.g. via a message queue the installed
 * agent listens on). Here we simulate the round trip, refresh lastSeen,
 * and log an Agent Sync event for each targeted device.
 */
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
 * Bulk CSV/Excel import. De-duplicates against existing inventory by
 * serial number OR MAC address: if a match is found the existing record
 * is updated in place (and logged as an Update), otherwise a new device
 * is created (and logged as a Create). This means re-importing the same
 * spreadsheet — or a spreadsheet that was originally exported from this
 * system and then edited — will NOT create duplicate rows.
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
      const hostName = row.hostName;
      const serialNumber = row.serialNumber;
      const macAddress = row.macAddress;

      if (!hostName || !serialNumber || !macAddress) {
        skipped.push({ row, reason: 'Missing required field (Host Name, Serial Number, or MAC Address).' });
        continue;
      }
      if (!validateMacAddress(macAddress)) {
        skipped.push({ row, reason: `Invalid MAC address format: "${macAddress}".` });
        continue;
      }

      const payload = {
        oldHostName: row.oldHostName || '',
        hostName,
        ipAddress: row.ipAddress || '',
        deviceType: row.deviceType || 'Other',
        manufacturer: row.manufacturer || '',
        model: row.model || '',
        processor: row.processor || '',
        memory: row.memory ? parseInt(row.memory, 10) || null : null,
        diskStorageGB: row.diskStorageGB ? parseInt(row.diskStorageGB, 10) || null : null,
        operatingSystem: row.operatingSystem || '',
        serialNumber,
        macAddress,
        location: row.location || '',
        lastUser: row.lastUser || '',
        owner: row.owner || '',
        department: row.department || '',
        dataSource: 'CSV Import',
        achievedBy: `${req.user.fullName} (CSV Import)`,
        lastMaintenanceDate: row.lastMaintenanceDate || null,
        notes: row.notes || '',
        status: 'online',
      };

      const existing = await Device.findOne({
        where: { [Op.or]: [{ serialNumber }, { macAddress }] },
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

/**
 * Pings a device by IP address (works for ANY data source — Manual, CSV,
 * or Agent — as long as the record has an IP set). Uses the host OS's
 * native ping utility rather than a network library, so it works
 * without additional dependencies. Cross-platform flag handling: -n on
 * Windows, -c on macOS/Linux.
 */
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
};