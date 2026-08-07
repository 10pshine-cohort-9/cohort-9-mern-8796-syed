const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const routes = require('./routes');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Notes App API is running',
  });
});
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);
module.exports = app;
