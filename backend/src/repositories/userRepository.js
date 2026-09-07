const supabase = require('../config/supabaseClient');

class UserRepository {
    async findById(id) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) throw error;
        return data;
    }

    async findByPhone(phone) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('phone', phone)
            .maybeSingle();

        if (error) throw error;
        return data;
    }

    async create(userPayload) {
        const { data, error } = await supabase
            .from('users')
            .insert([{
                ...userPayload,
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
            .from('users')
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

module.exports = new UserRepository();
