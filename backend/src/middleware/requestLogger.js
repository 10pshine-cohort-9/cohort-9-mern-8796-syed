const logger = require('../logger/logger');
function requestLogger(req, res, next) {
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info({
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: duration,
    }, 'Request completed');
  });
  next();
}
module.exports = requestLogger;
