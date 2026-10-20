const env = require('../config/env');

function notFound(req, res) {
  res.status(404).json({ message: 'Endpoint not found.' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  if (status >= 500) console.error(`[api] ${req.method} ${req.originalUrl}`, err);
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON body.' });
  res.status(status).json({
    message: status >= 500 && env.isProd ? 'Internal server error.' : err.message,
    ...(err.errors ? { errors: err.errors } : {}),
  });
}

module.exports = { notFound, errorHandler };
