const ApiError = require('../utils/ApiError');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  let { statusCode = 500, message } = err;

  if (!err.isOperational) {
    console.error('Unexpected error:', err);
    statusCode = 500;
    message = 'Internal server error';
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = errorHandler;
