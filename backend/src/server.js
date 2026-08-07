const mongoose = require('mongoose');
const app = require('./app');
const connectDatabase = require('./config/database');
const env = require('./config/env');
const logger = require('./logger/logger');
let server;
async function startServer() {
  try {
    await connectDatabase();
    server = app.listen(env.port, () => {
      logger.info(`Server running on port ${env.port}`);
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}
function shutdown(signal) {
  return async () => {
    logger.info(`${signal} received, shutting down gracefully`);
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    logger.info('Server closed');
    process.exit(0);
  };
}
process.on('SIGTERM', shutdown('SIGTERM'));
process.on('SIGINT', shutdown('SIGINT'));
process.on('uncaughtException', (error) => {
  logger.error({ err: error }, 'Uncaught exception');
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled rejection');
  process.exit(1);
});
startServer();
