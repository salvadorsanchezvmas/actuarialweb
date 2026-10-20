const { HttpError } = require('../utils/http');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[+()\d\s-]{7,20}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Minimal schema validator, no extra dependency.
 * schema = { field: { type: 'string'|'email'|'phone'|'date'|'boolean'|'enum', required, max, min, values } }
 * Unknown fields are dropped; strings are trimmed. Result goes to req.body.
 */
function validate(schema) {
  return (req, res, next) => {
    const input = req.body || {};
    const out = {};
    const errors = [];

    for (const [field, rule] of Object.entries(schema)) {
      let value = input[field];
      if (typeof value === 'string') value = value.trim();
      const empty = value === undefined || value === null || value === '';

      if (empty) {
        if (rule.required) errors.push({ field, message: 'This field is required.' });
        else out[field] = rule.type === 'boolean' ? false : null;
        continue;
      }

      switch (rule.type) {
        case 'boolean':
          value = value === true || value === 'true' || value === 'on' || value === 1;
          if (rule.required && !value) errors.push({ field, message: 'This field must be accepted.' });
          break;
        case 'email':
          value = String(value).toLowerCase();
          if (!EMAIL_RE.test(value)) errors.push({ field, message: 'Please enter a valid email address.' });
          break;
        case 'phone':
          if (!PHONE_RE.test(String(value))) errors.push({ field, message: 'Please enter a valid phone number.' });
          break;
        case 'date':
          if (!DATE_RE.test(String(value)) || isNaN(Date.parse(value))) errors.push({ field, message: 'Please enter a valid date.' });
          break;
        case 'enum':
          if (!rule.values.includes(value)) errors.push({ field, message: 'Invalid option.' });
          break;
        default:
          value = String(value);
      }
      if (typeof value === 'string') {
        if (rule.max && value.length > rule.max) errors.push({ field, message: `Maximum ${rule.max} characters.` });
        if (rule.min && value.length < rule.min) errors.push({ field, message: `Minimum ${rule.min} characters.` });
      }
      out[field] = value;
    }

    if (errors.length) return next(new HttpError(422, 'Please review the highlighted fields.', errors));
    req.body = out;
    next();
  };
}

module.exports = { validate };
