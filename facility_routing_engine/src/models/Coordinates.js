/**
 * Coordinates Value Object
 */
class Coordinates {
    constructor(latitude, longitude) {
        this.latitude = Number(latitude);
        this.longitude = Number(longitude);
    }

    /**
     * OSRM requires coordinates in [longitude, latitude] format
     */
    toOsrmString() {
        return `${this.longitude},${this.latitude}`;
    }

    /**
     * Normalized key for caching
     */
    toCacheKey(precision = 5) {
        return `${this.latitude.toFixed(precision)},${this.longitude.toFixed(precision)}`;
    }

    toJSON() {
        return {
            latitude: this.latitude,
            longitude: this.longitude
        };
    }
}

module.exports = Coordinates;
