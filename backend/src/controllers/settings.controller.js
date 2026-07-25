const { Dropdown } = require('../models');

async function listDropdowns(req, res, next) {
  try {
    const departments = await Dropdown.findAll({ where: { type: 'DEPARTMENT' }, order: [['value', 'ASC']] });
    const locations = await Dropdown.findAll({ where: { type: 'LOCATION' }, order: [['value', 'ASC']] });
    res.json({
      departments: departments.map((d) => ({ id: d.id, value: d.value })),
      locations: locations.map((l) => ({ id: l.id, value: l.value })),
    });
  } catch (err) {
    next(err);
  }
}

async function addDropdownValue(req, res, next) {
  try {
    const { type } = req.params; // 'departments' | 'locations'
    const { value } = req.body;
    if (!value || !value.trim()) {
      return res.status(422).json({ message: 'A value is required.' });
    }
    const dbType = type === 'departments' ? 'DEPARTMENT' : 'LOCATION';
    const [entry, wasCreated] = await Dropdown.findOrCreate({
      where: { type: dbType, value: value.trim() },
      defaults: { type: dbType, value: value.trim() },
    });
    if (!wasCreated) {
      return res.status(409).json({ message: 'This value already exists.' });
    }
    res.status(201).json({ entry });
  } catch (err) {
    next(err);
  }
}

async function deleteDropdownValue(req, res, next) {
  try {
    const { type, id } = req.params;
    const dbType = type === 'departments' ? 'DEPARTMENT' : 'LOCATION';
    const entry = await Dropdown.findOne({ where: { id, type: dbType } });
    if (!entry) return res.status(404).json({ message: 'Value not found.' });
    await entry.destroy();
    res.json({ message: 'Value removed.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listDropdowns, addDropdownValue, deleteDropdownValue };
