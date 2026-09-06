const dbService = require('../services/supabaseService');

exports.bookOpd = async (req, res) => {
    try {
        const { symptoms, notes, doctor_id, type } = req.body;
        const aptType = type || 'OPD';

        const appointment = await dbService.createAppointment({
            patient_id: req.user.id,
            doctor_id: doctor_id || null,
            type: aptType,
            status: 'confirmed',
            appointment_date: new Date().toISOString().split('T')[0],
            time_slot: 'Today Walk-in',
            reason: symptoms || notes || 'OPD Consultation'
        });

        // Add Notification
        await dbService.createNotification({
            user_id: req.user.id,
            title: `${aptType} Booking Confirmed`,
            message: `Your ${aptType} appointment has been scheduled successfully.`,
            type: 'alert'
        });

        res.json({ message: `${aptType} Booking Confirmed`, appointment });
    } catch (err) {
        console.error('[APPOINTMENT] Booking failed:', err);
        res.status(500).json({ error: "Booking Failed" });
    }
};

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
