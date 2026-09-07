const supabase = require('../config/supabaseClient');

class ReferralRepository {
    async findById(id) {
        const { data, error } = await supabase
            .from('referrals')
            .select(`
                *,
                patient:patients!referrals_patient_id_fkey(id, full_name, phone, gender, date_of_birth),
                facilities:facilities!referrals_receiving_facility_id_fkey(id, name, tier, district, address),
                doctors:doctors!referrals_assigned_doctor_id_fkey(id, name, specialty_name)
            `)
            .eq('id', id)
            .maybeSingle();

        if (error) throw error;
        return data;
    }

    async findByPatient(patientId) {
        const { data, error } = await supabase
            .from('referrals')
            .select(`
                *,
                facilities:facilities!referrals_receiving_facility_id_fkey(id, name, tier, district, address),
                doctors:doctors!referrals_assigned_doctor_id_fkey(id, name, specialty_name)
            `)
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    async findByFacility(facilityId, status) {
        let query = supabase
            .from('referrals')
            .select(`
                *,
                patient:patients!referrals_patient_id_fkey(id, full_name, phone, gender, date_of_birth),
                doctors:doctors!referrals_assigned_doctor_id_fkey(id, name, specialty_name)
            `)
            .eq('receiving_facility_id', facilityId)
            .order('created_at', { ascending: false });

        if (status) query = query.eq('status', status);

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async create(referralPayload) {
        const { data, error } = await supabase
            .from('referrals')
            .insert([{
                ...referralPayload,
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
            .from('referrals')
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

module.exports = new ReferralRepository();
