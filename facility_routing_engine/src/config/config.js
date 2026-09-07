/**
 * Configuration manager for Facility Routing Engine.
 * Loads environment variables with robust fallback defaults.
 */

const config = {
    osrm: {
        baseUrl: (process.env.OSRM_BASE_URL || 'https://router.project-osrm.org').replace(/\/+$/, ''),
        timeoutMs: parseInt(process.env.OSRM_TIMEOUT_MS || '6000', 10),
        maxRetries: parseInt(process.env.OSRM_MAX_RETRIES || '1', 10)
    },
    nominatim: {
        baseUrl: (process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org').replace(/\/+$/, ''),
        userAgent: process.env.NOMINATIM_USER_AGENT || 'FacilityDistanceEngine/1.0 (contact@healthrouting.org)',
        timeoutMs: parseInt(process.env.NOMINATIM_TIMEOUT_MS || '5000', 10),
        rateLimitDelayMs: parseInt(process.env.NOMINATIM_RATE_LIMIT_MS || '1000', 10)
    },
    cache: {
        ttlMs: parseInt(process.env.CACHE_TTL_MS || '1800000', 10), // 30 minutes default
        maxEntries: parseInt(process.env.CACHE_MAX_ENTRIES || '10000', 10),
        precisionDecimals: parseInt(process.env.CACHE_COORDINATE_PRECISION || '5', 10) // ~1.1 meter precision
    },
    concurrency: {
        limit: parseInt(process.env.ROUTING_CONCURRENCY_LIMIT || '5', 10)
    },
    profiles: {
        default: process.env.DEFAULT_ROUTING_PROFILE || 'driving',
        supported: ['driving', 'walking', 'cycling']
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info'
    }
};

module.exports = config;
