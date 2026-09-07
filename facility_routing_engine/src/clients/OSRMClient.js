const config = require('../config/config');
const RouteInfo = require('../models/RouteInfo');
const { 
    OSRMUnavailableError, 
    RouteNotFoundError, 
    RoutingError, 
    ValidationError 
} = require('../errors');
const logger = require('../utils/logger');

/**
 * Dedicated OSRM (Open Source Routing Machine) API Client.
 * Handles request lifecycle, URL serialization, response validation, and normalization.
 */
class OSRMClient {
    constructor(options = {}) {
        this.baseUrl = (options.baseUrl || config.osrm.baseUrl).replace(/\/+$/, '');
        this.timeoutMs = options.timeoutMs || config.osrm.timeoutMs;
        this.maxRetries = options.maxRetries || config.osrm.maxRetries;
    }

    /**
     * Constructs OSRM Route URL.
     * Note: OSRM strictly expects coordinate format: {longitude},{latitude};{longitude},{latitude}
     */
    buildRouteUrl(origin, destination, profile = 'driving', includeGeometry = false) {
        const originCoord = `${origin.longitude},${origin.latitude}`;
        const destCoord = `${destination.longitude},${destination.latitude}`;
        const overview = includeGeometry ? 'full' : 'false';
        const geometries = 'geojson';

        return `${this.baseUrl}/route/v1/${profile}/${originCoord};${destCoord}?overview=${overview}&geometries=${geometries}&steps=false&alternatives=false`;
    }

    /**
     * Calculates driving/walking/cycling road route between two points.
     * 
     * @param {object} origin { latitude, longitude }
     * @param {object} destination { latitude, longitude }
     * @param {object} options { profile, includeGeometry }
     * @returns {Promise<RouteInfo>}
     */
    async getRoute(origin, destination, options = {}) {
        const profile = options.profile || config.profiles.default;
        const includeGeometry = Boolean(options.includeGeometry);
        const url = this.buildRouteUrl(origin, destination, profile, includeGeometry);

        const startTime = Date.now();
        let lastError = null;

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

            try {
                logger.debug(`[OSRMClient] Sending route request (attempt ${attempt + 1})`, {
                    origin,
                    destination,
                    profile
                });

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'User-Agent': 'FacilityRoutingEngine/1.0'
                    },
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                const latencyMs = Date.now() - startTime;

                if (!response.ok) {
                    const errorText = await response.text().catch(() => 'Unknown server response');
                    throw new RoutingError(
                        `OSRM returned HTTP ${response.status}: ${response.statusText}`,
                        'OSRM_HTTP_ERROR',
                        response.status,
                        { errorText, latencyMs }
                    );
                }

                let data;
                try {
                    data = await response.json();
                } catch (parseErr) {
                    throw new RoutingError(
                        'Malformed JSON response received from OSRM server',
                        'OSRM_PARSE_ERROR',
                        502,
                        { details: parseErr.message, latencyMs }
                    );
                }

                return this.parseAndValidateResponse(data, profile, latencyMs);

            } catch (err) {
                clearTimeout(timeoutId);
                const latencyMs = Date.now() - startTime;

                if (err.name === 'AbortError') {
                    lastError = new OSRMUnavailableError(
                        `OSRM request timed out after ${this.timeoutMs}ms`,
                        { latencyMs, attempt }
                    );
                } else if (err instanceof RoutingError) {
                    lastError = err;
                } else {
                    lastError = new OSRMUnavailableError(
                        `Failed to connect to OSRM server: ${err.message}`,
                        { originalError: err.message, latencyMs, attempt }
                    );
                }

                // If not last attempt, short backoff before retry
                if (attempt < this.maxRetries) {
                    await new Promise(r => setTimeout(r, 200 * (attempt + 1)));
                }
            }
        }

        logger.warn('[OSRMClient] All OSRM routing attempts failed', {
            error: lastError?.message,
            origin,
            destination
        });

        throw lastError;
    }

    /**
     * Parses and normalizes OSRM JSON response into a RouteInfo model.
     */
    parseAndValidateResponse(data, profile, latencyMs) {
        if (!data || typeof data !== 'object') {
            throw new RoutingError('Invalid OSRM response structure: expected root object', 'OSRM_INVALID_RESPONSE', 502);
        }

        if (data.code === 'NoRoute' || data.code === 'NoSegment') {
            throw new RouteNotFoundError(
                `No navigable road route found for given coordinates (${data.code})`,
                { code: data.code, message: data.message }
            );
        }

        if (data.code !== 'Ok') {
            throw new RoutingError(
                `OSRM error code: ${data.code} - ${data.message || 'Unknown routing failure'}`,
                'OSRM_ROUTING_FAILED',
                400,
                { osrmCode: data.code, message: data.message }
            );
        }

        if (!Array.isArray(data.routes) || data.routes.length === 0) {
            throw new RouteNotFoundError('OSRM returned Ok status but 0 routes found');
        }

        const primaryRoute = data.routes[0];

        if (typeof primaryRoute.distance !== 'number' || typeof primaryRoute.duration !== 'number') {
            throw new RoutingError('OSRM route missing numeric distance or duration attributes', 'OSRM_INVALID_PAYLOAD', 502);
        }

        return new RouteInfo({
            distanceMeters: primaryRoute.distance,
            durationSeconds: primaryRoute.duration,
            distanceSource: 'OSRM',
            status: 'SUCCESS',
            geometry: primaryRoute.geometry || null,
            profile,
            cached: false
        });
    }
}

module.exports = OSRMClient;
