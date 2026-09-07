const Coordinates = require('./Coordinates');
const Facility = require('./Facility');
const { validateRoutingRequest } = require('../utils/validators');

/**
 * Routing Request DTO
 */
class RoutingRequest {
    constructor(rawPayload) {
        const validated = validateRoutingRequest(rawPayload);

        this.origin = new Coordinates(validated.origin.latitude, validated.origin.longitude);
        this.facilities = validated.facilities.map(f => new Facility(f));
        this.profile = validated.profile;
        this.filterType = validated.filterType;
        this.includeGeometry = validated.includeGeometry;
        this.enableFallback = validated.enableFallback;
    }
}

module.exports = RoutingRequest;
