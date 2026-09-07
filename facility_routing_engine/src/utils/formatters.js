/**
 * Utility formatters for distance, duration, and metrics.
 */

/**
 * Normalizes distance metrics.
 * @param {number} meters Distance in meters
 * @returns {{ meters: number, km: number, formatted: string }}
 */
function formatDistance(meters) {
    if (meters === null || meters === undefined || isNaN(meters)) {
        return { meters: 0, km: 0, formatted: '0 km' };
    }
    const safeMeters = Math.max(0, Math.round(meters));
    const km = Number((safeMeters / 1000).toFixed(2));
    const formatted = km < 1 ? `${safeMeters} m` : `${km} km`;

    return {
        meters: safeMeters,
        km,
        formatted
    };
}

/**
 * Normalizes duration metrics.
 * @param {number} seconds Duration in seconds
 * @returns {{ seconds: number, minutes: number, formatted: string }}
 */
function formatDuration(seconds) {
    if (seconds === null || seconds === undefined || isNaN(seconds)) {
        return { seconds: 0, minutes: 0, formatted: '0 min' };
    }
    const safeSeconds = Math.max(0, Math.round(seconds));
    const minutes = Math.max(1, Math.round(safeSeconds / 60));

    let formatted = '';
    if (safeSeconds < 60) {
        formatted = '< 1 min';
    } else if (minutes < 60) {
        formatted = `${minutes} min`;
    } else {
        const hrs = Math.floor(minutes / 60);
        const remainingMins = minutes % 60;
        formatted = remainingMins > 0 ? `${hrs} hr ${remainingMins} min` : `${hrs} hr`;
    }

    return {
        seconds: safeSeconds,
        minutes,
        formatted
    };
}

module.exports = {
    formatDistance,
    formatDuration
};
