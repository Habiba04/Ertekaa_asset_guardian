const { validationResult } = require('express-validator');

/**
 * Runs after an array of express-validator chains; short-circuits
 * with a 422 if any validation errors were collected.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      message: 'Validation failed.',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  return next();
}

module.exports = { validate };
