/**
 * Centralized Application Error Handling Middleware
 */
class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
    if (statusCode < 400 || statusCode > 599) statusCode = 500;

    const errorResponse = {
        success: false,
        error: err.message || 'Internal Server Error',
        code: err.code || 'INTERNAL_ERROR',
        path: req.originalUrl,
        timestamp: new Date().toISOString()
    };

    if (err.details) {
        errorResponse.details = err.details;
    }

    if (process.env.NODE_ENV === 'development' && !err.isOperational) {
        errorResponse.stack = err.stack;
    }

    console.error(`[ERROR] [${req.method} ${req.originalUrl}] ${statusCode} - ${err.message}`);
    if (err.stack && statusCode === 500) {
        console.error(err.stack);
    }

    res.status(statusCode).json(errorResponse);
};

module.exports = {
    AppError,
    errorHandler
};
