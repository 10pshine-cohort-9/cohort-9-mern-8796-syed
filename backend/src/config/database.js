const mongoose = require('mongoose');
const logger = require('../logger/logger');
const env = require('./env');
async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return;
  }
  try {
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info('MongoDB connected successfully');
  } catch (error) {
    logger.error({ err: error }, 'MongoDB connection failed');
    throw error;
  }
}
module.exports = connectDatabase;
