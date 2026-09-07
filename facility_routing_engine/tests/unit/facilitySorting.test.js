const { describe, it } = require('node:test');
const assert = require('node:assert');
const RoutingService = require('../../src/services/RoutingService');
const RouteInfo = require('../../src/models/RouteInfo');

describe('Facility Sorting & Nearest Selection Unit Tests', () => {
    it('should sort facilities by road distance and assign sequential ranks', async () => {
        // Create mock OSRM client returning deterministic distances
        const mockOsrmClient = {
            async getRoute(origin, destination) {
                // Distance inversely related to latitude for testing
                const distMap = {
                    '73.1': 9500,  // Facility C
                    '73.2': 3200,  // Facility A (Nearest)
                    '73.3': 6400   // Facility B
                };
                const key = destination.longitude.toFixed(1);
                const distanceMeters = distMap[key] || 5000;
                return new RouteInfo({
                    distanceMeters,
                    durationSeconds: Math.round(distanceMeters / 10),
                    distanceSource: 'OSRM',
                    status: 'SUCCESS'
                });
            }
        };

        const service = new RoutingService({ osrmClient: mockOsrmClient });

        const request = {
            origin: { latitude: 19.0, longitude: 73.0 },
            facilities: [
                { id: 'FC', name: 'Facility C', latitude: 19.1, longitude: 73.1 },
                { id: 'FA', name: 'Facility A', latitude: 19.2, longitude: 73.2 },
                { id: 'FB', name: 'Facility B', latitude: 19.3, longitude: 73.3 }
            ]
        };

        const result = await service.calculateFacilityRoutes(request);

        assert.strictEqual(result.nearestFacility.id, 'FA');
        assert.strictEqual(result.nearestFacility.distanceMeters, 3200);

        assert.strictEqual(result.facilities[0].id, 'FA');
        assert.strictEqual(result.facilities[0].rank, 1);

        assert.strictEqual(result.facilities[1].id, 'FB');
        assert.strictEqual(result.facilities[1].rank, 2);

        assert.strictEqual(result.facilities[2].id, 'FC');
        assert.strictEqual(result.facilities[2].rank, 3);
    });

    it('should place failed routing facilities at the bottom of the ranking', async () => {
        const mockOsrmClient = {
            async getRoute(origin, destination) {
                if (destination.longitude === 73.2) {
                    throw new Error('Unroutable island');
                }
                return new RouteInfo({
                    distanceMeters: 5000,
                    durationSeconds: 600,
                    distanceSource: 'OSRM',
                    status: 'SUCCESS'
                });
            }
        };

        const service = new RoutingService({ osrmClient: mockOsrmClient });

        const request = {
            origin: { latitude: 19.0, longitude: 73.0 },
            enableFallback: false,
            facilities: [
                { id: 'FA_FAIL', name: 'Facility Fail', latitude: 19.2, longitude: 73.2 },
                { id: 'FB_OK', name: 'Facility OK', latitude: 19.3, longitude: 73.3 }
            ]
        };

        const result = await service.calculateFacilityRoutes(request);

        assert.strictEqual(result.nearestFacility.id, 'FB_OK');
        assert.strictEqual(result.facilities[0].id, 'FB_OK');
        assert.strictEqual(result.facilities[0].status, 'SUCCESS');
        assert.strictEqual(result.facilities[1].id, 'FA_FAIL');
        assert.strictEqual(result.facilities[1].status, 'ROUTING_FAILED');
    });
});
