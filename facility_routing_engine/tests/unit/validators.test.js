const { describe, it } = require('node:test');
const assert = require('node:assert');
const { validateCoordinates, validateFacility, validateRoutingRequest } = require('../../src/utils/validators');
const { ValidationError } = require('../../src/errors');

describe('Validators Unit Tests', () => {
    describe('validateCoordinates', () => {
        it('should accept valid geographic coordinates', () => {
            const result = validateCoordinates(28.6139, 77.2090, 'TestPoint');
            assert.strictEqual(result.latitude, 28.6139);
            assert.strictEqual(result.longitude, 77.2090);
        });

        it('should accept valid numeric strings and convert to numbers', () => {
            const result = validateCoordinates('19.0760', '72.8777');
            assert.strictEqual(result.latitude, 19.076);
            assert.strictEqual(result.longitude, 72.8777);
        });

        it('should reject latitude < -90 or > 90', () => {
            assert.throws(() => validateCoordinates(91.5, 77.2090), ValidationError);
            assert.throws(() => validateCoordinates(-90.1, 77.2090), ValidationError);
        });

        it('should reject longitude < -180 or > 180', () => {
            assert.throws(() => validateCoordinates(28.6139, 181.0), ValidationError);
            assert.throws(() => validateCoordinates(28.6139, -180.5), ValidationError);
        });

        it('should reject non-numeric values or missing coordinates', () => {
            assert.throws(() => validateCoordinates('abc', 77.2090), ValidationError);
            assert.throws(() => validateCoordinates(28.6139, null), ValidationError);
            assert.throws(() => validateCoordinates(undefined, 77.2090), ValidationError);
        });
    });

    describe('validateFacility', () => {
        it('should validate a complete facility object', () => {
            const facility = validateFacility({
                id: 'F101',
                name: 'District Civil Hospital',
                latitude: 19.9975,
                longitude: 73.7898,
                type: 'HOSPITAL',
                address: 'Main Road, Nashik'
            });

            assert.strictEqual(facility.id, 'F101');
            assert.strictEqual(facility.name, 'District Civil Hospital');
            assert.strictEqual(facility.latitude, 19.9975);
            assert.strictEqual(facility.longitude, 73.7898);
            assert.strictEqual(facility.type, 'HOSPITAL');
        });

        it('should reject facility missing id', () => {
            assert.throws(() => validateFacility({ name: 'Hospital A', latitude: 20, longitude: 70 }), ValidationError);
        });

        it('should accept facility with address but missing coordinates for geocoding', () => {
            const facility = validateFacility({
                id: 'F102',
                name: 'Community Clinic',
                address: 'Sector 5, Pune'
            });
            assert.strictEqual(facility.latitude, null);
            assert.strictEqual(facility.address, 'Sector 5, Pune');
        });

        it('should reject facility missing both coordinates and address', () => {
            assert.throws(() => validateFacility({ id: 'F103', name: 'Nowhere Clinic' }), ValidationError);
        });
    });

    describe('validateRoutingRequest', () => {
        it('should validate a full routing request payload', () => {
            const payload = {
                origin: { latitude: 28.6139, longitude: 77.2090 },
                facilities: [
                    { id: 'F01', name: 'Facility 1', latitude: 28.6200, longitude: 77.2150 }
                ],
                profile: 'driving',
                filterType: 'hospital',
                includeGeometry: true
            };

            const result = validateRoutingRequest(payload);
            assert.strictEqual(result.origin.latitude, 28.6139);
            assert.strictEqual(result.facilities.length, 1);
            assert.strictEqual(result.profile, 'driving');
            assert.strictEqual(result.filterType, 'hospital');
            assert.strictEqual(result.includeGeometry, true);
        });

        it('should reject request with unsupported routing profile', () => {
            const payload = {
                origin: { latitude: 28.6139, longitude: 77.2090 },
                facilities: [{ id: 'F01', latitude: 28.62, longitude: 77.21 }],
                profile: 'flying_carpet'
            };
            assert.throws(() => validateRoutingRequest(payload), ValidationError);
        });

        it('should reject request with empty facilities array', () => {
            const payload = {
                origin: { latitude: 28.6139, longitude: 77.2090 },
                facilities: []
            };
            assert.throws(() => validateRoutingRequest(payload), ValidationError);
        });
    });
});
