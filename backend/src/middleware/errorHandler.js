const errorHandler = (err, req, res, next) => {
  console.error('[Error Handler]', err);

  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error occurred',
    // Never expose stack trace in production or to client
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {})
  });
};

const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`
  });
};

module.exports = { errorHandler, notFound };
