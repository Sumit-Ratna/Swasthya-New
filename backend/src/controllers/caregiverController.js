const proxyAuthorizationService = require('../services/proxyAuthorizationService');
const supabase = require('../config/supabaseClient');
const supabaseService = require('../services/supabaseService');

class CaregiverController {
    /**
     * Get overview dashboard for caregiver
     */
    async getOverview(req, res, next) {
        try {
            const caregiverId = req.user?.id || req.query.caregiverId;
            const linkedPatients = await proxyAuthorizationService.getCaregiverLinkedPatients(caregiverId);

            return res.json({
                success: true,
                data: {
                    caregiver_id: caregiverId,
                    linked_patient_count: linkedPatients.length,
                    patients: linkedPatients
                }
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Get all active patients linked to current caregiver
     */
    async getLinkedPatients(req, res, next) {
        try {
            const caregiverId = req.user?.id;
            const data = await proxyAuthorizationService.getCaregiverLinkedPatients(caregiverId);

            return res.json({
                success: true,
                count: data ? data.length : 0,
                data: data || []
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Link patient (grant proxy authorization)
     */
    async linkPatient(req, res, next) {
        try {
            const caregiverId = req.body.caregiver_user_id || req.user?.id;
            const {
                patient_phone,
                patient_id,
                relationship_type = 'FAMILY_MEMBER',
                permission_scope = 'REFERRAL_STATUS'
            } = req.body;

            let targetPatientId = patient_id;

            if (!targetPatientId && patient_phone) {
                const normalizedPhone = String(patient_phone).replace(/\D/g, '').slice(-10);
                const { data: user } = await supabase
                    .from('users')
                    .select('id')
                    .eq('phone', normalizedPhone)
                    .maybeSingle();

                if (!user) {
                    return res.status(404).json({
                        success: false,
                        error: 'Patient with this phone number not found',
                        code: 'PATIENT_NOT_FOUND'
                    });
                }
                targetPatientId = user.id;
            }

            if (!targetPatientId) {
                return res.status(400).json({
                    success: false,
                    error: 'patient_id or patient_phone is required to link caregiver',
                    code: 'VALIDATION_ERROR'
                });
            }

            const data = await proxyAuthorizationService.grantProxyAccess({
                patientId: targetPatientId,
                caregiverUserId: caregiverId,
                relationshipType: relationship_type,
                permissionScope: permission_scope,
                requestingUser: req.user
            });

            return res.status(201).json({
                success: true,
                message: 'Caregiver proxy relationship established successfully',
                data
            });
        } catch (error) {
            const statusCode = error.status || (error.code === 'UNAUTHORIZED_GRANT' ? 403 : 400);
            return res.status(statusCode).json({
                success: false,
                error: error.message,
                code: error.code || 'PROXY_LINK_ERROR'
            });
        }
    }

    /**
     * Revoke proxy access for a patient
     */
    async revokePatientLink(req, res, next) {
        try {
            const { id } = req.params; // relationship id or patient_id
            const caregiverId = req.user?.id;

            const result = await proxyAuthorizationService.revokeProxyAccess({
                relationshipId: id.includes('-') && id.length > 20 ? id : null,
                patientId: id.includes('-') && id.length > 20 ? null : id,
                caregiverUserId: caregiverId,
                requestingUser: req.user,
                reason: req.body?.reason || 'Revoked by user request'
            });

            return res.json({
                success: true,
                message: result.message,
                data: result
            });
        } catch (error) {
            const statusCode = error.status || (error.code === 'FORBIDDEN' ? 403 : (error.code === 'NOT_FOUND' ? 404 : 400));
            return res.status(statusCode).json({
                success: false,
                error: error.message,
                code: error.code || 'REVOCATION_ERROR'
            });
        }
    }

    /**
     * Get patient referrals via proxy (Enforces REFERRAL_STATUS scope)
     */
    async getPatientReferrals(req, res, next) {
        try {
            const { patientId } = req.params;
            const caregiverId = req.user?.id;

            const result = await proxyAuthorizationService.getPatientDataProxy({
                caregiverUserId: caregiverId,
                patientId,
                dataType: 'REFERRALS'
            });

            return res.json({
                success: true,
                count: result.records.length,
                data: result.records,
                scope: result.scope_applied
            });
        } catch (error) {
            const statusCode = error.status || (error.code === 'PROXY_REVOKED' || error.code === 'PROXY_NOT_LINKED' || error.code === 'SCOPE_UNAUTHORIZED' ? 403 : 400);
            return res.status(statusCode).json({
                success: false,
                error: error.message,
                code: error.code || 'PROXY_ACCESS_ERROR'
            });
        }
    }

    /**
     * Get patient appointments via proxy (Enforces APPOINTMENTS scope)
     */
    async getPatientAppointments(req, res, next) {
        try {
            const { patientId } = req.params;
            const caregiverId = req.user?.id;

            const result = await proxyAuthorizationService.getPatientDataProxy({
                caregiverUserId: caregiverId,
                patientId,
                dataType: 'APPOINTMENTS'
            });

            return res.json({
                success: true,
                count: result.records.length,
                data: result.records,
                scope: result.scope_applied
            });
        } catch (error) {
            const statusCode = error.status || (error.code === 'PROXY_REVOKED' || error.code === 'PROXY_NOT_LINKED' || error.code === 'SCOPE_UNAUTHORIZED' ? 403 : 400);
            return res.status(statusCode).json({
                success: false,
                error: error.message,
                code: error.code || 'PROXY_ACCESS_ERROR'
            });
        }
    }

    /**
     * Get patient documents/lab reports via proxy (Enforces SELECTED_RECORDS / FULL_ACCESS scope)
     */
    async getPatientDocuments(req, res, next) {
        try {
            const { patientId } = req.params;
            const caregiverId = req.user?.id;

            const result = await proxyAuthorizationService.getPatientDataProxy({
                caregiverUserId: caregiverId,
                patientId,
                dataType: 'DOCUMENTS'
            });

            return res.json({
                success: true,
                count: result.records.length,
                data: result.records,
                scope: result.scope_applied
            });
        } catch (error) {
            const statusCode = error.status || (error.code === 'PROXY_REVOKED' || error.code === 'PROXY_NOT_LINKED' || error.code === 'SCOPE_UNAUTHORIZED' ? 403 : 400);
            return res.status(statusCode).json({
                success: false,
                error: error.message,
                code: error.code || 'PROXY_ACCESS_ERROR'
            });
        }
    }

    /**
     * Trigger SOS alert on behalf of linked patient
     */
    async triggerSOS(req, res, next) {
        try {
            const caregiverId = req.user?.id;
            const { patient_id } = req.body;

            if (patient_id) {
                // Verify relationship
                await proxyAuthorizationService.validateCaregiverAccess({
                    caregiverUserId: caregiverId,
                    patientId: patient_id,
                    requiredScope: 'REFERRAL_STATUS'
                });
            }

            const result = await supabaseService.triggerCaregiverSOS(req.body);
            return res.status(200).json({
                success: true,
                message: "Emergency SOS broadcast sent to emergency facilities and health workers",
                alert: result
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new CaregiverController();
