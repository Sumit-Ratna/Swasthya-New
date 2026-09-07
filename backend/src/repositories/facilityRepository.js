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

    async find(filters = {}) {
        let query = supabase.from('facilities').select('*');

        if (filters.district) {
            query = query.eq('district', filters.district);
        }
        if (filters.tier && filters.tier !== 'ALL') {
            query = query.eq('tier', filters.tier);
        }
        if (filters.emergency_capable !== undefined) {
            query = query.eq('emergency_capable', filters.emergency_capable);
        }

        const { data, error } = await query.order('current_load', { ascending: true });
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

    async updateStatus(id, updateData) {
        const payload = {
            ...updateData,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('facilities')
            .update(payload)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async getDoctors(facilityId, specialty = null) {
        let query = supabase.from('doctors').select('*').eq('facility_id', facilityId);
        if (specialty) {
            query = query.ilike('specialty_name', `%${specialty}%`);
        }

        const { data, error } = await query.order('name', { ascending: true });
        if (error) throw error;
        return data || [];
    }
}

module.exports = new FacilityRepository();
