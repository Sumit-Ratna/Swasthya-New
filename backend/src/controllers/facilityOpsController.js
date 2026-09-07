const supabaseService = require('../services/supabaseService');

class FacilityOpsController {
    async getOverview(req, res) {
        try {
            const facilityId = req.params.facilityId || req.query.facilityId || '22222222-2222-2222-2222-222222222222';
            const data = await supabaseService.getFacilityOpsData(facilityId);
            return res.json(data);
        } catch (error) {
            console.error('Facility Ops Overview Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    async updateBeds(req, res) {
        try {
            const { facilityId, category, occupiedDelta } = req.body;
            const result = await supabaseService.updateFacilityBedCount(facilityId, category, occupiedDelta);
            return res.json({ success: true, result });
        } catch (error) {
            console.error('Facility Ops Bed Update Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    async admitPatient(req, res) {
        try {
            const { referralId, bedCategory } = req.body;
            const result = await supabaseService.admitReferralPatient(referralId, bedCategory);
            return res.json({ success: true, admission: result });
        } catch (error) {
            console.error('Facility Ops Admit Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new FacilityOpsController();
