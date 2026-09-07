const config = require('../config/config');

const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
};

const currentLevel = LOG_LEVELS[config.logging.level] !== undefined ? LOG_LEVELS[config.logging.level] : LOG_LEVELS.info;

/**
 * Anonymizes coordinates for privacy preservation in audit logs.
 * Example: 28.613938 -> 28.61** (neighborhood level only, ~1.1km fuzz)
 */
function anonymizeCoordinate(coord) {
    if (coord === null || coord === undefined || isNaN(coord)) return 'N/A';
    const num = Number(coord);
    return `${num.toFixed(2)}**`;
}

function formatLog(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const sanitizedMeta = { ...meta };

    // Anonymize sensitive coordinates if present in log metadata
    if (sanitizedMeta.origin) {
        sanitizedMeta.origin = {
            lat: anonymizeCoordinate(sanitizedMeta.origin.latitude),
            lng: anonymizeCoordinate(sanitizedMeta.origin.longitude)
        };
    }
    if (sanitizedMeta.destination) {
        sanitizedMeta.destination = {
            lat: anonymizeCoordinate(sanitizedMeta.destination.latitude),
            lng: anonymizeCoordinate(sanitizedMeta.destination.longitude)
        };
    }

    return JSON.stringify({
        timestamp,
        level: level.toUpperCase(),
        service: 'facility-routing-engine',
        message,
        ...sanitizedMeta
    });
}

const logger = {
    debug(message, meta) {
        if (currentLevel <= LOG_LEVELS.debug) {
            console.debug(formatLog('debug', message, meta));
        }
    },
    info(message, meta) {
        if (currentLevel <= LOG_LEVELS.info) {
            console.log(formatLog('info', message, meta));
        }
    },
    warn(message, meta) {
        if (currentLevel <= LOG_LEVELS.warn) {
            console.warn(formatLog('warn', message, meta));
        }
    },
    error(message, meta) {
        if (currentLevel <= LOG_LEVELS.error) {
            console.error(formatLog('error', message, meta));
        }
    }
};

module.exports = logger;
