const supabaseService = require('../services/supabaseService');

class CaregiverController {
    async getOverview(req, res) {
        try {
            const caregiverId = req.user?.id || req.query.caregiverId;
            const data = await supabaseService.getCaregiverDashboardData(caregiverId);
            return res.json(data);
        } catch (error) {
            console.error('Caregiver Overview Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    async triggerSOS(req, res) {
        try {
            const result = await supabaseService.triggerCaregiverSOS(req.body);
            return res.status(200).json({ success: true, alert: result });
        } catch (error) {
            console.error('Caregiver SOS Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new CaregiverController();
