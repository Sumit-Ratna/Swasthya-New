const { describe, it } = require('node:test');
const assert = require('node:assert');
const RoutingService = require('../../src/services/RoutingService');
const RouteInfo = require('../../src/models/RouteInfo');

describe('RoutingService Integration Tests', () => {
    it('should calculate and rank routes for a batch of healthcare facilities', async () => {
        const mockOsrmClient = {
            async getRoute(origin, destination) {
                const distanceMeters = Math.round(Math.hypot(destination.latitude - origin.latitude, destination.longitude - origin.longitude) * 100000);
                return new RouteInfo({
                    distanceMeters,
                    durationSeconds: Math.round(distanceMeters / 10),
                    distanceSource: 'OSRM',
                    status: 'SUCCESS',
                    geometry: { type: 'LineString', coordinates: [[origin.longitude, origin.latitude], [destination.longitude, destination.latitude]] }
                });
            }
        };

        const service = new RoutingService({ osrmClient: mockOsrmClient });

        const request = {
            origin: { latitude: 28.6139, longitude: 77.2090 },
            facilities: [
                { id: 'F1', name: 'District Hospital', latitude: 28.6500, longitude: 77.2300, type: 'HOSPITAL' },
                { id: 'F2', name: 'Local PHC Centre', latitude: 28.6200, longitude: 77.2150, type: 'PHC' },
                { id: 'F3', name: 'Community Health Centre', latitude: 28.7000, longitude: 77.3000, type: 'CHC' }
            ],
            profile: 'driving',
            includeGeometry: true
        };

        const result = await service.calculateFacilityRoutes(request);

        assert.ok(result);
        assert.strictEqual(result.summary.totalRequested, 3);
        assert.strictEqual(result.summary.successfulRoutes, 3);
        assert.strictEqual(result.nearestFacility.id, 'F2'); // F2 is closest to origin
        assert.strictEqual(result.facilities[0].rank, 1);
        assert.strictEqual(result.facilities[1].rank, 2);
        assert.strictEqual(result.facilities[2].rank, 3);
        assert.ok(result.facilities[0].geometry);
    });

    it('should respect facility type filtering', async () => {
        const mockOsrmClient = {
            async getRoute(origin, destination) {
                return new RouteInfo({ distanceMeters: 5000, durationSeconds: 600, distanceSource: 'OSRM' });
            }
        };

        const service = new RoutingService({ osrmClient: mockOsrmClient });

        const request = {
            origin: { latitude: 28.6139, longitude: 77.2090 },
            filterType: 'PHC',
            facilities: [
                { id: 'F1', name: 'General Hospital', latitude: 28.65, longitude: 77.23, type: 'HOSPITAL' },
                { id: 'F2', name: 'Shirwal Primary Centre', latitude: 28.62, longitude: 77.21, type: 'PHC' }
            ]
        };

        const result = await service.calculateFacilityRoutes(request);

        assert.strictEqual(result.summary.totalRequested, 2);
        assert.strictEqual(result.summary.totalEvaluated, 1);
        assert.strictEqual(result.facilities.length, 1);
        assert.strictEqual(result.facilities[0].id, 'F2');
        assert.strictEqual(result.facilities[0].type, 'PHC');
    });

    it('should geocode address when coordinates are missing and route successfully', async () => {
        const mockOsrmClient = {
            async getRoute(origin, destination) {
                return new RouteInfo({ distanceMeters: 4800, durationSeconds: 520, distanceSource: 'OSRM' });
            }
        };

        const mockGeocodingClient = {
            async geocode(address) {
                return { latitude: 28.6250, longitude: 77.2180 };
            }
        };

        const service = new RoutingService({
            osrmClient: mockOsrmClient,
            geocodingClient: mockGeocodingClient
        });

        const request = {
            origin: { latitude: 28.6139, longitude: 77.2090 },
            facilities: [
                { id: 'F_ADDR', name: 'Downtown Clinic', address: 'Connaught Place, New Delhi' }
            ]
        };

        const result = await service.calculateFacilityRoutes(request);

        assert.strictEqual(result.facilities.length, 1);
        assert.strictEqual(result.facilities[0].id, 'F_ADDR');
        assert.strictEqual(result.facilities[0].latitude, 28.6250);
        assert.strictEqual(result.facilities[0].longitude, 77.2180);
        assert.strictEqual(result.facilities[0].status, 'SUCCESS');
    });
});
