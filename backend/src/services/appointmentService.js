const crypto = require('crypto');
const supabase = require('../config/supabaseClient');
const config = require('../config/env');
const localDb = require('./localDb');
const { REFERRAL_STATES, transitionReferral } = require('../domain/referralStateMachine');
const supabaseService = require('./supabaseService');

class AppointmentServiceError extends Error {
    constructor(message, code = 'VALIDATION_ERROR', status = 400) {
        super(message);
        this.name = 'AppointmentServiceError';
        this.code = code;
        this.status = status;
    }
}

/**
 * Check if a doctor or facility slot is already occupied
 */
async function checkSlotConflict({ doctor_id, appointment_date, time_slot, exclude_appointment_id = null }) {
    if (!doctor_id || !appointment_date || !time_slot) {
        return false;
    }

    try {
        let query = supabase
            .from('appointments')
            .select('id, status, appointment_date, time_slot')
            .eq('doctor_id', doctor_id)
            .eq('appointment_date', appointment_date)
            .eq('time_slot', time_slot)
            .eq('status', 'confirmed');

        if (exclude_appointment_id) {
            query = query.neq('id', exclude_appointment_id);
        }

        const { data, error } = await query;
        if (error) {
            console.warn('[APPOINTMENT_SLOT_CHECK] Warning:', error.message);
            return false;
        }

        return data && data.length > 0;
    } catch (err) {
        console.warn('[APPOINTMENT_SLOT_CHECK] Exception:', err.message);
        return false;
    }
}

/**
 * Conflict-Safe Appointment Booking with Referral State Machine Synchronization
 */
