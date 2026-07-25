/* eslint-disable no-unused-vars */

function notFoundHandler(req, res, next) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  console.error('[errorHandler]', err);

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      message: 'A record with these unique values already exists.',
      details: err.errors?.map((e) => e.message) ?? [],
    });
  }

  if (err.name === 'SequelizeValidationError') {
    return res.status(422).json({
      message: 'Database validation failed.',
      details: err.errors?.map((e) => e.message) ?? [],
    });
  }

  const status = err.statusCode || 500;
  return res.status(status).json({
    message: err.message || 'Internal server error.',
  });
}

module.exports = { notFoundHandler, errorHandler };
