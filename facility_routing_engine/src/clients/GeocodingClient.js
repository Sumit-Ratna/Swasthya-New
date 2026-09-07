const config = require('../config/config');
const { GeocodingError } = require('../errors');
const logger = require('../utils/logger');
const Coordinates = require('../models/Coordinates');

/**
 * OpenStreetMap Nominatim Geocoding Client.
 * Complies strictly with OSM Nominatim Usage Policy:
 * 1. Valid custom User-Agent identifying the application.
 * 2. Strict client-side rate limiting (default 1 req/sec).
 * 3. In-memory caching for repeated address queries.
 */
class GeocodingClient {
    constructor(options = {}) {
        this.baseUrl = (options.baseUrl || config.nominatim.baseUrl).replace(/\/+$/, '');
        this.userAgent = options.userAgent || config.nominatim.userAgent;
        this.timeoutMs = options.timeoutMs || config.nominatim.timeoutMs;
        this.rateLimitDelayMs = options.rateLimitDelayMs || config.nominatim.rateLimitDelayMs;
        
        this.cache = new Map();
        this.lastRequestTimestamp = 0;
    }

    /**
     * Enforces minimum delay between consecutive Nominatim requests.
     */
    async _enforceRateLimit() {
        const now = Date.now();
        const elapsed = now - this.lastRequestTimestamp;
        if (elapsed < this.rateLimitDelayMs) {
            const waitTime = this.rateLimitDelayMs - elapsed;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        this.lastRequestTimestamp = Date.now();
    }

    /**
     * Geocodes a text address or location query into geographic coordinates.
     * 
     * @param {string} address Text address
     * @returns {Promise<Coordinates>}
     */
    async geocode(address) {
        if (!address || typeof address !== 'string' || !address.trim()) {
            throw new GeocodingError('Address query must be a non-empty string');
        }

        const normalizedAddress = address.trim().toLowerCase();

        // Check in-memory cache first
        if (this.cache.has(normalizedAddress)) {
            logger.debug(`[GeocodingClient] Cache hit for address: "${address}"`);
            return this.cache.get(normalizedAddress);
        }

        await this._enforceRateLimit();

        const params = new URLSearchParams({
            q: address.trim(),
            format: 'json',
            limit: '1',
            addressdetails: '0'
        });

        const url = `${this.baseUrl}/search?${params.toString()}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            logger.debug(`[GeocodingClient] Querying Nominatim for address: "${address}"`);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': this.userAgent
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new GeocodingError(
                    `Nominatim returned HTTP ${response.status}: ${response.statusText}`,
                    { status: response.status }
                );
            }

            const results = await response.json();

            if (!Array.isArray(results) || results.length === 0) {
                throw new GeocodingError(`No geographic coordinates found for address: "${address}"`);
            }

            const firstMatch = results[0];
            const lat = parseFloat(firstMatch.lat);
            const lon = parseFloat(firstMatch.lon);

            if (isNaN(lat) || isNaN(lon)) {
                throw new GeocodingError(`Invalid coordinate payload returned by Nominatim for address: "${address}"`);
            }

            const coordinates = new Coordinates(lat, lon);
            this.cache.set(normalizedAddress, coordinates);

            logger.info(`[GeocodingClient] Successfully geocoded address`, {
                address,
                destination: coordinates
            });

            return coordinates;

        } catch (err) {
            clearTimeout(timeoutId);

            if (err.name === 'AbortError') {
                throw new GeocodingError(`Geocoding request timed out after ${this.timeoutMs}ms for: "${address}"`);
            }
            if (err instanceof GeocodingError) {
                throw err;
            }
            throw new GeocodingError(`Geocoding failed for "${address}": ${err.message}`, { original: err.message });
        }
    }
}

module.exports = GeocodingClient;
