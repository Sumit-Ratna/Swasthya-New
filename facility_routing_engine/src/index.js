const RoutingService = require('./services/RoutingService');
const OSRMClient = require('./clients/OSRMClient');
const GeocodingClient = require('./clients/GeocodingClient');
const DistanceCalculator = require('./services/DistanceCalculator');
const RouteCache = require('./cache/RouteCache');

const Coordinates = require('./models/Coordinates');
const Facility = require('./models/Facility');
const RouteInfo = require('./models/RouteInfo');
const RoutingRequest = require('./models/RoutingRequest');
const RoutingResult = require('./models/RoutingResult');

const errors = require('./errors');
const config = require('./config/config');
const { validateCoordinates, validateFacility, validateRoutingRequest } = require('./utils/validators');
const { formatDistance, formatDuration } = require('./utils/formatters');

/**
 * Factory helper to instantiate a configured RoutingService.
 */
function createRoutingEngine(options = {}) {
    return new RoutingService(options);
}

module.exports = {
    // Factory
    createRoutingEngine,

    // Core Services
    RoutingService,
    OSRMClient,
    GeocodingClient,
    DistanceCalculator,
    RouteCache,

    // Models & DTOs
    Coordinates,
    Facility,
    RouteInfo,
    RoutingRequest,
    RoutingResult,

    // Errors
    ...errors,

    // Utilities & Configuration
    config,
    validateCoordinates,
    validateFacility,
    validateRoutingRequest,
    formatDistance,
    formatDuration
};
