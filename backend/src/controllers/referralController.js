const supabase = require('../config/supabaseClient');
const {
    REFERRAL_STATES,
    transitionReferral,
    isValidTransition
} = require('../services/referralStateMachine');
const { normalizeRole } = require('../middleware/auth');
const doctorAssignmentService = require('../services/doctorAssignmentService');
const clinicalCareService = require('../services/clinicalCareService');

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

        // 1. Initial State is ALWAYS strictly TRIAGED per canonical domain workflow
        const initialStatus = REFERRAL_STATES.TRIAGED;

        const referralPayload = {
            patient_id,
            assessment_id: assessment_id || null,
            referring_user_id,
            receiving_facility_id: null,
            status: initialStatus,
            risk_level,
            urgency,
            specialty_required,
            primary_complaint,
            clinical_summary: clinical_summary || '',
            reason_for_referral: reason_for_referral || '',
            appointment_slot_time: null,
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
            reason: reason_for_referral || `Referral initiated in ${initialStatus} state`,
            created_at: new Date().toISOString()
        }]);

        let currentReferral = referral;

        // If receiving facility is provided at creation, transition canonically through state machine
        if (receiving_facility_id) {
            const nextTargetStatus = (urgency === 'EMERGENCY' || urgency === 'CRITICAL')
                ? REFERRAL_STATES.URGENT_ESCALATION
                : REFERRAL_STATES.FACILITY_SELECTED;

            const transitionResult = await transitionReferral({
                referralId: referral.id,
                toStatus: nextTargetStatus,
                actorUserId: referring_user_id,
                actorRole: referringRole,
                reason: `Initial facility assignment (${receiving_facility_id})`,
                payload: {
                    receiving_facility_id,
                    appointment_slot_time: appointment_slot_time || null
                }
            });
            currentReferral = transitionResult.referral;
        }

        return res.status(201).json({
            success: true,
            message: 'Referral created successfully in TRIAGED lifecycle state',
            data: currentReferral
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
        const actorRole = req.user?.role || 'HEALTH_WORKER';

        const result = await transitionReferral({
            referralId: id,
            toStatus: to_status,
            actorUserId,
            actorRole,
            reason: (reason !== undefined && reason !== null) ? reason : '',
            payload: payload || {}
        });

        return res.json({
            success: true,
            message: `Referral status successfully updated to ${to_status}`,
            data: result.referral,
            event: result.event
        });
    } catch (err) {
        const statusCode = err.status || (err.code === 'INVALID_TRANSITION' ? 409 : (err.code === 'ACTOR_UNAUTHORIZED' ? 403 : (err.code === 'REFERRAL_NOT_FOUND' ? 404 : 400)));
        return res.status(statusCode).json({
            success: false,
            error: err.message,
            code: err.code || 'INVALID_TRANSITION'
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

        const result = await doctorAssignmentService.assignDoctorToReferral({
            referralId: id,
            doctorId: doctor_id || null,
            actorUser: req.user,
            reason
        });

        return res.json({
            success: true,
            message: result.message,
            status: result.status,
            rerouted: result.rerouted,
            doctor: result.doctor,
            data: result.referral
        });
    } catch (err) {
        const statusCode = err.status || (err.code === 'PATIENT_NOT_REACHED' ? 409 : (err.code === 'CROSS_FACILITY_ASSIGNMENT_DENIED' ? 400 : 500));
        return res.status(statusCode).json({
            success: false,
            error: err.message,
            code: err.code || 'ASSIGNMENT_ERROR'
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
 * Complete doctor consultation & attach clinical diagnosis & prescriptions
 */
exports.completeConsultation = async (req, res, next) => {
    try {
        const { id } = req.params;
        const {
            clinical_summary,
            diagnosis,
            requires_diagnostics = false,
            diagnostic_tests = [],
            prescription_items = [],
            instructions = '',
            follow_up_days = null
        } = req.body;

        const result = await clinicalCareService.recordConsultation({
            referralId: id,
            doctorUser: req.user,
            clinicalSummary: clinical_summary,
            diagnosis: diagnosis || 'General Consultation',
            requiresDiagnostics: !!requires_diagnostics,
            diagnosticTests: diagnostic_tests,
            prescriptionItems: prescription_items,
            instructions,
            followUpDays: follow_up_days
        });

        return res.json({
            success: true,
            message: result.message,
            status: result.status,
            prescription: result.prescription,
            digital_signature: result.digitalSignature,
            pdf_url: result.pdfUrl,
            data: result.referral
        });
    } catch (err) {
        const statusCode = err.status || (err.code === 'INVALID_STATE' ? 409 : (err.code === 'DOCTOR_UNAUTHORIZED' ? 403 : 400));
        return res.status(statusCode).json({
            success: false,
            error: err.message,
            code: err.code || 'CONSULTATION_ERROR'
        });
    }
};

/**
 * Complete diagnostic lab results
 */
exports.completeDiagnostics = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { lab_results, report_url, notes } = req.body;

        const result = await clinicalCareService.completeDiagnostics({
            referralId: id,
            actorUser: req.user,
            labResults: lab_results,
            reportUrl: report_url,
            notes
        });

        return res.json({
            success: true,
            message: result.message,
            status: result.status,
            data: result.referral
        });
    } catch (err) {
        const statusCode = err.status || (err.code === 'INVALID_STATE' ? 409 : 400);
        return res.status(statusCode).json({
            success: false,
            error: err.message,
            code: err.code || 'DIAGNOSTICS_ERROR'
        });
    }
};

/**
 * Schedule follow-up task
 */
exports.scheduleFollowUp = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { follow_up_days, instructions, assigned_asha_id } = req.body;

        const result = await clinicalCareService.scheduleFollowUp({
            referralId: id,
            doctorUser: req.user,
            followUpDays: follow_up_days,
            instructions,
            assignedAshaId: assigned_asha_id
        });

        return res.json({
            success: true,
            message: result.message,
            status: result.status,
            data: result.referral
        });
    } catch (err) {
        const statusCode = err.status || (err.code === 'INVALID_STATE' ? 409 : 400);
        return res.status(statusCode).json({
            success: false,
            error: err.message,
            code: err.code || 'FOLLOW_UP_SCHEDULE_ERROR'
        });
    }
};

/**
 * Complete community follow-up visit (Closed Loop completion)
 */
exports.completeFollowUp = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { notes, vitals, patient_status } = req.body;

        const result = await clinicalCareService.completeFollowUp({
            referralId: id,
            healthWorkerUser: req.user,
            notes,
            vitals,
            patientStatus: patient_status
        });

        return res.json({
            success: true,
            message: result.message,
            status: result.status,
            data: result.referral
        });
    } catch (err) {
        const statusCode = err.status || (err.code === 'INVALID_STATE' ? 409 : 400);
        return res.status(statusCode).json({
            success: false,
            error: err.message,
            code: err.code || 'FOLLOW_UP_COMPLETE_ERROR'
        });
    }
};

/**
 * Get prescription with authorization check
 */
exports.getPrescription = async (req, res, next) => {
    try {
        const { id } = req.params;
        const prescription = await clinicalCareService.getPrescription({
            prescriptionId: id,
            requestingUser: req.user
        });

        return res.json({
            success: true,
            data: prescription
        });
    } catch (err) {
        const statusCode = err.status || (err.code === 'FORBIDDEN' ? 403 : 404);
        return res.status(statusCode).json({
            success: false,
            error: err.message,
            code: err.code || 'PRESCRIPTION_FETCH_ERROR'
        });
    }
};
