const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * High-performance In-Memory Route Cache with TTL and LRU-style eviction.
 */
class RouteCache {
    constructor(options = {}) {
        this.ttlMs = options.ttlMs || config.cache.ttlMs;
        this.maxEntries = options.maxEntries || config.cache.maxEntries;
        this.precision = options.precisionDecimals || config.cache.precisionDecimals;
        this.store = new Map();
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            evictions: 0
        };
    }

    /**
     * Generates a deterministic cache key.
     * Example: "28.61390,77.20900->28.62000,77.21500->driving"
     */
    generateKey(origin, destination, profile = 'driving') {
        const originKey = `${Number(origin.latitude).toFixed(this.precision)},${Number(origin.longitude).toFixed(this.precision)}`;
        const destKey = `${Number(destination.latitude).toFixed(this.precision)},${Number(destination.longitude).toFixed(this.precision)}`;
        return `${originKey}->${destKey}->${profile.toLowerCase()}`;
    }

    /**
     * Retrieves an entry from cache if present and not expired.
     */
    get(origin, destination, profile = 'driving') {
        const key = this.generateKey(origin, destination, profile);
        const entry = this.store.get(key);

        if (!entry) {
            this.stats.misses++;
            return null;
        }

        const now = Date.now();
        if (now > entry.expiresAt) {
            // Expired entry
            this.store.delete(key);
            this.stats.misses++;
            return null;
        }

        this.stats.hits++;
        // Refresh position in Map for LRU behavior
        this.store.delete(key);
        this.store.set(key, entry);

        return entry.data;
    }

    /**
     * Stores a route result in the cache.
     */
    set(origin, destination, profile, routeData) {
        const key = this.generateKey(origin, destination, profile);
        const now = Date.now();

        // Enforce max capacity by evicting the oldest key (Map maintains insertion order)
        if (this.store.size >= this.maxEntries) {
            const oldestKey = this.store.keys().next().value;
            if (oldestKey) {
                this.store.delete(oldestKey);
                this.stats.evictions++;
            }
        }

        this.store.set(key, {
            data: routeData,
            cachedAt: now,
            expiresAt: now + this.ttlMs
        });
        this.stats.sets++;
    }

    /**
     * Clears all cached routes.
     */
    clear() {
        this.store.clear();
        this.stats = { hits: 0, misses: 0, sets: 0, evictions: 0 };
    }

    /**
     * Returns cache metrics.
     */
    getStats() {
        return {
            size: this.store.size,
            maxCapacity: this.maxEntries,
            ttlMs: this.ttlMs,
            ...this.stats,
            hitRatio: this.stats.hits + this.stats.misses > 0 
                ? Number((this.stats.hits / (this.stats.hits + this.stats.misses)).toFixed(3)) 
                : 0
        };
    }
}

module.exports = RouteCache;
