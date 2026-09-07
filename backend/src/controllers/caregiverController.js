const supabaseService = require('../services/supabaseService');
const supabase = require('../config/supabaseClient');

class CaregiverController {
    async getOverview(req, res, next) {
        try {
            const caregiverId = req.user?.id || req.query.caregiverId;
            const data = await supabaseService.getCaregiverDashboardData(caregiverId);
            return res.json({
                success: true,
                data
            });
        } catch (error) {
            next(error);
        }
    }

    async getLinkedPatients(req, res, next) {
        try {
            const caregiverId = req.user?.id;
            const { data, error } = await supabase
                .from('caregiver_relationships')
                .select(`
                    id,
                    relationship_type,
                    permission_scope,
                    status,
                    created_at,
                    patient:users!caregiver_relationships_patient_id_fkey(id, name, phone, gender, dob, blood_group, emergency_contact)
                `)
                .eq('caregiver_user_id', caregiverId)
                .eq('status', 'ACTIVE');

            if (error) {
                return res.status(500).json({ success: false, error: error.message });
            }

            return res.json({
                success: true,
                count: data?.length || 0,
                data: data || []
            });
        } catch (error) {
            next(error);
        }
    }

    async linkPatient(req, res, next) {
        try {
            const caregiverId = req.user?.id;
            const { patient_phone, patient_id, relationship_type = 'Family Member', permission_scope = 'FULL_ACCESS' } = req.body;

            let targetPatientId = patient_id;

            if (!targetPatientId && patient_phone) {
                const { data: user } = await supabase
                    .from('users')
                    .select('id')
                    .eq('phone', patient_phone)
                    .maybeSingle();

                if (!user) {
                    return res.status(404).json({ success: false, error: 'Patient with this phone not found' });
                }
                targetPatientId = user.id;
            }

            if (!targetPatientId) {
                return res.status(400).json({ success: false, error: 'patient_id or patient_phone is required' });
            }

            const { data, error } = await supabase
                .from('caregiver_relationships')
                .upsert({
                    caregiver_user_id: caregiverId,
                    patient_id: targetPatientId,
                    relationship_type,
                    permission_scope,
                    status: 'ACTIVE',
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                return res.status(500).json({ success: false, error: error.message });
            }

            return res.status(201).json({
                success: true,
                message: 'Caregiver relationship established successfully',
                data
            });
        } catch (error) {
            next(error);
        }
    }

    async triggerSOS(req, res, next) {
        try {
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
