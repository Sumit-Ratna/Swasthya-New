const supabaseService = require('../services/supabaseService');
const supabase = require('../config/supabaseClient');
const { REFERRAL_STATES, transitionReferral } = require('../services/referralStateMachine');

class FacilityOpsController {
    async getOverview(req, res, next) {
        try {
            const facilityId = req.params.facilityId || req.query.facilityId || req.user?.facility_id || '22222222-2222-2222-2222-222222222222';
            const data = await supabaseService.getFacilityOpsData(facilityId);
            return res.json({
                success: true,
                data
            });
        } catch (error) {
            next(error);
        }
    }

    async updateBeds(req, res, next) {
        try {
            const { facilityId, category, occupiedDelta } = req.body;
            const targetFacilityId = facilityId || req.user?.facility_id;
            const result = await supabaseService.updateFacilityBedCount(targetFacilityId, category, occupiedDelta);
            return res.json({
                success: true,
                message: 'Bed occupancy updated successfully',
                result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Admit Patient at facility triage/intake desk (transitions referral to PATIENT_REACHED)
     */
    async admitPatient(req, res, next) {
        try {
            const { referralId, bedCategory } = req.body;
            const actorUserId = req.user?.id || null;
            const actorRole = req.user?.role || 'FACILITY_STAFF';

            // 1. Transition state machine to PATIENT_REACHED
            let transitionResult = null;
            try {
                transitionResult = await transitionReferral({
                    referralId,
                    toStatus: REFERRAL_STATES.PATIENT_REACHED,
                    actorUserId,
                    actorRole,
                    reason: `Patient arrived and admitted (${bedCategory || 'General Ward'})`
                });
            } catch (tErr) {
                console.warn('[FACILITY_OPS] State transition notice:', tErr.message);
            }

            // 2. Perform DB bed admission
            const admission = await supabaseService.admitReferralPatient(referralId, bedCategory);

            return res.json({
                success: true,
                message: 'Patient admitted and arrival recorded in referral lifecycle',
                admission,
                referral: transitionResult?.referral
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new FacilityOpsController();
