/**
 * Centralized Application Error Handling & Discipline Middleware
 */
class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', fieldErrors = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.fieldErrors = fieldErrors;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
    if (statusCode < 400 || statusCode > 599) statusCode = 500;

    const requestId = req.id || req.header('x-request-id') || 'unknown-req';
    const isProduction = process.env.NODE_ENV === 'production';

    // Safe error message (avoid leaking internal DB / driver traces in 500 errors)
    let message = err.message || 'Internal Server Error';
    if (statusCode === 500 && !err.isOperational && isProduction) {
        message = 'An unexpected internal error occurred. Please contact support with the requestId.';
    }

    const errorResponse = {
        success: false,
        code: err.code || (statusCode === 404 ? 'NOT_FOUND' : statusCode === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR'),
        message: message,
        error: message, // Backward compatibility
        requestId: requestId,
        path: req.originalUrl,
        timestamp: new Date().toISOString()
    };

    if (err.fieldErrors || err.details) {
        errorResponse.fieldErrors = err.fieldErrors || err.details;
    }

    // Sanitize log: log only method, url, status, code, requestId, and sanitized message
    console.error(`[ERROR] [ReqID: ${requestId}] ${req.method} ${req.originalUrl} | Status: ${statusCode} | Code: ${errorResponse.code} | Msg: ${err.message}`);
    if (err.stack && statusCode === 500 && !isProduction) {
        console.error(`[STACK] [ReqID: ${requestId}] ${err.stack}`);
    }

    res.status(statusCode).json(errorResponse);
};

module.exports = {
    AppError,
    errorHandler
};
