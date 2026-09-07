const { ValidationError } = require('../errors');
const config = require('../config/config');

/**
 * Validates a geographic coordinate pair.
 * @param {number|string} lat Latitude
 * @param {number|string} lng Longitude
 * @param {string} contextLabel Context description for error messages
 * @returns {{ latitude: number, longitude: number }} Normalized coordinates
 */
function validateCoordinates(lat, lng, contextLabel = 'Coordinates') {
    if (lat === undefined || lat === null || lat === '') {
        throw new ValidationError(`${contextLabel}: Latitude is required`);
    }
    if (lng === undefined || lng === null || lng === '') {
        throw new ValidationError(`${contextLabel}: Longitude is required`);
    }

    const parsedLat = Number(lat);
    const parsedLng = Number(lng);

    if (isNaN(parsedLat) || !isFinite(parsedLat)) {
        throw new ValidationError(`${contextLabel}: Latitude must be a valid finite number (received: ${lat})`);
    }
    if (isNaN(parsedLng) || !isFinite(parsedLng)) {
        throw new ValidationError(`${contextLabel}: Longitude must be a valid finite number (received: ${lng})`);
    }

    if (parsedLat < -90 || parsedLat > 90) {
        throw new ValidationError(`${contextLabel}: Latitude must be between -90 and +90 degrees (received: ${parsedLat})`);
    }
    if (parsedLng < -180 || parsedLng > 180) {
        throw new ValidationError(`${contextLabel}: Longitude must be between -180 and +180 degrees (received: ${parsedLng})`);
    }

    return {
        latitude: parsedLat,
        longitude: parsedLng
    };
}

/**
 * Validates a single facility payload.
 * @param {object} facility Facility object
 * @param {number} index Index in batch for debugging
 * @returns {object} Validated facility
 */
function validateFacility(facility, index = 0) {
    if (!facility || typeof facility !== 'object') {
        throw new ValidationError(`Facility at index ${index} must be a valid object`);
    }

    if (!facility.id && facility.id !== 0) {
        throw new ValidationError(`Facility at index ${index} is missing required 'id' field`);
    }

    const facilityId = String(facility.id).trim();
    if (!facilityId) {
        throw new ValidationError(`Facility at index ${index} has empty 'id' field`);
    }

    const facilityName = facility.name ? String(facility.name).trim() : `Facility-${facilityId}`;

    // Validate coordinates if provided
    let coords = null;
    const hasLat = facility.latitude !== undefined && facility.latitude !== null && facility.latitude !== '';
    const hasLng = facility.longitude !== undefined && facility.longitude !== null && facility.longitude !== '';

    if (hasLat || hasLng) {
        coords = validateCoordinates(facility.latitude, facility.longitude, `Facility [${facilityId}]`);
    } else if (!facility.address && !facility.location) {
        throw new ValidationError(`Facility [${facilityId}] must provide either coordinates (latitude/longitude) or an address for geocoding`);
    }

    return {
        id: facilityId,
        name: facilityName,
        latitude: coords ? coords.latitude : null,
        longitude: coords ? coords.longitude : null,
        type: facility.type ? String(facility.type).trim() : null,
        address: facility.address ? String(facility.address).trim() : null,
        raw: facility
    };
}

/**
 * Validates a batch routing request payload.
 * @param {object} payload Request payload
 * @returns {object} Sanitized and validated request options
 */
function validateRoutingRequest(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new ValidationError('Routing request payload must be a non-empty object');
    }

    if (!payload.origin || typeof payload.origin !== 'object') {
        throw new ValidationError("Routing request must include an 'origin' object with latitude and longitude");
    }

    const origin = validateCoordinates(payload.origin.latitude, payload.origin.longitude, 'Origin');

    if (!Array.isArray(payload.facilities)) {
        throw new ValidationError("Routing request must include 'facilities' as an array");
    }

    if (payload.facilities.length === 0) {
        throw new ValidationError("'facilities' array must contain at least one facility");
    }

    const validatedFacilities = payload.facilities.map((fac, idx) => validateFacility(fac, idx));

    // Profile validation
    const profile = (payload.profile || config.profiles.default).toLowerCase().trim();
    if (!config.profiles.supported.includes(profile)) {
        throw new ValidationError(`Unsupported routing profile '${profile}'. Supported profiles: ${config.profiles.supported.join(', ')}`);
    }

    // Filter by type if specified
    const filterType = payload.filterType ? String(payload.filterType).trim().toLowerCase() : null;

    return {
        origin,
        facilities: validatedFacilities,
        profile,
        filterType,
        includeGeometry: Boolean(payload.includeGeometry),
        enableFallback: payload.enableFallback !== false // Defaults to true
    };
}

module.exports = {
    validateCoordinates,
    validateFacility,
    validateRoutingRequest
};
