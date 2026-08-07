const logger = require('../logger/logger');
const { sendError } = require('../utils/ApiResponse');
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = statusCode >= 500 ? 'Internal server error' : err.message;
  logger.error({ err, req }, 'Request handling failed');

  return sendError(res, statusCode, message);
}
module.exports = errorHandler;
