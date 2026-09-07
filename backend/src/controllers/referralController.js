const supabase = require('../config/supabaseClient');
const {
    REFERRAL_STATES,
    transitionReferral,
    isValidTransition
} = require('../services/referralStateMachine');
const { normalizeRole } = require('../middleware/auth');

/**
 * Get all referrals (filtered by role / query parameters)
 */
exports.getAllReferrals = async (req, res, next) => {
    try {
        const { status, urgency, facility_id, patient_id } = req.query;

        let query = supabase
            .from('referrals')
            .select(`
                *,
                patient:patients!referrals_patient_id_fkey(id, full_name, phone, gender, date_of_birth),
                facilities:facilities!referrals_receiving_facility_id_fkey(id, name, tier, district, address),
                doctors:doctors!referrals_assigned_doctor_id_fkey(id, name, specialty_name)
            `)
            .order('created_at', { ascending: false });

        if (status) query = query.eq('status', status);
        if (urgency) query = query.eq('urgency', urgency);
        if (facility_id) query = query.eq('receiving_facility_id', facility_id);
        if (patient_id) query = query.eq('patient_id', patient_id);

        const { data, error } = await query;

        if (error) {
            return res.status(500).json({
                success: false,
                error: `Failed to fetch referrals: ${error.message}`,
                code: 'DB_ERROR'
            });
        }

        return res.json({
            success: true,
            count: data ? data.length : 0,
            data: data || []
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Create a new referral (Canonical entry point: TRIAGED)
 */
exports.createReferral = async (req, res, next) => {
    try {
        const {
            patient_id,
            assessment_id,
            receiving_facility_id,
            risk_level = 'MODERATE',
            urgency = 'ROUTINE',
            specialty_required = 'GENERAL_MEDICINE',
            primary_complaint,
            clinical_summary,
            reason_for_referral,
            appointment_slot_time
        } = req.body;

        if (!patient_id) {
            return res.status(400).json({
                success: false,
                error: 'patient_id is required to create a referral',
                code: 'VALIDATION_ERROR'
            });
        }

        if (!primary_complaint) {
            return res.status(400).json({
                success: false,
                error: 'primary_complaint is required to create a referral',
                code: 'VALIDATION_ERROR'
            });
        }

        const referring_user_id = req.user?.id || null;
        const referringRole = req.user?.role || 'HEALTH_WORKER';

        // 1. Initial State is ALWAYS TRIAGED per architectural spec
        let initialStatus = REFERRAL_STATES.TRIAGED;

        // If receiving facility is already selected at creation, target state is FACILITY_SELECTED
        if (receiving_facility_id) {
            initialStatus = urgency === 'EMERGENCY' || urgency === 'CRITICAL'
                ? REFERRAL_STATES.URGENT_ESCALATION
                : REFERRAL_STATES.FACILITY_SELECTED;
        }

        const referralPayload = {
            patient_id,
            assessment_id: assessment_id || null,
            referring_user_id,
            receiving_facility_id: receiving_facility_id || null,
            status: initialStatus,
            risk_level,
            urgency,
            specialty_required,
            primary_complaint,
            clinical_summary: clinical_summary || '',
            reason_for_referral: reason_for_referral || '',
            appointment_slot_time: appointment_slot_time || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data: referral, error } = await supabase
            .from('referrals')
            .insert([referralPayload])
            .select(`
                *,
                patient:patients!referrals_patient_id_fkey(id, full_name, phone),
                facilities:facilities!referrals_receiving_facility_id_fkey(id, name, tier, district)
            `)
            .single();

        if (error) {
            return res.status(500).json({
                success: false,
                error: `Database error creating referral: ${error.message}`,
                code: 'DB_INSERT_ERROR'
            });
        }

        // Record creation event in referral_events audit table
        await supabase.from('referral_events').insert([{
            referral_id: referral.id,
            from_status: 'INIT',
            to_status: initialStatus,
            actor_user_id: referring_user_id,
            actor_role: normalizeRole(referringRole),
            reason: `Referral initiated at ${initialStatus}`,
            created_at: new Date().toISOString()
        }]);

        return res.status(201).json({
            success: true,
            message: 'Referral created successfully',
            data: referral
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Get detailed referral info, immutable timeline, prescriptions & assessments
 */
exports.getReferralDetails = async (req, res, next) => {
    try {
        const { id } = req.params;

        // 1. Fetch Referral Record
        const { data: referral, error: refErr } = await supabase
            .from('referrals')
            .select(`
                *,
                patient:patients!referrals_patient_id_fkey(id, full_name, phone, gender, date_of_birth),
                facilities:facilities!referrals_receiving_facility_id_fkey(id, name, tier, district, address, latitude, longitude),
                doctors:doctors!referrals_assigned_doctor_id_fkey(id, name, specialty_name)
            `)
            .eq('id', id)
            .single();

        if (refErr || !referral) {
            return res.status(404).json({
                success: false,
                error: `Referral not found with ID: ${id}`,
                code: 'REFERRAL_NOT_FOUND'
            });
        }

        // 2. Fetch Timeline Events
        const { data: timeline } = await supabase
            .from('referral_events')
            .select('*')
            .eq('referral_id', id)
            .order('created_at', { ascending: true });

        // 3. Fetch Linked Prescriptions
        const { data: prescriptions } = await supabase
            .from('prescriptions')
            .select('*')
            .eq('referral_id', id)
            .order('created_at', { ascending: false });

        // 4. Fetch Linked Assessment if present
        let assessment = null;
        if (referral.assessment_id) {
            const { data: assessData } = await supabase
                .from('assessments')
                .select('*')
                .eq('id', referral.assessment_id)
                .maybeSingle();
            assessment = assessData;
        }

        return res.json({
            success: true,
            data: {
                referral,
                timeline: timeline || [],
                prescriptions: prescriptions || [],
                assessment: assessment || null
            }
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Get all referrals for a specific patient
 */
exports.getPatientReferrals = async (req, res, next) => {
    try {
        const patientId = req.params.patient_id || req.user?.id;

        const { data, error } = await supabase
            .from('referrals')
            .select(`
                *,
                facilities:facilities!referrals_receiving_facility_id_fkey(id, name, tier, district, address),
                doctors:doctors!referrals_assigned_doctor_id_fkey(id, name, specialty_name)
            `)
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({
                success: false,
                error: `Failed to fetch patient referrals: ${error.message}`,
                code: 'DB_ERROR'
            });
        }

        return res.json({
            success: true,
            count: data ? data.length : 0,
            data: data || []
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Get all referrals routed to a specific facility
 */
exports.getFacilityReferrals = async (req, res, next) => {
    try {
        const { facility_id } = req.params;
        const { status } = req.query;

        let query = supabase
            .from('referrals')
            .select(`
                *,
                patient:patients!referrals_patient_id_fkey(id, full_name, phone, gender, date_of_birth),
                doctors:doctors!referrals_assigned_doctor_id_fkey(id, name, specialty_name)
            `)
            .eq('receiving_facility_id', facility_id)
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) {
            return res.status(500).json({
                success: false,
                error: `Failed to fetch facility referrals: ${error.message}`,
                code: 'DB_ERROR'
            });
        }

        return res.json({
            success: true,
            count: data ? data.length : 0,
            data: data || []
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Transition referral state via Canonical State Machine
 */
exports.updateStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { to_status, reason, payload } = req.body;

        if (!to_status) {
            return res.status(400).json({
                success: false,
                error: "to_status is required for state transition",
                code: "VALIDATION_ERROR"
            });
        }

        const actorUserId = req.user?.id || null;
        const actorRole = req.user?.role || 'DOCTOR';

        const result = await transitionReferral({
            referralId: id,
            toStatus: to_status,
            actorUserId,
            actorRole,
            reason: reason || `Updated by ${actorRole}`,
            payload: payload || {}
        });

        return res.json({
            success: true,
            message: `Referral status successfully updated to ${to_status}`,
            data: result.referral,
            event: result.event
        });
    } catch (err) {
        return res.status(400).json({
            success: false,
            error: err.message,
            code: 'INVALID_TRANSITION'
        });
    }
};

/**
 * Assign Doctor internally at Receiving Facility (Semantics: only allowed after PATIENT_REACHED)
 */
exports.assignDoctor = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { doctor_id, reason } = req.body;

        if (!doctor_id) {
            return res.status(400).json({
                success: false,
                error: "doctor_id is required to assign doctor",
                code: "VALIDATION_ERROR"
            });
        }

        // Verify doctor exists
        const { data: doctor, error: docErr } = await supabase
            .from('doctors')
            .select('id, name, specialty_name, facility_id')
            .eq('id', doctor_id)
            .single();

        if (docErr || !doctor) {
            return res.status(404).json({
                success: false,
                error: `Doctor not found with ID: ${doctor_id}`,
                code: "DOCTOR_NOT_FOUND"
            });
        }

        const actorUserId = req.user?.id || null;
        const actorRole = req.user?.role || 'FACILITY_STAFF';

        // Check if referral has reached or transition to DOCTOR_ASSIGNED
        const result = await transitionReferral({
            referralId: id,
            toStatus: REFERRAL_STATES.DOCTOR_ASSIGNED,
            actorUserId,
            actorRole,
            reason: reason || `Doctor ${doctor.name} (${doctor.specialty_name}) assigned`,
            payload: {
                assigned_doctor_id: doctor_id
            }
        });

        return res.json({
            success: true,
            message: `Doctor ${doctor.name} assigned successfully`,
            data: result.referral
        });
    } catch (err) {
        return res.status(400).json({
            success: false,
            error: err.message,
            code: 'ASSIGNMENT_ERROR'
        });
    }
};

/**
 * Emergency Reroute Referral to a new facility
 */
exports.rerouteReferral = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { new_facility_id, reason } = req.body;

        if (!new_facility_id) {
            return res.status(400).json({
                success: false,
                error: "new_facility_id is required to reroute referral",
                code: "VALIDATION_ERROR"
            });
        }

        const actorUserId = req.user?.id || null;
        const actorRole = req.user?.role || 'HEALTH_WORKER';

        // 1. Move to REROUTING_REQUIRED
        await transitionReferral({
            referralId: id,
            toStatus: REFERRAL_STATES.REROUTING_REQUIRED,
            actorUserId,
            actorRole,
            reason: reason || 'Facility capacity overloaded / specialty unavailable'
        });

        // 2. Select new facility
        const result = await transitionReferral({
            referralId: id,
            toStatus: REFERRAL_STATES.FACILITY_SELECTED,
            actorUserId,
            actorRole,
            reason: `Rerouted to facility ID: ${new_facility_id}`,
            payload: {
                receiving_facility_id: new_facility_id
            }
        });

        return res.json({
            success: true,
            message: 'Referral rerouted successfully to new facility',
            data: result.referral
        });
    } catch (err) {
        return res.status(400).json({
            success: false,
            error: err.message,
            code: 'REROUTE_ERROR'
        });
    }
};

/**
 * Confirm appointment slot booking
 */
exports.bookAppointmentSlot = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { slot_time, slot_token } = req.body;

        const actorUserId = req.user?.id || null;
        const actorRole = req.user?.role || 'FACILITY_STAFF';

        const token = slot_token || `Token #${Math.floor(10 + Math.random() * 90)}`;

        const result = await transitionReferral({
            referralId: id,
            toStatus: REFERRAL_STATES.APPOINTMENT_BOOKED,
            actorUserId,
            actorRole,
            reason: `Appointment confirmed for slot ${slot_time || 'scheduled time'}`,
            payload: {
                appointment_slot_time: slot_time || new Date().toISOString(),
                slot_token: token
            }
        });

        return res.json({
            success: true,
            message: 'Appointment slot booked and confirmed',
            data: result.referral
        });
    } catch (err) {
        return res.status(400).json({
            success: false,
            error: err.message,
            code: 'BOOKING_ERROR'
        });
    }
};

/**
 * Complete doctor consultation & attach clinical diagnosis
 */
exports.completeConsultation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { clinical_summary, diagnosis, requires_diagnostics = false, prescription_items } = req.body;

        const actorUserId = req.user?.id || null;
        const actorRole = req.user?.role || 'DOCTOR';

        // 1. Move to CONSULTATION_COMPLETED
        await transitionReferral({
            referralId: id,
            toStatus: REFERRAL_STATES.CONSULTATION_COMPLETED,
            actorUserId,
            actorRole,
            reason: diagnosis ? `Diagnosis: ${diagnosis}` : 'Doctor consultation completed',
            payload: {
                clinical_summary: clinical_summary || diagnosis || 'Consultation completed'
            }
        });

        // 2. If diagnostics required, move to DIAGNOSTICS_PENDING, otherwise TREATMENT_COMPLETED -> FOLLOW_UP_PENDING
        let nextStatus = requires_diagnostics ? REFERRAL_STATES.DIAGNOSTICS_PENDING : REFERRAL_STATES.TREATMENT_COMPLETED;

        const finalResult = await transitionReferral({
            referralId: id,
            toStatus: nextStatus,
            actorUserId,
            actorRole,
            reason: requires_diagnostics ? 'Diagnostic lab tests ordered' : 'Treatment plan prescribed'
        });

        return res.json({
            success: true,
            message: `Consultation completed and status moved to ${nextStatus}`,
            data: finalResult.referral
        });
    } catch (err) {
        return res.status(400).json({
            success: false,
            error: err.message,
            code: 'CONSULTATION_ERROR'
        });
    }
};
