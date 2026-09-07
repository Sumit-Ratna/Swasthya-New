const facilityRepository = require('../repositories/facilityRepository');

/**
 * Get all facilities with real-time operational status and load
 */
exports.getFacilities = async (req, res, next) => {
    try {
        const { district, tier, emergency_capable } = req.query;

        const filters = {
            district: district || undefined,
            tier: tier || undefined,
            emergency_capable: emergency_capable !== undefined ? (emergency_capable === 'true' || emergency_capable === true) : undefined
        };

        const facilities = await facilityRepository.find(filters);

        const enriched = facilities.map(f => {
            let specialties = f.specialties || [];
            if (!specialties || specialties.length === 0) {
                try {
                    specialties = typeof f.specialties_json === 'string' ? JSON.parse(f.specialties_json) : (f.specialties_json || []);
                } catch (e) {
                    specialties = [];
                }
            }
            return {
                ...f,
                specialties
            };
        });

        return res.json(enriched);
    } catch (err) {
        console.error('[FACILITY] Fetch error:', err);
        return res.status(500).json({
            success: false,
            error: `Failed to fetch facilities: ${err.message}`,
            code: 'DB_ERROR'
        });
    }
};

/**
 * Get single facility
 */
exports.getFacility = async (req, res, next) => {
    try {
        const { id } = req.params;

        const facility = await facilityRepository.findById(id);

        if (!facility) {
            return res.status(404).json({
                success: false,
                error: `Facility not found with ID: ${id}`,
                code: 'FACILITY_NOT_FOUND'
            });
        }

        let doctors = [];
        try {
            doctors = await facilityRepository.getDoctors(id);
        } catch (docErr) {
            console.warn('[FACILITY] Doctor fetch notice:', docErr.message);
        }

        return res.json({ ...facility, doctors });
    } catch (err) {
        console.error('[FACILITY] Fetch detail error:', err);
        return res.status(500).json({
            success: false,
            error: `Failed to fetch facility details: ${err.message}`,
            code: 'DB_ERROR'
        });
    }
};

/**
 * Update facility load / operational status
 */
exports.updateOperationalStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { operational_status, current_load } = req.body;

        const existing = await facilityRepository.findById(id);
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: `Facility not found with ID: ${id}`,
                code: 'FACILITY_NOT_FOUND'
            });
        }

        const updated = await facilityRepository.updateStatus(id, {
            operational_status,
            current_load,
            last_verified_at: new Date().toISOString()
        });

        return res.json({
            message: 'Facility operational status updated',
            facility: updated
        });
    } catch (err) {
        console.error('[FACILITY] Update error:', err);
        return res.status(500).json({
            success: false,
            error: `Failed to update facility status: ${err.message}`,
            code: 'DB_ERROR'
        });
    }
};

/**
 * Get doctors at a facility
 */
exports.getFacilityDoctors = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { specialty } = req.query;

        const doctors = await facilityRepository.getDoctors(id, specialty);
        return res.json(doctors);
    } catch (err) {
        console.error('[FACILITY] Doctors error:', err);
        return res.status(500).json({
            success: false,
            error: `Failed to fetch facility doctors: ${err.message}`,
            code: 'DB_ERROR'
        });
    }
};
