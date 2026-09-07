/**
 * Standardized Output Contract DTO for Facility Routing Engine
 */
class RoutingResult {
    constructor({
        origin,
        profile,
        totalFacilitiesRequested,
        totalEvaluated,
        nearestFacility = null,
        facilities = [],
        metadata = {}
    }) {
        this.origin = origin ? origin.toJSON() : null;
        this.profile = profile || 'driving';
        this.summary = {
            totalRequested: totalFacilitiesRequested || 0,
            totalEvaluated: totalEvaluated || 0,
            successfulRoutes: facilities.filter(f => f.status === 'SUCCESS').length,
            fallbackRoutes: facilities.filter(f => f.status === 'FALLBACK_USED').length,
            failedRoutes: facilities.filter(f => f.status === 'ROUTING_FAILED').length
        };
        this.nearestFacility = nearestFacility;
        this.facilities = facilities;
        this.metadata = {
            engine: 'Facility Distance & Routing Engine (OSM / OSRM)',
            calculatedAt: new Date().toISOString(),
            ...metadata
        };
    }

    toJSON() {
        return {
            origin: this.origin,
            profile: this.profile,
            summary: this.summary,
            nearestFacility: this.nearestFacility,
            facilities: this.facilities,
            metadata: this.metadata
        };
    }
}

module.exports = RoutingResult;
