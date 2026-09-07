const crypto = require('crypto');

/**
 * Middleware that assigns a unique UUID Request ID to each incoming HTTP request
 * and sets the X-Request-ID response header for end-to-end distributed tracing.
 */
module.exports = (req, res, next) => {
    const requestId = req.header('x-request-id') || crypto.randomUUID();
    req.id = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
};
