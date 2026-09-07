const appointmentService = require('../services/appointmentService');
const dbService = require('../services/supabaseService');

/**
 * Legacy OPD Booking endpoint (backward compatibility)
 */
exports.bookOpd = async (req, res) => {
    try {
        const { symptoms, notes, doctor_id, type } = req.body;
        const result = await appointmentService.bookAppointment({
            patient_id: req.user.id,
            doctor_id: doctor_id || null,
            is_walk_in: true,
            type: type || 'OPD',
            reason: symptoms || notes || 'OPD Consultation',
            user: req.user
        });

        res.json({
            message: `${result.appointment.type} Booking Confirmed`,
            appointment: result.appointment,
            referral: result.referral
        });
    } catch (err) {
        console.error('[APPOINTMENT] bookOpd failed:', err);
        const status = err.status || 500;
        const code = err.code || 'BOOKING_FAILED';
        res.status(status).json({ error: err.message, code });
    }
};

/**
 * Phase 9 Unified Appointment Booking (Conflict-Safe, Referral-Linked, Explicit Slots)
 */
exports.bookAppointment = async (req, res) => {
    try {
        const {
            patient_id,
            doctor_id,
            facility_id,
            referral_id,
            appointment_date,
            time_slot,
            is_walk_in,
            type,
            department,
            reason
        } = req.body;

        const effectivePatientId = patient_id || req.user.id;

        const result = await appointmentService.bookAppointment({
            patient_id: effectivePatientId,
            doctor_id,
            facility_id,
            referral_id,
            appointment_date,
            time_slot,
            is_walk_in: !!is_walk_in,
            type: type || 'OPD',
            department,
            reason,
            user: req.user
        });

        res.status(201).json({
            message: 'Appointment booked successfully',
            appointment: result.appointment,
            referral: result.referral
        });
    } catch (err) {
        console.error('[APPOINTMENT] bookAppointment failed:', err);
        const status = err.status || 500;
        const code = err.code || 'BOOKING_FAILED';
        res.status(status).json({ error: err.message, code });
    }
};

/**
 * Reschedule an appointment
 */
exports.rescheduleAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { new_date, new_slot, reason } = req.body;

        const updated = await appointmentService.rescheduleAppointment(id, {
            new_date,
            new_slot,
            reason,
            user: req.user
        });

        res.json({
            message: 'Appointment rescheduled successfully',
            appointment: updated
        });
    } catch (err) {
        console.error('[APPOINTMENT] rescheduleAppointment failed:', err);
        const status = err.status || 500;
        const code = err.code || 'RESCHEDULE_FAILED';
        res.status(status).json({ error: err.message, code });
    }
};

/**
 * Cancel an appointment
 */
exports.cancelAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const cancelled = await appointmentService.cancelAppointment(id, {
            reason,
            user: req.user
        });

        res.json({
            message: 'Appointment cancelled successfully',
            appointment: cancelled
        });
    } catch (err) {
        console.error('[APPOINTMENT] cancelAppointment failed:', err);
        const status = err.status || 500;
        const code = err.code || 'CANCELLATION_FAILED';
        res.status(status).json({ error: err.message, code });
    }
};

/**
 * Mark appointment as missed
 */
exports.markMissedAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { referral_id, reason } = req.body;

        const result = await appointmentService.markMissedAppointment({
            appointmentId: id,
            referralId: referral_id,
            reason,
            user: req.user
        });

        res.json(result);
    } catch (err) {
        console.error('[APPOINTMENT] markMissedAppointment failed:', err);
        const status = err.status || 500;
        const code = err.code || 'MISSED_ACTION_FAILED';
        res.status(status).json({ error: err.message, code });
    }
};

/**
 * Get current user's appointments
 */
exports.getMyAppointments = async (req, res) => {
    try {
        const appointments = await dbService.getAppointmentsByPatient(req.user.id);

        // Enrich with doctor information
        const enrichedAppointments = [];
        for (const apt of appointments) {
            const enriched = { ...apt };
            if (apt.doctor_id) {
                const doctor = await dbService.getUser(apt.doctor_id);
                if (doctor) {
                    enriched.doctor = { name: doctor.name, specialization: doctor.specialization };
                }
            }
            enrichedAppointments.push(enriched);
        }

        res.json(enrichedAppointments);
    } catch (err) {
        console.error('[APPOINTMENT] Fetch failed:', err);
        res.status(500).json({ error: "Fetch Failed" });
    }
};

module.exports = exports;
