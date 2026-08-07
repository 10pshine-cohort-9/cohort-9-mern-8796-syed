function sendSuccess(res, statusCode, message, data = null) {
  const payload = {
    success: true,
    message,
  };
  if (data !== null) {
    payload.data = data;
  }
  return res.status(statusCode).json(payload);
}
function sendError(res, statusCode, message) {
  return res.status(statusCode).json({
    success: false,
    message,
  });
}
module.exports = {
  sendSuccess,
  sendError,
};
