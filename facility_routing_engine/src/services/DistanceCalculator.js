const RouteInfo = require('../models/RouteInfo');

/**
 * Earth radius in meters (WGS-84 mean radius)
 */
const EARTH_RADIUS_METERS = 6371000;

/**
 * Approximate default speeds for fallback travel time estimation (meters / second)
 */
const ESTIMATED_SPEEDS_MPS = {
    driving: 9.72,  // ~35 km/h realistic average including traffic
    walking: 1.25,  // ~4.5 km/h
    cycling: 4.17   // ~15 km/h
};

/**
 * Haversine straight-line distance calculator.
 * Used exclusively as an explicit, honest fallback when road routing services (OSRM) are unreachable.
 */
class DistanceCalculator {
    /**
     * Converts degrees to radians.
     */
    static toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Calculates great-circle straight-line distance between two coordinate pairs in meters.
     * 
     * @param {number} lat1 Latitude of point 1
     * @param {number} lon1 Longitude of point 1
     * @param {number} lat2 Latitude of point 2
     * @param {number} lon2 Longitude of point 2
     * @returns {number} Distance in meters
     */
    static calculateHaversineMeters(lat1, lon1, lat2, lon2) {
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);

        const rLat1 = this.toRadians(lat1);
        const rLat2 = this.toRadians(lat2);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(rLat1) * Math.cos(rLat2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return Math.round(EARTH_RADIUS_METERS * c);
    }

    /**
     * Computes a RouteInfo object using Haversine straight-line estimation.
     * 
     * @param {object} origin Origin coordinates { latitude, longitude }
     * @param {object} destination Destination coordinates { latitude, longitude }
     * @param {string} profile Routing profile ('driving', 'walking', 'cycling')
     * @param {string} reason Diagnostic reason for fallback
     * @returns {RouteInfo}
     */
    static computeHaversineRoute(origin, destination, profile = 'driving', reason = 'OSRM service unavailable') {
        const straightLineMeters = this.calculateHaversineMeters(
            origin.latitude,
            origin.longitude,
            destination.latitude,
            destination.longitude
        );

        // Account for typical road circuity factor (~1.25x for straight line to road distance estimation)
        const estimatedRoadMeters = Math.round(straightLineMeters * 1.25);
        const speedMps = ESTIMATED_SPEEDS_MPS[profile] || ESTIMATED_SPEEDS_MPS.driving;
        const estimatedSeconds = Math.max(30, Math.round(estimatedRoadMeters / speedMps));

        return new RouteInfo({
            distanceMeters: estimatedRoadMeters,
            durationSeconds: estimatedSeconds,
            distanceSource: 'HAVERSINE_FALLBACK',
            status: 'FALLBACK_USED',
            profile,
            error: {
                message: reason,
                straightLineMeters
            }
        });
    }
}

module.exports = DistanceCalculator;
