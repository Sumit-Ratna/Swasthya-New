const supabase = require('../config/supabaseClient');

class FacilityRepository {
    async findById(id) {
        const { data, error } = await supabase
            .from('facilities')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) throw error;
        return data;
    }

    async findByDistrict(district) {
        const { data, error } = await supabase
            .from('facilities')
            .select('*')
            .eq('district', district);

        if (error) throw error;
        return data || [];
    }

    async listAll() {
        const { data, error } = await supabase
            .from('facilities')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        return data || [];
    }
}

module.exports = new FacilityRepository();
