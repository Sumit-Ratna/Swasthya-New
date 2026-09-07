const { describe, it } = require('node:test');
const assert = require('node:assert');
const RoutingService = require('../../src/services/RoutingService');
const { OSRMUnavailableError } = require('../../src/errors');

describe('Fallback & Fault Tolerance Integration Tests', () => {
    it('should transparently compute Haversine fallback when OSRM is completely unavailable', async () => {
        // Mock client simulating total OSRM outage
        const failingOsrmClient = {
            async getRoute() {
                throw new OSRMUnavailableError('OSRM 503 Service Unavailable');
            }
        };

        const service = new RoutingService({ osrmClient: failingOsrmClient });

        const request = {
            origin: { latitude: 28.6139, longitude: 77.2090 },
            facilities: [
                { id: 'F1', name: 'Facility 1', latitude: 28.6200, longitude: 77.2150 }
            ],
            enableFallback: true
        };

        const result = await service.calculateFacilityRoutes(request);

        assert.ok(result);
        assert.strictEqual(result.summary.successfulRoutes, 0);
        assert.strictEqual(result.summary.fallbackRoutes, 1);
        assert.strictEqual(result.facilities[0].status, 'FALLBACK_USED');
        assert.strictEqual(result.facilities[0].distanceSource, 'HAVERSINE_FALLBACK');
        assert.ok(result.facilities[0].distanceMeters > 0);
        assert.ok(result.nearestFacility);
        assert.strictEqual(result.nearestFacility.distanceSource, 'HAVERSINE_FALLBACK');
    });

    it('should handle partial failure without crashing (1 facility fails, 1 succeeds)', async () => {
        const partialOsrmClient = {
            async getRoute(origin, destination) {
                if (destination.latitude === 28.9999) {
                    throw new Error('Connection refused for point');
                }
                return {
                    distanceMeters: 3000,
                    durationSeconds: 400,
                    distanceSource: 'OSRM',
                    status: 'SUCCESS'
                };
            }
        };

        const service = new RoutingService({ osrmClient: partialOsrmClient });

        const request = {
            origin: { latitude: 28.6139, longitude: 77.2090 },
            enableFallback: false, // Fallback disabled to test explicit error capture
            facilities: [
                { id: 'F_GOOD', name: 'Good Facility', latitude: 28.6200, longitude: 77.2150 },
                { id: 'F_FAIL', name: 'Fail Facility', latitude: 28.9999, longitude: 77.9999 }
            ]
        };

        const result = await service.calculateFacilityRoutes(request);

        assert.strictEqual(result.summary.totalRequested, 2);
        assert.strictEqual(result.summary.successfulRoutes, 1);
        assert.strictEqual(result.summary.failedRoutes, 1);
        assert.strictEqual(result.nearestFacility.id, 'F_GOOD');
        assert.strictEqual(result.facilities[0].id, 'F_GOOD');
        assert.strictEqual(result.facilities[0].status, 'SUCCESS');
        assert.strictEqual(result.facilities[1].id, 'F_FAIL');
        assert.strictEqual(result.facilities[1].status, 'ROUTING_FAILED');
        assert.ok(result.facilities[1].error);
    });
});
