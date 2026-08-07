const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/ApiResponse');
const getHealthStatus = asyncHandler(async (req, res) => {
  return sendSuccess(res, 200, 'Server is healthy', {
    status: 'ok',
    uptime: process.uptime(),
  });
});
module.exports = { getHealthStatus };
