const logger = require('../utils/logger');

module.exports = (err, req, res, next) => {
    logger.error(err.stack);

    const statusCode = err.statusCode || 500;
    const response = {
        error: {
            message: err.message || 'Internal Server Error',
            code: err.code || 'INTERNAL_ERROR',
            metadata: err.metadata || {}
        }
    };

    // Include stack trace in non-production environments
    if (process.env.NODE_ENV !== 'production') {
        response.error.details = err.stack;
    }

    res.status(statusCode).json(response);
};