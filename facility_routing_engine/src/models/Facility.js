const Coordinates = require('./Coordinates');

/**
 * Facility Model Entity
 */
class Facility {
    constructor({ id, name, latitude, longitude, type = null, address = null, metadata = {} }) {
        this.id = String(id);
        this.name = name || `Facility-${this.id}`;
        this.coordinates = (latitude !== null && longitude !== null) 
            ? new Coordinates(latitude, longitude) 
            : null;
        this.type = type ? String(type).trim().toUpperCase() : 'UNKNOWN';
        this.address = address ? String(address).trim() : null;
        this.metadata = metadata || {};
    }

    hasCoordinates() {
        return this.coordinates !== null && !isNaN(this.coordinates.latitude) && !isNaN(this.coordinates.longitude);
    }

    setCoordinates(latitude, longitude) {
        this.coordinates = new Coordinates(latitude, longitude);
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            latitude: this.coordinates ? this.coordinates.latitude : null,
            longitude: this.coordinates ? this.coordinates.longitude : null,
            type: this.type,
            address: this.address
        };
    }
}

module.exports = Facility;
