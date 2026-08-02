const { StagingDevice, Device, AuditLog } = require('../models');

/**
 * Guarantees installedApps is always persisted as a proper array of
 * {name, version} objects, regardless of what shape the agent payload
 * arrives in. PowerShell's ConvertTo-Json can serialize an empty
 * collection as `{}` instead of `[]` depending on how it was produced,
 * which would otherwise get stored as a non-array object and crash the
 * frontend (Array.prototype.map does not exist on a plain object).
 */
function normalizeInstalledApps(value) {
  if (Array.isArray(value)) {
    return value.filter((item) => item && typeof item === 'object' && item.name);
  }
  return [];
}

/**
 * POST /api/agent/stage
 * Called by tracker-agent.ps1. Authenticated via the shared static
 * agent API key (see agentAuth.middleware.js), not a user JWT.
 */
async function stageDevice(req, res, next) {
  try {
    const {
      hostName, ipAddress, serialNumber, macAddress, processor,
      memory, diskStorageGB, installedApps, operatingSystem, manufacturer, model, deviceType,
    } = req.body;

    if (!hostName || !macAddress) {
      return res.status(422).json({ message: 'hostName and macAddress are required fields from the agent payload.' });
    }

    const safeInstalledApps = normalizeInstalledApps(installedApps);

    // If this MAC already has a pending record, refresh it instead of duplicating.
    let staging = await StagingDevice.findOne({
      where: { macAddress, status: 'PENDING_REVIEW' },
    });

    if (staging) {
      Object.assign(staging, {
        hostName, ipAddress, serialNumber, processor, memory, diskStorageGB,
        installedApps: safeInstalledApps,
        operatingSystem, manufacturer, model,
        deviceType: deviceType || staging.deviceType,
        submittedAt: new Date(),
        rawPayload: req.body,
      });
      await staging.save();
    } else {
      staging = await StagingDevice.create({
        hostName, ipAddress, serialNumber, macAddress, processor, memory, diskStorageGB,
        installedApps: safeInstalledApps,
        operatingSystem, manufacturer, model,
        deviceType: deviceType || 'PC',
        rawPayload: req.body,
        status: 'PENDING_REVIEW',
      });
    }

    await AuditLog.create({
      deviceId: null,
      hostname: hostName,
      eventType: 'Agent Sync',
      eventCategory: 'checkin',
      userSource: 'Guardian Agent',
      changeSummary: `Telemetry received and staged for review (MAC ${macAddress}).`,
    });

    res.status(202).json({ message: 'Telemetry staged for admin review.', stagingId: staging.id });
  } catch (err) {
    next(err);
  }
}

async function listStagingQueue(req, res, next) {
  try {
    const { status = 'PENDING_REVIEW' } = req.query;
    const where = status === 'ALL' ? {} : { status };
    const queue = await StagingDevice.findAll({ where, order: [['submittedAt', 'DESC']] });
    res.json({ queue });
  } catch (err) {
    next(err);
  }
}

async function getStagingCounts(req, res, next) {
  try {
    const [pending, approved, rejected] = await Promise.all([
      StagingDevice.count({ where: { status: 'PENDING_REVIEW' } }),
      StagingDevice.count({ where: { status: 'APPROVED' } }),
      StagingDevice.count({ where: { status: 'REJECTED' } }),
    ]);
    res.json({ enrolled: approved, pending, failed: rejected });
  } catch (err) {
    next(err);
  }
}

/**
 * IT admin approves a staged agent submission, filling in the manual
 * administrative fields, and it is committed to the active Device table.
 */
async function approveStagedDevice(req, res, next) {
  try {
    const staging = await StagingDevice.findByPk(req.params.id);
    if (!staging) return res.status(404).json({ message: 'Staged device not found.' });
    if (staging.status !== 'PENDING_REVIEW') {
      return res.status(409).json({ message: `This record has already been ${staging.status.toLowerCase()}.` });
    }

    const { owner, department, location, notes } = req.body;
    if (!owner || !department || !location) {
      return res.status(422).json({ message: 'owner, department, and location are required to approve a device.' });
    }

    const device = await Device.create({
      hostName: staging.hostName,
      ipAddress: staging.ipAddress,
      deviceType: staging.deviceType,
      manufacturer: staging.manufacturer,
      model: staging.model,
      processor: staging.processor,
      memory: staging.memory,
      diskStorageGB: staging.diskStorageGB,
      installedApps: normalizeInstalledApps(staging.installedApps),
      operatingSystem: staging.operatingSystem,
      serialNumber: staging.serialNumber || `PENDING-${staging.id.slice(0, 8)}`,
      macAddress: staging.macAddress,
      location,
      owner,
      lastUser: owner,
      department,
      dataSource: 'Agent',
      notes: notes || '',
      status: 'online',
      lastSeen: new Date(),
    });

    staging.status = 'APPROVED';
    staging.reviewedBy = req.user.fullName;
    staging.reviewedAt = new Date();
    staging.owner = owner;
    staging.department = department;
    staging.location = location;
    staging.notes = notes || '';
    staging.approvedDeviceId = device.id;
    await staging.save();

    await AuditLog.create({
      deviceId: device.id,
      hostname: device.hostName,
      eventType: 'Approved',
      eventCategory: 'approved',
      userSource: req.user.fullName,
      changeSummary: `Agent-submitted device approved and committed to active inventory by ${req.user.fullName}.`,
    });

    res.status(201).json({ device, staging });
  } catch (err) {
    next(err);
  }
}

async function rejectStagedDevice(req, res, next) {
  try {
    const staging = await StagingDevice.findByPk(req.params.id);
    if (!staging) return res.status(404).json({ message: 'Staged device not found.' });

    staging.status = 'REJECTED';
    staging.reviewedBy = req.user.fullName;
    staging.reviewedAt = new Date();
    await staging.save();

    await AuditLog.create({
      deviceId: null,
      hostname: staging.hostName,
      eventType: 'Rejected',
      eventCategory: 'deleted',
      userSource: req.user.fullName,
      changeSummary: `Staged device submission rejected by ${req.user.fullName}.`,
    });

    res.json({ message: 'Staged device rejected.', staging });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  stageDevice,
  listStagingQueue,
  getStagingCounts,
  approveStagedDevice,
  rejectStagedDevice,
};