const facilityRepository = require('../repositories/facilityRepository');
const {
    recommendFacilities,
    filterEligibleFacilities,
    rankFacilities,
    parseFacilityCapabilities,
    calculateDataFreshness
} = require('../domain/facilityRecommendationEngine');

/**
 * Recommends optimal healthcare facilities based on clinical needs, proximity, capacity & freshness
 * (Facility-centric referral routing; does not route to individual doctors)
 */
exports.recommendFacilities = async (req, res, next) => {
    try {
        const criteria = {
            patient_lat: req.body.patient_lat !== undefined ? req.body.patient_lat : req.query.patient_lat,
            patient_lng: req.body.patient_lng !== undefined ? req.body.patient_lng : req.query.patient_lng,
            specialty: req.body.specialty || req.query.specialty,
            required_capabilities: req.body.required_capabilities || req.query.required_capabilities,
            required_diagnostics: req.body.required_diagnostics || req.query.required_diagnostics,
            urgency: req.body.urgency || req.query.urgency || 'ROUTINE',
            district: req.body.district || req.query.district,
            strict_district: req.body.strict_district === true || req.query.strict_district === 'true',
            max_results: req.body.max_results || req.query.max_results || 3
        };

        const allFacilities = await facilityRepository.listAll();
        const recommendationResult = recommendFacilities(allFacilities, criteria);

        return res.json({
            success: true,
            criteria: {
                specialty: criteria.specialty || 'GENERAL',
                urgency: String(criteria.urgency).toUpperCase(),
                patient_location: (criteria.patient_lat && criteria.patient_lng)
                    ? { lat: Number(criteria.patient_lat), lng: Number(criteria.patient_lng) }
                    : null
            },
            ...recommendationResult
        });
    } catch (err) {
        console.error('[FACILITY_RECOMMENDATION] Error:', err);
        return res.status(500).json({
            success: false,
            error: `Failed to calculate facility recommendations: ${err.message}`,
            code: 'INTERNAL_ERROR'
        });
    }
};

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
            const caps = parseFacilityCapabilities(f);
            const freshness = calculateDataFreshness(f.last_verified_at);
            return {
                ...f,
                specialties: caps.specialties,
                diagnostics: caps.diagnostics,
                capabilities: caps.capabilities,
                freshness
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

        const caps = parseFacilityCapabilities(facility);
        const freshness = calculateDataFreshness(facility.last_verified_at);

        let doctors = [];
        try {
            doctors = await facilityRepository.getDoctors(id);
        } catch (docErr) {
            console.warn('[FACILITY] Doctor fetch notice:', docErr.message);
        }

        return res.json({
            ...facility,
            specialties: caps.specialties,
            diagnostics: caps.diagnostics,
            capabilities: caps.capabilities,
            freshness,
            doctors
        });
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
