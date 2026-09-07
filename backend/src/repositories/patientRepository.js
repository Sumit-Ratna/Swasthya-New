const supabase = require('../config/supabaseClient');

class PatientRepository {
    async findById(id) {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) throw error;
        return data;
    }

    async findByPhone(phone) {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .eq('phone', phone)
            .maybeSingle();

        if (error) throw error;
        return data;
    }

    async findByUserId(userId) {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;
        return data;
    }

    async create(patientPayload) {
        const { data, error } = await supabase
            .from('patients')
            .insert([{
                ...patientPayload,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async update(id, updates) {
        const { data, error } = await supabase
            .from('patients')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}

module.exports = new PatientRepository();