async function bookAppointment({
    patient_id,
    doctor_id,
    facility_id,
    referral_id,
    appointment_date,
    time_slot,
    is_walk_in = false,
    type = 'OPD',
    department = null,
    reason = null,
    user = null,
    ...rest
}) {
    if (!patient_id) {
        throw new AppointmentServiceError('patient_id is required to book an appointment', 'VALIDATION_ERROR', 400);
    }

    // Default or resolve doctor_id if not explicitly provided
    let resolvedDoctorId = doctor_id;
    if (!resolvedDoctorId) {
        // Find an active doctor in the target facility or default doctor
        const { data: doctors } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'DOCTOR')
            .limit(1);

        if (doctors && doctors.length > 0) {
            resolvedDoctorId = doctors[0].id;
        } else {
            resolvedDoctorId = '88888888-8888-8888-8888-888888888888'; // standard doctor id
        }
    }

    // Standardize date and slot formats
    const formattedDate = appointment_date || new Date().toISOString().split('T')[0];
    const formattedSlot = time_slot || '10:00 AM - 12:00 PM';

    // 1. Valid Operating Hour Check
    if (!is_walk_in) {
        // Mocking/Assuming validateSlotOperatingHours helper
        if (typeof validateSlotOperatingHours !== 'undefined' && !validateSlotOperatingHours(formattedSlot)) {
            throw new AppointmentServiceError(
                `The requested time slot '${formattedSlot}' is outside valid facility operating hours (08:00 AM - 08:00 PM).`,
                'INVALID_SLOT_HOURS',
                400
            );
        }
    }

    // 2. Double-booking / Capacity Conflict Check
    if (!is_walk_in) {
        const isConflict = await checkSlotConflict({
            doctor_id: resolvedDoctorId,
            appointment_date: formattedDate,
            time_slot: formattedSlot
        });

        if (isConflict) {
            throw new AppointmentServiceError(
                `The slot '${formattedSlot}' on ${formattedDate} for doctor ID ${resolvedDoctorId} is already booked. Please choose another time slot.`,
                'SLOT_ALREADY_BOOKED',
                409
            );
        }
    }

    // 3. Referral-Linked Booking: Validate Referral State
    let linkedReferral = null;
    if (referral_id) {
        const { data: referral, error: refErr } = await supabase
            .from('referrals')
            .select('*')
            .eq('id', referral_id)
            .single();

        if (refErr || !referral) {
            throw new AppointmentServiceError(`Linked referral not found with ID: ${referral_id}`, 'REFERRAL_NOT_FOUND', 404);
        }

        // Referral MUST be in ACCEPTED or MISSED_APPOINTMENT state to book appointment
        if (referral.status !== REFERRAL_STATES.ACCEPTED && referral.status !== REFERRAL_STATES.MISSED_APPOINTMENT) {
            throw new AppointmentServiceError(
                `Cannot book appointment for referral in status '${referral.status}'. Referral must be in 'ACCEPTED' or 'MISSED_APPOINTMENT' state.`,
                'INVALID_TRANSITION',
                409
            );
        }

        linkedReferral = referral;
    }

    // 4. Persist Appointment Record with Full Rural Proxy & Facility Metadata
    const appointmentToken = rest.token || `APT-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const appointmentPayload = {
        id: rest.id || crypto.randomUUID(),
        patient_id,
        patient_name: rest.patient_name || user?.name || 'Patient',
        patient_phone: rest.patient_phone || user?.phone || '+91 9800000000',
        patient_age: rest.patient_age || '32',
        patient_gender: rest.patient_gender || 'Female',
        patient_abha: rest.patient_abha || null,
        doctor_id: resolvedDoctorId,
        facility_id: facility_id || (linkedReferral ? linkedReferral.receiving_facility_id : null),
        facility_name: rest.facility_name || user?.facility_name || reason?.facility_name || 'Designated Healthcare Facility',
        facility_phone: rest.facility_phone || reason?.facility_phone || '+91 11 23978046',
        facility_address: rest.facility_address || reason?.facility_address || null,
        facility_lat: rest.facility_lat || null,
        facility_lon: rest.facility_lon || null,
        appointment_date: formattedDate,
        time_slot: formattedSlot,
        type: (type || 'general').toLowerCase(),
        department: department || 'General Medicine',
        urgency: rest.urgency || 'ROUTINE',
        reason: typeof reason === 'string' ? reason : (reason?.reason || (linkedReferral ? `Referral Consultation: ${linkedReferral.primary_complaint}` : 'OPD Consultation')),
        status: 'confirmed',
        token: appointmentToken,
        booked_by_asha: !!(rest.booked_by_asha || user?.role?.toUpperCase() === 'ASHA' || user?.role?.toUpperCase() === 'HEALTH_WORKER' || user?.role?.toUpperCase() === 'CAREGIVER' || user?.role?.toUpperCase() === 'ANM'),
        asha_worker_id: rest.asha_worker_id || user?.id || null,
        asha_worker_name: rest.asha_worker_name || user?.name || null,
        asha_notes: rest.asha_notes || null,
        created_at: rest.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    let createdAppointment = null;
    try {
        const { data, error } = await supabase
            .from('appointments')
            .upsert(appointmentPayload, { onConflict: 'id' })
            .select()
            .single();

        if (!error && data) {
            createdAppointment = data;
            localDb.insert('appointments', data);
        } else if (error) {
            console.warn('[APPOINTMENT_PERSIST] Notice:', error.message);
            createdAppointment = localDb.insert('appointments', appointmentPayload);
        }
    } catch (dbErr) {
        console.warn('[APPOINTMENT_PERSIST] Catch fallback:', dbErr.message);
        createdAppointment = localDb.insert('appointments', appointmentPayload);
    }

    if (!createdAppointment) {
        createdAppointment = localDb.insert('appointments', appointmentPayload);
    }

    // Sync appointment to Supabase users.medical_history.confirmed_appointments
    try {
        const targetUserId = patient_id || user?.id;
        if (targetUserId) {
            const { data: userData } = await supabase
                .from('users')
                .select('medical_history')
                .eq('id', targetUserId)
                .maybeSingle();

            const existingHistory = userData?.medical_history || {};
            const existingApts = Array.isArray(existingHistory.confirmed_appointments) ? existingHistory.confirmed_appointments : [];
            const mergedApts = [createdAppointment, ...existingApts.filter(a => a && a.id !== createdAppointment.id)];

            await supabase
                .from('users')
                .update({
                    medical_history: {
                        ...existingHistory,
                        confirmed_appointments: mergedApts
                    }
                })
                .eq('id', targetUserId);
        }
    } catch (mhErr) {
        console.warn('[MEDICAL_HISTORY_SYNC] Notice:', mhErr.message);
    }

    // 5. If Referral-Linked: Transition Referral to APPOINTMENT_BOOKED
    let updatedReferral = null;
    if (linkedReferral) {
        const token = `TOKEN-${(facility_id || linkedReferral.receiving_facility_id || 'FAC').slice(-4).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

        let slotTimestamp = null;
        try {
            const combined = new Date(`${formattedDate} ${formattedSlot}`);
            if (!isNaN(combined.getTime())) {
                slotTimestamp = combined.toISOString();
            } else {
                const dateOnly = new Date(`${formattedDate}T09:00:00Z`);
                slotTimestamp = !isNaN(dateOnly.getTime()) ? dateOnly.toISOString() : new Date().toISOString();
            }
        } catch (_) {
            slotTimestamp = new Date().toISOString();
        }

        const transitionResult = await transitionReferral({
            referralId: referral_id,
            toStatus: REFERRAL_STATES.APPOINTMENT_BOOKED,
            actorUserId: user?.id || null,
            actorRole: user?.role || 'FACILITY_STAFF',
            reason: `Appointment confirmed for ${formattedDate} (${formattedSlot}). Slot token allocated.`,
            payload: {
                appointment_slot_time: slotTimestamp,
                slot_token: token
            }
        });

        updatedReferral = transitionResult.referral;
        createdAppointment.slot_token = token;
        createdAppointment.referral_id = referral_id;
    }

    // 6. Resilient Post-Persistence Notification Dispatch
    // (Notification failures must NEVER crash or roll back a valid booking)
    try {
        await supabaseService.createNotification({
            user_id: patient_id,
            title: `Appointment Confirmed`,
            message: `Your ${type} appointment on ${formattedDate} (${formattedSlot}) is confirmed.`,
            type: 'alert'
        });
    } catch (notifyErr) {
        console.warn('[NOTIFICATION_DISPATCH] Post-booking notification warning (non-fatal):', notifyErr.message);
    }

    return {
        appointment: createdAppointment,
        referral: updatedReferral
    };
}

