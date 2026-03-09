const config = require('../config');

module.exports = function requireApiKey(req, res, next) {
  if (!config.apiKey) return next();

  const key = req.headers['x-api-key'] || req.query.apiKey;
  if (!key || key !== config.apiKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};
