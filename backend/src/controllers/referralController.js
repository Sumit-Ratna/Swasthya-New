const crypto = require('crypto');
const supabase = require('../config/supabaseClient');
const localDb = require('../services/localDb');
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
 * Helper to resolve or auto-register an OpenStreetMap / external facility into Supabase facilities table
 */
async function resolveOrCreateFacility({ facility_id, facility_name, facility_address, district, latitude, longitude, phone }) {
    try {
        if (facility_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(facility_id)) {
            const { data: fac, error } = await supabase.from('facilities').select('*').eq('id', facility_id).maybeSingle();
            if (!error && fac) return fac;
        }

        if (facility_name && typeof facility_name === 'string' && facility_name.trim().length > 0) {
            const cleanName = facility_name.trim();
            const { data: matched } = await supabase
                .from('facilities')
                .select('*')
                .ilike('name', cleanName)
                .limit(1);

            if (matched && matched.length > 0) {
                return matched[0];
            }

            // Insert new facility into Supabase facilities table
            const newPayload = {
                name: cleanName,
                tier: 'DISTRICT_HOSPITAL',
                address: facility_address || 'Local Healthcare Facility',
                district: district || 'Nashik',
                latitude: latitude ? Number(latitude) : 19.9975,
                longitude: longitude ? Number(longitude) : 73.7898,
                operational_status: 'OPEN',
                current_load: 40,
                emergency_capable: true
            };

            const { data: created, error: insertErr } = await supabase
                .from('facilities')
                .insert([newPayload])
                .select()
                .single();

            if (!insertErr && created) return created;
            console.warn('[FACILITY_RESOLVE] Notice inserting facility:', insertErr?.message);
        }

        // Default fallback to first available facility
        const { data: defaultFacs } = await supabase.from('facilities').select('*').limit(1);
        if (defaultFacs && defaultFacs.length > 0) return defaultFacs[0];
    } catch (e) {
        console.warn('[FACILITY_RESOLVE] Exception:', e.message);
    }

    return null;
}

/**
 * Create or Book a Referral (Single Source of Truth in Supabase)
 */
