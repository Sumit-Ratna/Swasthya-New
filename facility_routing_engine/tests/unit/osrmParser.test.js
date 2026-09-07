const { describe, it } = require('node:test');
const assert = require('node:assert');
const OSRMClient = require('../../src/clients/OSRMClient');
const { RouteNotFoundError, RoutingError } = require('../../src/errors');

describe('OSRMClient Response Parsing Unit Tests', () => {
    const client = new OSRMClient();

    it('should correctly parse a valid OSRM response payload', () => {
        const mockOsrmResponse = {
            code: 'Ok',
            routes: [
                {
                    geometry: 'a~l~Fjk~uOnzh@vydB',
                    legs: [],
                    weight_name: 'routability',
                    weight: 540.2,
                    duration: 540.2,
                    distance: 4250.8
                }
            ],
            waypoints: []
        };

        const result = client.parseAndValidateResponse(mockOsrmResponse, 'driving', 50);

        assert.strictEqual(result.status, 'SUCCESS');
        assert.strictEqual(result.distanceSource, 'OSRM');
        assert.strictEqual(result.distanceMeters, 4251);
        assert.strictEqual(result.distanceKm, 4.25);
        assert.strictEqual(result.durationSeconds, 540);
        assert.strictEqual(result.durationMinutes, 9);
        assert.strictEqual(result.geometry, 'a~l~Fjk~uOnzh@vydB');
    });

    it('should throw RouteNotFoundError when OSRM returns NoRoute code', () => {
        const mockNoRouteResponse = {
            code: 'NoRoute',
            message: 'Impossible route between coordinates'
        };

        assert.throws(
            () => client.parseAndValidateResponse(mockNoRouteResponse, 'driving', 20),
            RouteNotFoundError
        );
    });

    it('should throw RoutingError when response is malformed or missing routes array', () => {
        const malformedResponse = { code: 'Ok', routes: [] };
        assert.throws(
            () => client.parseAndValidateResponse(malformedResponse, 'driving', 20),
            RouteNotFoundError
        );

        const invalidPayload = { invalid: true };
        assert.throws(
            () => client.parseAndValidateResponse(invalidPayload, 'driving', 20),
            RoutingError
        );
    });

    it('should construct valid OSRM coordinate URL format (longitude,latitude)', () => {
        const origin = { latitude: 28.6139, longitude: 77.2090 };
        const dest = { latitude: 28.6200, longitude: 77.2150 };

        const url = client.buildRouteUrl(origin, dest, 'driving', true);
        assert.ok(url.includes('/route/v1/driving/77.209,28.6139;77.215,28.62?overview=full'));
    });
});
