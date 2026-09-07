const supabaseService = require('../services/supabaseService');
const supabase = require('../config/supabaseClient');

class AshaController {
    async getOverview(req, res, next) {
        try {
            const workerId = req.user?.id || req.query.workerId;
            const district = req.query.district || 'Pune';
            const data = await supabaseService.getAshaDashboardData(workerId, district);
            return res.json({
                success: true,
                data
            });
        } catch (error) {
            next(error);
        }
    }

    async registerBeneficiary(req, res, next) {
        try {
            const workerId = req.user?.id || null;
            const result = await supabaseService.recordAshaBeneficiary(req.body, workerId);
            return res.status(201).json({
                success: true,
                message: "Beneficiary registered successfully",
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async submitVitals(req, res, next) {
        try {
            const result = await supabaseService.recordAshaVitals(req.body);
            return res.status(201).json({
                success: true,
                message: "Vitals recorded and triage risk score generated",
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Batch Sync Offline Queue from ASHA mobile device
     */
    async syncOfflineQueue(req, res, next) {
        try {
            const { items = [] } = req.body;
            const syncedResults = [];
            const errors = [];

            for (const item of items) {
                try {
                    if (item.type === 'BENEFICIARY') {
                        const ben = await supabaseService.recordAshaBeneficiary(item.payload);
                        syncedResults.push({ localId: item.localId, serverId: ben.id, status: 'SYNCED' });
                    } else if (item.type === 'VITALS' || item.type === 'ASSESSMENT') {
                        const vitals = await supabaseService.recordAshaVitals(item.payload);
                        syncedResults.push({ localId: item.localId, serverId: vitals.id, status: 'SYNCED' });
                    }
                } catch (itemErr) {
                    errors.push({ localId: item.localId, error: itemErr.message });
                }
            }

            return res.json({
                success: true,
                message: `Processed ${items.length} offline items`,
                syncedCount: syncedResults.length,
                syncedResults,
                errors
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AshaController();
