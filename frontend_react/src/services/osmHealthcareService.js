/**
 * OpenStreetMap Healthcare POI Service
 * 
 * Fetches real healthcare facilities from OpenStreetMap via Overpass API.
 * Calculates exact Haversine distance from user's GPS coordinates.
 * Supports local offline caching and offline retrieval.
 * NO AI-generated data, NO paid APIs, NO hardcoded mock hospitals.
 */

const OVERPASS_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];

const OFFLINE_CACHE_KEY_PREFIX = 'swasthya_osm_healthcare_cache';

/**
 * Calculate Haversine distance between two GPS coordinates in meters
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371e3; // Earth's radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in meters
}

/**
 * Format distance in user-friendly representation (e.g., "350 m", "1.2 km")
 */
export function formatDistance(meters) {
    if (meters === null || meters === undefined || isNaN(meters)) return 'Distance unavailable';
    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Build human-readable address from OpenStreetMap tags
 */
export function formatOsmAddress(tags = {}) {
    const parts = [];
    if (tags['addr:housenumber']) parts.push(tags['addr:housenumber']);
    if (tags['addr:street']) parts.push(tags['addr:street']);
    if (tags['addr:suburb'] || tags['addr:neighbourhood']) parts.push(tags['addr:suburb'] || tags['addr:neighbourhood']);
    if (tags['addr:district'] || tags['addr:subdistrict']) parts.push(tags['addr:district'] || tags['addr:subdistrict']);
    if (tags['addr:city'] || tags['addr:town'] || tags['addr:village']) parts.push(tags['addr:city'] || tags['addr:town'] || tags['addr:village']);
    if (tags['addr:postcode']) parts.push(tags['addr:postcode']);
    if (tags['addr:state']) parts.push(tags['addr:state']);

    if (parts.length > 0) {
        return parts.join(', ');
    }

    if (tags['operator']) {
        return `Managed by ${tags['operator']}`;
    }

    return 'Address not specified in OpenStreetMap';
}

/**
 * Normalize OpenStreetMap healthcare facility type
 */
export function normalizeOsmType(tags = {}) {
    const amenity = tags.amenity || '';
    const healthcare = tags.healthcare || '';
    const name = (tags.name || '').toLowerCase();

    if (amenity === 'hospital' || healthcare === 'hospital' || name.includes('hospital') || name.includes('civil') || name.includes('medical college')) {
        return {
            key: 'hospital',
            label: 'Hospital',
            badgeBg: '#fee2e2',
            badgeColor: '#dc2626',
            pinColor: '#dc2626'
        };
    }

    if (amenity === 'clinic' || healthcare === 'clinic' || healthcare === 'centre' || name.includes('phc') || name.includes('chc') || name.includes('health centre') || name.includes('clinic')) {
        return {
            key: 'clinic',
            label: 'Clinic / Health Centre',
            badgeBg: '#ccfbf1',
            badgeColor: '#0f766e',
            pinColor: '#0d9488'
        };
    }

    if (amenity === 'pharmacy' || healthcare === 'pharmacy' || name.includes('pharmacy') || name.includes('chemist') || name.includes('medical store')) {
        return {
            key: 'pharmacy',
            label: 'Pharmacy / Chemist',
            badgeBg: '#dcfce7',
            badgeColor: '#16a34a',
            pinColor: '#16a34a'
        };
    }

    if (amenity === 'doctors' || healthcare === 'doctor' || name.includes('dr.') || name.includes('doctor') || name.includes('consultant')) {
        return {
            key: 'doctors',
            label: 'Doctors / Specialist OPD',
            badgeBg: '#ede9fe',
            badgeColor: '#6d28d9',
            pinColor: '#7c3aed'
        };
    }

    return {
        key: 'other',
        label: tags.healthcare ? tags.healthcare.replace(/_/g, ' ') : (tags.amenity ? tags.amenity.replace(/_/g, ' ') : 'Healthcare Facility'),
        badgeBg: '#f1f5f9',
        badgeColor: '#475569',
        pinColor: '#2563eb'
    };
}

/**
 * Fetch real healthcare facilities from OpenStreetMap via Overpass API around user coordinates
 */
export async function fetchNearbyOsmHealthcare(lat, lon, radiusMeters = 8000) {
    if (!lat || !lon) {
        throw new Error('User latitude and longitude are required to find nearby healthcare facilities.');
    }

    // Overpass QL Query for genuine healthcare POIs
    const overpassQuery = `
[out:json][timeout:15];
(
  node["amenity"~"hospital|clinic|doctors|pharmacy"](around:${radiusMeters},${lat},${lon});
  way["amenity"~"hospital|clinic|doctors|pharmacy"](around:${radiusMeters},${lat},${lon});
  node["healthcare"](around:${radiusMeters},${lat},${lon});
  way["healthcare"](around:${radiusMeters},${lat},${lon});
);
out center tags;
`;

    let lastError = null;

    // Try mirrors in sequence
    for (const endpoint of OVERPASS_ENDPOINTS) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 14000);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'Accept': 'application/json'
                },
                body: `data=${encodeURIComponent(overpassQuery)}`,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Overpass HTTP status ${response.status}`);
            }

            const data = await response.json();
            const elements = data.elements || [];

            // Process and transform real OSM elements
            const facilities = elements.map(elem => {
                const elemLat = elem.lat || (elem.center && elem.center.lat);
                const elemLon = elem.lon || (elem.center && elem.center.lon);
                if (!elemLat || !elemLon) return null;

                const tags = elem.tags || {};
                const name = tags.name || tags['name:en'] || tags['name:hi'] || tags['operator'] || (tags.amenity ? `${tags.amenity.toUpperCase()} Facility` : 'Healthcare Centre');
                const typeInfo = normalizeOsmType(tags);
                const distanceMeters = calculateHaversineDistance(lat, lon, elemLat, elemLon);
                const address = formatOsmAddress(tags);
                const isEmergency = tags.emergency === 'yes' || tags['emergency:service'] === 'yes' || typeInfo.key === 'hospital';

                const isGov = 
                    tags.operator_type === 'government' ||
                    tags.operator_type === 'public' ||
                    tags.ownership === 'government' ||
                    tags.ownership === 'public' ||
                    (tags.operator && /government|govt|ministry|zilla|municipal|dhs|esic|aiims|railway|state|public/i.test(tags.operator)) ||
                    /government|govt|civil hospital|district hospital|phc|chc|primary health|community health|sub-centre|sub centre|general hospital|ayushman|rural hospital|aiims|safdarjung|esic|cantonment/i.test(name);

                return {
                    id: `osm_${elem.type}_${elem.id}`,
                    osm_id: elem.id,
                    osm_type: elem.type,
                    name: name,
                    lat: elemLat,
                    lon: elemLon,
                    distanceMeters: distanceMeters,
                    distanceFormatted: formatDistance(distanceMeters),
                    typeKey: typeInfo.key,
                    typeLabel: isGov && typeInfo.key === 'hospital' ? 'Govt. Hospital' : typeInfo.label,
                    is_government: isGov,
                    badgeBg: isGov ? '#e0f2fe' : typeInfo.badgeBg,
                    badgeColor: isGov ? '#0369a1' : typeInfo.badgeColor,
                    pinColor: isGov ? '#0284c7' : typeInfo.pinColor,
                    address: address,
                    emergency_capable: isEmergency,
                    phone: tags.phone || tags['contact:phone'] || tags['phone:emergency'] || null,
                    opening_hours: tags.opening_hours || null,
                    operator: tags.operator || (isGov ? 'Government / Public Health' : null),
                    website: tags.website || tags['contact:website'] || null,
                    wheelchair: tags.wheelchair || null,
                    rawTags: tags,
                    source: 'OpenStreetMap'
                };
            }).filter(Boolean);

            // Sort by distance ascending (nearest first)
            facilities.sort((a, b) => a.distanceMeters - b.distanceMeters);

            // Cache successfully retrieved real OSM POIs locally for offline use
            saveFacilitiesToLocalCache(lat, lon, radiusMeters, facilities);

            return {
                facilities,
                isOffline: false,
                source: 'OpenStreetMap (Live)',
                timestamp: new Date().toISOString()
            };
        } catch (err) {
            console.warn(`Overpass endpoint ${endpoint} failed:`, err.message);
            lastError = err;
        }
    }

    // If all online endpoints fail or user is offline, attempt local storage fallback
    const offlineCached = getFacilitiesFromLocalCache(lat, lon);
    if (offlineCached && offlineCached.facilities && offlineCached.facilities.length > 0) {
        // Re-calculate distances based on current GPS
        const recalculated = offlineCached.facilities.map(f => {
            const dist = calculateHaversineDistance(lat, lon, f.lat, f.lon);
            return {
                ...f,
                distanceMeters: dist,
                distanceFormatted: formatDistance(dist)
            };
        }).sort((a, b) => a.distanceMeters - b.distanceMeters);

        return {
            facilities: recalculated,
            isOffline: true,
            source: `OpenStreetMap (Cached on ${new Date(offlineCached.timestamp).toLocaleDateString()})`,
            timestamp: offlineCached.timestamp
        };
    }

    throw lastError || new Error('Unable to retrieve OpenStreetMap healthcare data. Please check your internet connection.');
}

/**
 * Save real facilities locally for offline access
 */
export function saveFacilitiesToLocalCache(lat, lon, radius, facilities) {
    try {
        const payload = {
            centerLat: lat,
            centerLon: lon,
            radius: radius,
            facilities: facilities,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem(OFFLINE_CACHE_KEY_PREFIX, JSON.stringify(payload));
    } catch (e) {
        console.warn('Failed to save OSM facilities to offline cache:', e);
    }
}

/**
 * Retrieve cached real OSM facilities from local storage
 */
export function getFacilitiesFromLocalCache(lat, lon) {
    try {
        const cachedRaw = localStorage.getItem(OFFLINE_CACHE_KEY_PREFIX);
        if (!cachedRaw) return null;
        const cached = JSON.parse(cachedRaw);
        return cached;
    } catch (e) {
        console.warn('Failed to read offline OSM cache:', e);
        return null;
    }
}
