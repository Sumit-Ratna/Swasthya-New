const supabase = require('../config/supabaseClient');

class AppointmentRepository {
    async findById(id) {
        const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) throw error;
        return data;
    }

    async findByDoctor(doctorId) {
        const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('doctor_id', doctorId)
            .order('appointment_date', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    async findByPatient(patientId) {
        const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('patient_id', patientId)
            .order('appointment_date', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    async create(appointmentPayload) {
        const { data, error } = await supabase
            .from('appointments')
            .insert([{
                ...appointmentPayload,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}

module.exports = new AppointmentRepository();
