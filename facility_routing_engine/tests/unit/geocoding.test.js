const { describe, it } = require('node:test');
const assert = require('node:assert');
const GeocodingClient = require('../../src/clients/GeocodingClient');

describe('GeocodingClient Unit Tests', () => {
    it('should return cached coordinates on repeated address lookups', async () => {
        const client = new GeocodingClient();
        
        // Manually seed cache
        client.cache.set('civil hospital nashik', { latitude: 19.9975, longitude: 73.7898 });

        const coords = await client.geocode('Civil Hospital Nashik');
        assert.strictEqual(coords.latitude, 19.9975);
        assert.strictEqual(coords.longitude, 73.7898);
    });

    it('should reject invalid or empty address queries', async () => {
        const client = new GeocodingClient();
        await assert.rejects(() => client.geocode(''), /must be a non-empty string/);
        await assert.rejects(() => client.geocode(null), /must be a non-empty string/);
    });
});
