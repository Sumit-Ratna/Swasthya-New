/**
 * Base custom error class for the Facility Routing Engine.
 */
class RoutingError extends Error {
    constructor(message, code = 'ROUTING_ERROR', statusCode = 500, details = null) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends RoutingError {
    constructor(message, details = null) {
        super(message, 'VALIDATION_ERROR', 400, details);
    }
}

class OSRMUnavailableError extends RoutingError {
    constructor(message = 'OSRM routing server is unreachable or timed out', details = null) {
        super(message, 'OSRM_UNAVAILABLE', 503, details);
    }
}

class RouteNotFoundError extends RoutingError {
    constructor(message = 'No road route found between origin and destination coordinates', details = null) {
        super(message, 'ROUTE_NOT_FOUND', 404, details);
    }
}

class GeocodingError extends RoutingError {
    constructor(message = 'Failed to geocode address to coordinates', details = null) {
        super(message, 'GEOCODING_ERROR', 422, details);
    }
}

module.exports = {
    RoutingError,
    ValidationError,
    OSRMUnavailableError,
    RouteNotFoundError,
    GeocodingError
};
