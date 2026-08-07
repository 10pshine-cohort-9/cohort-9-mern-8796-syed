const dotenv = require('dotenv');
dotenv.config();
const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/notes-app',
  logLevel: process.env.LOG_LEVEL || 'info',
};
module.exports = env;
