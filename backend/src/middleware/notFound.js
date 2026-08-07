const ApiError = require('../utils/ApiError');
function notFound(req, res, next) {
  next(new ApiError('Route not found', 404));
}
module.exports = notFound;
