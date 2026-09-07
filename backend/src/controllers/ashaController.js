const supabaseService = require('../services/supabaseService');
const offlineSyncService = require('../services/offlineSyncService');

class AshaController {
    /**
     * Get ASHA worker overview dashboard
     */
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

    /**
     * Register a new beneficiary in the community
     */
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

    /**
     * Submit vitals & triage assessment
     */
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
     * Batch Sync Offline Queue from ASHA mobile device (Canonical contract)
     */
    async syncOfflineQueue(req, res, next) {
        try {
            const deviceId = req.body.device_id || req.headers['x-device-id'] || 'ASHA-DEVICE-DEFAULT';
            const operations = req.body.operations || req.body.items || [];

            const syncReport = await offlineSyncService.processSyncBatch({
                deviceId,
                workerUser: req.user,
                operations
            });

            return res.status(200).json({
                success: true,
                message: `Processed ${syncReport.total_operations} offline operations`,
                data: syncReport
            });
        } catch (error) {
            const status = error.status || (error.code === 'UNAUTHORIZED_SYNC' ? 403 : 400);
            return res.status(status).json({
                success: false,
                error: error.message,
                code: error.code || 'SYNC_ERROR'
            });
        }
    }

    /**
     * Download cached facility directory for offline reference (with live_verified: false)
     */
    async getOfflineDirectory(req, res, next) {
        try {
            const district = req.query.district || req.user?.jurisdiction_district || 'Pune';
            const directory = await offlineSyncService.getOfflineFacilityDirectory(district);

            return res.json({
                success: true,
                count: directory.length,
                district,
                data: directory
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AshaController();