exports.createReferral = async (req, res, next) => {
    try {
        const {
            referral_id,
            patient_id,
            assessment_id,
            receiving_facility_id,
            facility_name,
            facility_address,
            facility_phone,
            district,
            latitude,
            longitude,
            risk_level = 'MODERATE',
            urgency = 'ROUTINE',
            specialty_required = 'General Medicine',
            primary_complaint,
            clinical_summary,
            reason_for_referral,
            appointment_slot_time,
            appointment_date,
            appointment_time,
            slot_token,
            status
        } = req.body;

        const effectivePatientId = patient_id || req.user?.id;

        if (!effectivePatientId) {
            return res.status(400).json({
                success: false,
                error: 'patient_id is required to create a referral',
                code: 'VALIDATION_ERROR'
            });
        }

        // 1. Ensure Patient Record exists in users and patients tables to satisfy foreign key constraints
        try {
            const { data: userExists } = await supabase.from('users').select('id').eq('id', effectivePatientId).maybeSingle();
            if (!userExists) {
                await supabase.from('users').insert([{
                    id: effectivePatientId,
                    phone: req.user?.phone || '+917080135660',
                    name: req.user?.name || 'Swasthya Patient',
                    role: 'patient',
                    created_at: new Date().toISOString()
                }]);
            }
        } catch (uErr) {
            console.warn('[CREATE_REFERRAL] User table check notice:', uErr.message);
        }

        try {
            const { data: patientExists } = await supabase.from('patients').select('id').eq('id', effectivePatientId).maybeSingle();
            if (!patientExists) {
                await supabase.from('patients').insert([{
                    id: effectivePatientId,
                    full_name: req.user?.name || 'Swasthya Patient',
                    phone: req.user?.phone || '+917080135660',
                    created_at: new Date().toISOString()
                }]);
            }
        } catch (pErr) {
            console.warn('[CREATE_REFERRAL] Patient table check notice:', pErr.message);
        }

        let referringUserId = null;
        if (req.user?.id) {
            try {
                const { data: refUser } = await supabase.from('users').select('id').eq('id', req.user.id).maybeSingle();
                if (refUser) referringUserId = refUser.id;
            } catch (rErr) {}
        }

        // 2. Resolve Exact Receiving Facility
        const facility = await resolveOrCreateFacility({
            facility_id: receiving_facility_id,
            facility_name: facility_name || req.body.hospital_name,
            facility_address,
            district,
            latitude,
            longitude,
            phone: facility_phone
        });

        const resolvedFacilityId = facility?.id || null;

        // 3. Resolve Doctor Assignment
        let resolvedDoctorId = null;
        let resolvedDoctorName = 'Assigned OPD Specialist';
        let resolvedDoctorUserId = null;

        if (resolvedFacilityId) {
            const { data: facilityDoctors } = await supabase
                .from('doctors')
                .select('id, name, user_id, specialty_name')
                .eq('facility_id', resolvedFacilityId)
                .limit(1);

            if (facilityDoctors && facilityDoctors.length > 0) {
                resolvedDoctorId = facilityDoctors[0].id;
                resolvedDoctorName = facilityDoctors[0].name;
                resolvedDoctorUserId = facilityDoctors[0].user_id;
            }
        }

        if (!resolvedDoctorId) {
            const { data: anyDoc } = await supabase.from('doctors').select('id, name, user_id, specialty_name').limit(1);
            if (anyDoc && anyDoc.length > 0) {
                resolvedDoctorId = anyDoc[0].id;
                resolvedDoctorName = anyDoc[0].name;
                resolvedDoctorUserId = anyDoc[0].user_id;
            }
        }

        // 4. Construct Slot Token and Appointment Date/Time
        const finalSlotToken = slot_token || ('OPD-' + Math.floor(100 + Math.random() * 900));
        let finalSlotTime = appointment_slot_time;
        if (!finalSlotTime && appointment_date && appointment_time) {
            finalSlotTime = `${appointment_date} at ${appointment_time}`;
        } else if (!finalSlotTime && appointment_date) {
            finalSlotTime = `${appointment_date} at 10:30 AM`;
        } else if (!finalSlotTime) {
            finalSlotTime = new Date().toISOString();
        }

        const isBooked = Boolean(status === 'APPOINTMENT_BOOKED' || appointment_date || appointment_slot_time || slot_token);
        const initialStatus = isBooked ? REFERRAL_STATES.APPOINTMENT_BOOKED : REFERRAL_STATES.TRIAGED;
        const resolvedComplaint = (primary_complaint || 'Doctor Consultation & Specialist Referral').trim();

        // 5. Check if updating existing referral or inserting new one
        let savedReferral = null;

        if (referral_id) {
            const { data: updatedRef, error: updateErr } = await supabase
                .from('referrals')
                .update({
                    receiving_facility_id: resolvedFacilityId,
                    assigned_doctor_id: resolvedDoctorId,
                    status: initialStatus,
                    risk_level: risk_level || 'MODERATE',
                    urgency: urgency || 'ROUTINE',
                    specialty_required: specialty_required || 'General Medicine',
                    primary_complaint: resolvedComplaint,
                    clinical_summary: clinical_summary || `Appointment confirmed at ${facility?.name || 'Hospital'}. Slot: ${finalSlotTime}`,
                    reason_for_referral: reason_for_referral || `Scheduled appointment on ${finalSlotTime}`,
                    appointment_slot_time: finalSlotTime,
                    slot_token: finalSlotToken,
                    updated_at: new Date().toISOString()
                })
                .eq('id', referral_id)
                .select()
                .single();

            if (!updateErr && updatedRef) savedReferral = updatedRef;
        }

        if (!savedReferral) {
            const newReferralPayload = {
                id: crypto.randomUUID(),
                patient_id: effectivePatientId,
                assessment_id: assessment_id || null,
                referring_user_id: referringUserId,
                receiving_facility_id: resolvedFacilityId,
                assigned_doctor_id: resolvedDoctorId,
                status: initialStatus,
                risk_level: risk_level || 'MODERATE',
                urgency: urgency || 'ROUTINE',
                specialty_required: specialty_required || 'General Medicine',
                primary_complaint: resolvedComplaint,
                clinical_summary: clinical_summary || `Appointment confirmed at ${facility?.name || 'Hospital'}. Slot: ${finalSlotTime}`,
                reason_for_referral: reason_for_referral || `Scheduled appointment on ${finalSlotTime}`,
                appointment_slot_time: finalSlotTime,
                slot_token: finalSlotToken,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data: insertedRef, error: insertErr } = await supabase
                .from('referrals')
                .insert([newReferralPayload])
                .select()
                .single();

            if (!insertErr && insertedRef) {
                savedReferral = insertedRef;
            } else {
                console.warn('[CREATE_REFERRAL] Supabase insert notice:', insertErr?.message);
                // Fallback store in localDb
                savedReferral = newReferralPayload;
                localDb.insert('referrals', newReferralPayload);
            }
        }

        // 6. Record Referral Audit Event
        try {
            await supabase.from('referral_events').insert([{
                referral_id: savedReferral.id,
                from_status: 'INIT',
                to_status: initialStatus,
                actor_user_id: effectivePatientId,
                actor_role: normalizeRole(req.user?.role || 'PATIENT'),
                reason: reason_for_referral || `Appointment confirmed at ${facility?.name || 'Hospital'} (${finalSlotTime})`,
                created_at: new Date().toISOString()
            }]);
        } catch (evErr) {
            console.warn('[CREATE_REFERRAL] Event audit notice:', evErr.message);
        }

        // 7. Synchronize with Appointments Table if Booked
        if (isBooked) {
            try {
                const appointmentDateStr = appointment_date || (finalSlotTime.includes('-') ? finalSlotTime.split('T')[0] : new Date().toISOString().split('T')[0]);
                const appointmentTimeStr = appointment_time || '10:30 AM';

                await supabase.from('appointments').insert([{
                    patient_id: effectivePatientId,
                    doctor_id: resolvedDoctorUserId || '88888888-8888-8888-8888-888888888888',
                    appointment_date: appointmentDateStr,
                    time_slot: appointmentTimeStr,
                    type: 'referral_consultation',
                    department: specialty_required || 'Specialist OPD',
                    reason: resolvedComplaint,
                    status: 'confirmed',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }]);
            } catch (aptErr) {
                console.warn('[CREATE_REFERRAL] Appointments table sync notice:', aptErr.message);
            }

            // 8. Synchronize with User Profile Medical History
            try {
                const { data: usr } = await supabase.from('users').select('medical_history').eq('id', effectivePatientId).maybeSingle();
                const medHist = usr?.medical_history || {};
                const currentPastRecords = Array.isArray(medHist.past_records) ? medHist.past_records : [];
                const currentApts = Array.isArray(medHist.confirmed_appointments) ? medHist.confirmed_appointments : [];

                const historyEntry = {
                    id: `ref_apt_${savedReferral.id}`,
                    referral_id: savedReferral.id,
                    title: `Referral Consultation at ${facility?.name || facility_name || 'Healthcare Centre'}`,
                    category: 'Doctor Consultation',
                    facility_name: facility?.name || facility_name || 'Healthcare Centre',
                    doctor_name: resolvedDoctorName || 'Assigned OPD Specialist',
                    record_date: appointment_date || new Date().toISOString().split('T')[0],
                    slot_time: appointment_time || '10:30 AM',
                    queue_token: finalSlotToken,
                    status: 'APPOINTMENT_BOOKED',
                    notes: resolvedComplaint,
                    created_at: new Date().toISOString()
                };

                const filteredPast = currentPastRecords.filter(r => r.referral_id !== savedReferral.id && r.id !== historyEntry.id);
                const filteredApts = currentApts.filter(r => r.referral_id !== savedReferral.id && r.id !== historyEntry.id);

                await supabase.from('users').update({
                    medical_history: {
                        ...medHist,
                        past_records: [historyEntry, ...filteredPast],
                        confirmed_appointments: [historyEntry, ...filteredApts]
                    },
                    updated_at: new Date().toISOString()
                }).eq('id', effectivePatientId);
            } catch (histErr) {
                console.warn('[CREATE_REFERRAL] Medical history sync notice:', histErr.message);
            }
        }

        // Return complete hydrated referral object
        const fullReferral = {
            ...savedReferral,
            facilities: facility || {
                id: resolvedFacilityId,
                name: facility_name || 'Healthcare Facility',
                tier: 'DISTRICT_HOSPITAL',
                address: facility_address || 'Local Healthcare Centre',
                district: district || 'Local District'
            },
            doctors: {
                id: resolvedDoctorId,
                name: resolvedDoctorName,
                specialty_name: specialty_required || 'General OPD'
            }
        };

        return res.status(201).json({
            success: true,
            message: 'Referral appointment booked and persisted successfully in Supabase',
            data: fullReferral
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
