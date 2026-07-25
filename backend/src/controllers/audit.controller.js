const { Op } = require('sequelize');
const { AuditLog } = require('../models');

async function listAuditLogs(req, res, next) {
  try {
    const { search = '', category = 'All', dateFrom, dateTo, page = 1, pageSize = 100 } = req.query;

    const where = {};
    if (search) {
      where[Op.or] = [
        { hostname: { [Op.iLike]: `%${search}%` } },
        { userSource: { [Op.iLike]: `%${search}%` } },
        { eventType: { [Op.iLike]: `%${search}%` } },
        { changeSummary: { [Op.iLike]: `%${search}%` } },
      ];
    }
    if (category && category !== 'All') where.eventCategory = category;
    if (dateFrom || dateTo) {
      where.timestamp = {};
      if (dateFrom) where.timestamp[Op.gte] = new Date(dateFrom);
      if (dateTo) where.timestamp[Op.lte] = new Date(`${dateTo}T23:59:59.999Z`);
    }

    const offset = (Number(page) - 1) * Number(pageSize);
    const { rows, count } = await AuditLog.findAndCountAll({
      where,
      order: [['timestamp', 'DESC']],
      limit: Number(pageSize),
      offset,
    });

    const categoryCounts = {};
    const categories = ['All', 'alert', 'created', 'updated', 'checkin', 'deleted', 'approved'];
    for (const cat of categories) {
      categoryCounts[cat] = cat === 'All'
        ? await AuditLog.count()
        : await AuditLog.count({ where: { eventCategory: cat } });
    }

    res.json({ logs: rows, total: count, page: Number(page), pageSize: Number(pageSize), categoryCounts });
  } catch (err) {
    next(err);
  }
}

module.exports = { listAuditLogs };
