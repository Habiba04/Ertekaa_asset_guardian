const { Op } = require('sequelize');
const { Device, AuditLog } = require('../models');

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
  'processor', 'memory', 'operatingSystem', 'serialNumber', 'macAddress', 'location',
  'lastUser', 'owner', 'department', 'dataSource', 'lastMaintenanceDate', 'achievedBy',
  'notes', 'status',
];

async function logEvent({ deviceId, hostname, eventType, eventCategory, userSource, changeSummary, changeDetails }) {
  await AuditLog.create({
    deviceId, hostname, eventType, eventCategory, userSource, changeSummary, changeDetails,
  });
}

async function listAssets(req, res, next) {
  try {
    const { search = '', department = 'All', location = 'All', page = 1, pageSize = 200 } = req.query;

    const where = {};
    if (search) {
      where[Op.or] = [
        { hostName: { [Op.iLike]: `%${search}%` } },
        { owner: { [Op.iLike]: `%${search}%` } },
        { model: { [Op.iLike]: `%${search}%` } },
        { serialNumber: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (department && department !== 'All') where.department = department;
    if (location && location !== 'All') where.location = { [Op.iLike]: `${location}%` };

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
    // Manually-created assets always carry these two fields automatically
    payload.dataSource = payload.dataSource || 'Manual';
    if (payload.dataSource === 'Manual' && !payload.achievedBy) {
      payload.achievedBy = `${req.user.fullName} (Manual Input)`;
    }
    payload.status = payload.status || 'online';

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

async function bulkImportAssets(req, res, next) {
  try {
    const { rows = [] } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(422).json({ message: 'No rows supplied for import.' });
    }

    const created = [];
    for (const row of rows) {
      const payload = {
        oldHostName: row.oldHostName || '',
        hostName: row.hostName,
        ipAddress: row.ipAddress || '',
        deviceType: row.deviceType || 'Other',
        manufacturer: row.manufacturer || '',
        model: row.model || '',
        processor: row.processor || '',
        memory: row.memory || '',
        operatingSystem: row.operatingSystem || '',
        serialNumber: row.serialNumber,
        macAddress: row.macAddress,
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
      if (!payload.hostName || !payload.serialNumber || !payload.macAddress) continue;
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

    res.status(201).json({ message: `${created.length} asset(s) imported.`, assets: created });
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
};
