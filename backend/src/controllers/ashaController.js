const supabaseService = require('../services/supabaseService');

class AshaController {
    async getOverview(req, res) {
        try {
            const workerId = req.user?.id || req.query.workerId;
            const district = req.query.district || 'Pune';
            const data = await supabaseService.getAshaDashboardData(workerId, district);
            return res.json(data);
        } catch (error) {
            console.error('ASHA Overview Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    async registerBeneficiary(req, res) {
        try {
            const result = await supabaseService.recordAshaBeneficiary(req.body);
            return res.status(201).json({ success: true, beneficiary: result });
        } catch (error) {
            console.error('ASHA Beneficiary Register Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    async submitVitals(req, res) {
        try {
            const result = await supabaseService.recordAshaVitals(req.body);
            return res.status(201).json({ success: true, assessment: result });
        } catch (error) {
            console.error('ASHA Vitals Error:', error);
            return res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new AshaController();