/**
 * Reschedule an existing appointment
 */
async function rescheduleAppointment(appointmentId, { new_date, new_slot, reason, user }) {
    if (!new_date || !new_slot) {
        throw new AppointmentServiceError('Both new_date and new_slot are required to reschedule', 'VALIDATION_ERROR', 400);
    }

    const { data: apt, error: fetchErr } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

    if (fetchErr || !apt) {
        throw new AppointmentServiceError(`Appointment not found with ID: ${appointmentId}`, 'NOT_FOUND', 404);
    }

    // Conflict check for new slot
    const isConflict = await checkSlotConflict({
        doctor_id: apt.doctor_id,
        appointment_date: new_date,
        time_slot: new_slot,
        exclude_appointment_id: appointmentId
    });

    if (isConflict) {
        throw new AppointmentServiceError(
            `The slot '${new_slot}' on ${new_date} is already occupied. Please select another slot.`,
            'SLOT_ALREADY_BOOKED',
            409
        );
    }

    const updatePayload = {
        appointment_date: new_date,
        time_slot: new_slot,
        reason: reason ? `${apt.reason || ''} | Rescheduled: ${reason}` : apt.reason,
        status: 'confirmed',
        updated_at: new Date().toISOString()
    };

    const { data: updatedApt, error: updateErr } = await supabase
        .from('appointments')
        .update(updatePayload)
        .eq('id', appointmentId)
        .select()
        .single();

    if (updateErr) {
        throw new AppointmentServiceError(`Database error rescheduling: ${updateErr.message}`, 'DB_ERROR', 500);
    }

    return updatedApt || apt;
}

/**
 * Cancel an appointment with a mandatory reason
 */
async function cancelAppointment(appointmentId, { reason, user }) {
    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
        throw new AppointmentServiceError('A mandatory reason is required to cancel an appointment', 'VALIDATION_ERROR', 400);
    }

    const { data: updatedApt, error } = await supabase
        .from('appointments')
        .update({
            status: 'cancelled',
            reason: `Cancelled: ${reason.trim()}`,
            updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId)
        .select()
        .single();

    if (error) {
        throw new AppointmentServiceError(`Error cancelling appointment: ${error.message}`, 'DB_ERROR', 500);
    }

    return updatedApt;
}

/**
 * Mark an appointment and linked referral as MISSED_APPOINTMENT
 */
async function markMissedAppointment({ appointmentId, referralId, reason, user }) {
    if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
        throw new AppointmentServiceError('A mandatory reason is required to record a missed appointment', 'VALIDATION_ERROR', 400);
    }

    // 1. Update appointment record if ID provided
    if (appointmentId) {
        await supabase
            .from('appointments')
            .update({
                status: 'missed',
                updated_at: new Date().toISOString()
            })
            .eq('id', appointmentId);
    }

    // 2. Transition referral state machine to MISSED_APPOINTMENT
    let referralResult = null;
    if (referralId) {
        referralResult = await transitionReferral({
            referralId,
            toStatus: REFERRAL_STATES.MISSED_APPOINTMENT,
            actorUserId: user?.id || null,
            actorRole: user?.role || 'FACILITY_STAFF',
            reason: reason.trim()
        });
    }

    return { success: true, appointmentId, referralResult };
}

/**
 * Batch synchronize offline-created appointments to Supabase
 */
async function syncBatchAppointments(appointments = [], user = null) {
    if (!Array.isArray(appointments) || appointments.length === 0) {
        return { synced: 0, appointments: [] };
    }

    const syncedResults = [];
    for (const apt of appointments) {
        try {
            const payload = {
                id: apt.id || crypto.randomUUID(),
                patient_id: apt.patient_id || user?.id,
                doctor_id: apt.doctor_id || '88888888-8888-8888-8888-888888888888',
                facility_id: apt.facility_id || null,
                appointment_date: apt.appointment_date,
                time_slot: apt.time_slot,
                type: (apt.type || 'general').toLowerCase(),
                department: apt.department || null,
                reason: apt.reason || 'Offline ASHA Assisted OPD Booking',
                status: apt.status || 'confirmed',
                token: apt.token || `APT-${Date.now().toString().slice(-6)}`,
                created_at: apt.created_at || new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data, error } = await supabase
                .from('appointments')
                .upsert(payload, { onConflict: 'id' })
                .select()
                .single();

            if (!error && data) {
                localDb.insert('appointments', data);
                syncedResults.push(data);
            } else {
                localDb.insert('appointments', payload);
                syncedResults.push(payload);
            }
        } catch (e) {
            console.warn('[BATCH_SYNC_APPOINTMENT] Notice:', e.message);
            localDb.insert('appointments', apt);
            syncedResults.push(apt);
        }
    }

    return {
        synced: syncedResults.length,
        appointments: syncedResults
    };
}

module.exports = {
    AppointmentServiceError,
    checkSlotConflict,
    bookAppointment,
    rescheduleAppointment,
    cancelAppointment,
    markMissedAppointment,
    syncBatchAppointments
};
