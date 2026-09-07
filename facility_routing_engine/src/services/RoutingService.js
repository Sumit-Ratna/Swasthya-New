const OSRMClient = require('../clients/OSRMClient');
const GeocodingClient = require('../clients/GeocodingClient');
const RouteCache = require('../cache/RouteCache');
const DistanceCalculator = require('./DistanceCalculator');
const RoutingRequest = require('../models/RoutingRequest');
const RoutingResult = require('../models/RoutingResult');
const RouteInfo = require('../models/RouteInfo');
const { runWithConcurrencyLimit } = require('../utils/concurrency');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Production-grade Facility Distance & Routing Engine Service.
 */
class RoutingService {
    constructor(options = {}) {
        this.osrmClient = options.osrmClient || new OSRMClient(options.osrm);
        this.geocodingClient = options.geocodingClient || new GeocodingClient(options.geocoding);
        this.cache = options.cache || new RouteCache(options.cache);
        this.concurrencyLimit = options.concurrencyLimit || config.concurrency.limit;
    }

    /**
     * Calculates road distances, travel times, and rankings from an origin to a list of healthcare facilities.
     * 
     * @param {object|RoutingRequest} rawRequest Payload or RoutingRequest instance
     * @returns {Promise<RoutingResult>}
     */
    async calculateFacilityRoutes(rawRequest) {
        const startTime = Date.now();
        const request = rawRequest instanceof RoutingRequest 
            ? rawRequest 
            : new RoutingRequest(rawRequest);

        const { origin, profile, includeGeometry, enableFallback, filterType } = request;

        logger.info('[RoutingService] Starting facility routing batch', {
            origin,
            profile,
            totalFacilities: request.facilities.length,
            filterType
        });

        // 1. Filter facilities by type if specified
        let eligibleFacilities = request.facilities;
        if (filterType) {
            eligibleFacilities = eligibleFacilities.filter(f => 
                f.type && f.type.toLowerCase() === filterType.toLowerCase()
            );
            logger.debug(`[RoutingService] Filtered facilities by type '${filterType}': ${eligibleFacilities.length} remaining`);
        }

        // 2. Resolve missing coordinates via geocoding if needed
        for (const facility of eligibleFacilities) {
            if (!facility.hasCoordinates() && facility.address) {
                try {
                    const coords = await this.geocodingClient.geocode(facility.address);
                    facility.setCoordinates(coords.latitude, coords.longitude);
                } catch (geoErr) {
                    logger.warn(`[RoutingService] Failed to geocode address for facility [${facility.id}]: ${geoErr.message}`);
                }
            }
        }

        // 3. Prepare async task generators for concurrent execution
        const taskGenerators = eligibleFacilities.map(facility => {
            return () => this._computeSingleFacilityRoute(origin, facility, {
                profile,
                includeGeometry,
                enableFallback
            });
        });

        // 4. Execute batch routing with concurrency control
        const routeResults = await runWithConcurrencyLimit(taskGenerators, this.concurrencyLimit);

        // 5. Build enriched facility route objects
        const evaluatedFacilities = eligibleFacilities.map((facility, index) => {
            const route = routeResults[index];
            return {
                id: facility.id,
                name: facility.name,
                type: facility.type,
                address: facility.address,
                latitude: facility.coordinates ? facility.coordinates.latitude : null,
                longitude: facility.coordinates ? facility.coordinates.longitude : null,
                distanceMeters: route.distanceMeters,
                distanceKm: route.distanceKm,
                distanceFormatted: route.distanceFormatted,
                durationSeconds: route.durationSeconds,
                durationMinutes: route.durationMinutes,
                durationFormatted: route.durationFormatted,
                distanceSource: route.distanceSource,
                status: route.status,
                cached: route.cached,
                geometry: route.geometry,
                error: route.error || null
            };
        });

        // 6. Sort facilities by road distance (successful/fallback routes first, failed routes last)
        evaluatedFacilities.sort((a, b) => {
            if (a.status === 'ROUTING_FAILED' && b.status !== 'ROUTING_FAILED') return 1;
            if (b.status === 'ROUTING_FAILED' && a.status !== 'ROUTING_FAILED') return -1;
            return a.distanceMeters - b.distanceMeters;
        });

        // 7. Assign 1-based ranks
        evaluatedFacilities.forEach((fac, idx) => {
            fac.rank = idx + 1;
        });

        // 8. Identify nearest facility
        const validFacilities = evaluatedFacilities.filter(f => f.status !== 'ROUTING_FAILED');
        const nearestFacility = validFacilities.length > 0 ? validFacilities[0] : null;

        const totalExecutionMs = Date.now() - startTime;

        logger.info('[RoutingService] Completed facility routing batch', {
            totalEvaluated: evaluatedFacilities.length,
            nearestFacilityId: nearestFacility?.id,
            nearestDistanceMeters: nearestFacility?.distanceMeters,
            totalExecutionMs
        });

        return new RoutingResult({
            origin,
            profile,
            totalFacilitiesRequested: request.facilities.length,
            totalEvaluated: evaluatedFacilities.length,
            nearestFacility,
            facilities: evaluatedFacilities,
            metadata: {
                executionLatencyMs: totalExecutionMs,
                cacheStats: this.cache.getStats()
            }
        });
    }

