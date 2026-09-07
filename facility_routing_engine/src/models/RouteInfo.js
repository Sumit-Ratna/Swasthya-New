const { formatDistance, formatDuration } = require('../utils/formatters');

/**
 * Route Information Model
 * Standardized across OSRM responses and Haversine fallbacks.
 */
class RouteInfo {
    constructor({
        distanceMeters,
        durationSeconds,
        distanceSource = 'OSRM',
        status = 'SUCCESS',
        geometry = null,
        profile = 'driving',
        cached = false,
        error = null
    }) {
        const formattedDist = formatDistance(distanceMeters);
        const formattedDur = formatDuration(durationSeconds);

        this.distanceMeters = formattedDist.meters;
        this.distanceKm = formattedDist.km;
        this.distanceFormatted = formattedDist.formatted;

        this.durationSeconds = formattedDur.seconds;
        this.durationMinutes = formattedDur.minutes;
        this.durationFormatted = formattedDur.formatted;

        this.distanceSource = distanceSource; // 'OSRM' | 'HAVERSINE_FALLBACK'
        this.status = status;                 // 'SUCCESS' | 'ROUTING_FAILED' | 'FALLBACK_USED'
        this.profile = profile;
        this.cached = Boolean(cached);
        this.geometry = geometry;
        this.error = error;
    }

    toJSON() {
        const out = {
            distanceMeters: this.distanceMeters,
            distanceKm: this.distanceKm,
            distanceFormatted: this.distanceFormatted,
            durationSeconds: this.durationSeconds,
            durationMinutes: this.durationMinutes,
            durationFormatted: this.durationFormatted,
            distanceSource: this.distanceSource,
            status: this.status,
            profile: this.profile,
            cached: this.cached
        };

        if (this.geometry) {
            out.geometry = this.geometry;
        }
        if (this.error) {
            out.error = this.error;
        }

        return out;
    }
}

module.exports = RouteInfo;
