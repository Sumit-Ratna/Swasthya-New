const { describe, it } = require('node:test');
const assert = require('node:assert');
const DistanceCalculator = require('../../src/services/DistanceCalculator');

describe('DistanceCalculator (Haversine) Unit Tests', () => {
    it('should return 0 meters for identical coordinate pairs', () => {
        const meters = DistanceCalculator.calculateHaversineMeters(28.6139, 77.2090, 28.6139, 77.2090);
        assert.strictEqual(meters, 0);
    });

    it('should calculate accurate geodesic distance between Connaught Place and AIIMS Delhi (~6.4 km straight line)', () => {
        // Connaught Place: 28.6315, 77.2167
        // AIIMS Delhi: 28.5672, 77.2100
        const meters = DistanceCalculator.calculateHaversineMeters(28.6315, 77.2167, 28.5672, 77.2100);
        assert.ok(meters > 6500 && meters < 7500, `Expected ~7.1 km, received ${meters} m`);
    });

    it('should calculate distance between Mumbai (19.0760, 72.8777) and Pune (18.5204, 73.8567) (~120 km straight line)', () => {
        const meters = DistanceCalculator.calculateHaversineMeters(19.0760, 72.8777, 18.5204, 73.8567);
        const km = meters / 1000;
        assert.ok(km > 115 && km < 130, `Expected ~120 km, received ${km} km`);
    });

    it('should generate a RouteInfo object with HAVERSINE_FALLBACK source and explicit disclaimer', () => {
        const origin = { latitude: 28.6139, longitude: 77.2090 };
        const dest = { latitude: 28.6200, longitude: 77.2150 };

        const fallbackRoute = DistanceCalculator.computeHaversineRoute(origin, dest, 'driving', 'Mock OSRM 503');

        assert.strictEqual(fallbackRoute.distanceSource, 'HAVERSINE_FALLBACK');
        assert.strictEqual(fallbackRoute.status, 'FALLBACK_USED');
        assert.ok(fallbackRoute.distanceMeters > 0);
        assert.ok(fallbackRoute.durationSeconds > 0);
        assert.ok(fallbackRoute.error.message.includes('Mock OSRM 503'));
    });
});