    /**
     * Computes route for a single facility, handling cache, identical coordinates, OSRM errors, and Haversine fallback.
     */
    async _computeSingleFacilityRoute(origin, facility, options) {
        if (!facility.hasCoordinates()) {
            return new RouteInfo({
                distanceMeters: 0,
                durationSeconds: 0,
                status: 'ROUTING_FAILED',
                distanceSource: 'NONE',
                error: { message: 'Facility has no valid coordinates and geocoding failed' }
            });
        }

        const destination = facility.coordinates;

        // Check for identical origin and destination coordinates (0 distance)
        if (origin.latitude === destination.latitude && origin.longitude === destination.longitude) {
            return new RouteInfo({
                distanceMeters: 0,
                durationSeconds: 0,
                distanceSource: 'OSRM',
                status: 'SUCCESS',
                profile: options.profile
            });
        }

        // 1. Check in-memory cache
        const cachedRoute = this.cache.get(origin, destination, options.profile);
        if (cachedRoute) {
            logger.debug(`[RoutingService] Cache hit for facility [${facility.id}]`);
            return new RouteInfo({
                ...cachedRoute,
                cached: true
            });
        }

        // 2. Fetch road route from OSRM
        try {
            const osrmRoute = await this.osrmClient.getRoute(origin, destination, options);

            // Store in cache
            this.cache.set(origin, destination, options.profile, {
                distanceMeters: osrmRoute.distanceMeters,
                durationSeconds: osrmRoute.durationSeconds,
                distanceSource: 'OSRM',
                status: 'SUCCESS',
                geometry: osrmRoute.geometry,
                profile: options.profile
            });

            return osrmRoute;

        } catch (err) {
            logger.warn(`[RoutingService] OSRM road calculation failed for facility [${facility.id}]: ${err.message}`, {
                error: err.message,
                origin,
                destination
            });

            // 3. Fallback strategy: compute straight-line Haversine distance if enabled
            if (options.enableFallback) {
                const fallbackRoute = DistanceCalculator.computeHaversineRoute(
                    origin,
                    destination,
                    options.profile,
                    `OSRM error (${err.message}). Evaluated straight-line geodesic distance fallback.`
                );

                return fallbackRoute;
            }

            // If fallback is disabled, return failed route status
            return new RouteInfo({
                distanceMeters: 0,
                durationSeconds: 0,
                status: 'ROUTING_FAILED',
                distanceSource: 'NONE',
                error: {
                    code: err.code || 'ROUTING_ERROR',
                    message: err.message
                }
            });
        }
    }

    /**
     * Clears route cache.
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Returns cache metrics.
     */
    getCacheStats() {
        return this.cache.getStats();
    }
}

module.exports = RoutingService;
