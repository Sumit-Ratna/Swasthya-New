const { describe, it } = require('node:test');
const assert = require('node:assert');
const RouteCache = require('../../src/cache/RouteCache');

describe('RouteCache Unit Tests', () => {
    it('should generate consistent cache keys with decimal precision rounding', () => {
        const cache = new RouteCache({ precisionDecimals: 4 });
        const key1 = cache.generateKey({ latitude: 28.613912, longitude: 77.209045 }, { latitude: 28.620011, longitude: 77.215099 }, 'driving');
        const key2 = cache.generateKey({ latitude: 28.613919, longitude: 77.209041 }, { latitude: 28.620018, longitude: 77.215092 }, 'driving');

        assert.strictEqual(key1, key2);
        assert.strictEqual(key1, '28.6139,77.2090->28.6200,77.2151->driving');
    });

    it('should store and retrieve route data within TTL', () => {
        const cache = new RouteCache({ ttlMs: 1000 });
        const origin = { latitude: 28.6139, longitude: 77.2090 };
        const dest = { latitude: 28.6200, longitude: 77.2150 };

        cache.set(origin, dest, 'driving', { distanceMeters: 4200, durationSeconds: 600 });
        const retrieved = cache.get(origin, dest, 'driving');

        assert.ok(retrieved);
        assert.strictEqual(retrieved.distanceMeters, 4200);

        const stats = cache.getStats();
        assert.strictEqual(stats.hits, 1);
        assert.strictEqual(stats.misses, 0);
    });

    it('should expire entries after TTL', async () => {
        const cache = new RouteCache({ ttlMs: 50 });
        const origin = { latitude: 28.6139, longitude: 77.2090 };
        const dest = { latitude: 28.6200, longitude: 77.2150 };

        cache.set(origin, dest, 'driving', { distanceMeters: 4200 });
        
        await new Promise(r => setTimeout(r, 60));

        const retrieved = cache.get(origin, dest, 'driving');
        assert.strictEqual(retrieved, null);
    });

    it('should evict oldest entry when maxEntries capacity is reached', () => {
        const cache = new RouteCache({ maxEntries: 2 });
        
        const p1 = { latitude: 28.1, longitude: 77.1 };
        const p2 = { latitude: 28.2, longitude: 77.2 };
        const p3 = { latitude: 28.3, longitude: 77.3 };
        const dest = { latitude: 28.9, longitude: 77.9 };

        cache.set(p1, dest, 'driving', { id: 1 });
        cache.set(p2, dest, 'driving', { id: 2 });
        cache.set(p3, dest, 'driving', { id: 3 });

        assert.strictEqual(cache.get(p1, dest, 'driving'), null); // p1 should be evicted
        assert.ok(cache.get(p2, dest, 'driving'));
        assert.ok(cache.get(p3, dest, 'driving'));
        assert.strictEqual(cache.getStats().evictions, 1);
    });
});
