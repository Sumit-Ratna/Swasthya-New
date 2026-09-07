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
        const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .ilike('phone', `%${cleanPhone}%`)
            .maybeSingle();

        if (error) throw error;
        return data;
    }

    async findByUserId(userId) {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .or(`id.eq.${userId},user_id.eq.${userId}`)
            .maybeSingle();

        if (error) throw error;
        return data;
    }

    async findByAbhaId(abhaId) {
        if (!abhaId) return null;
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .eq('abha_id', abhaId)
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

    async updateConsent(id, consentStatus) {
        const validStatuses = ['GRANTED', 'REVOKED', 'PENDING'];
        const normalizedStatus = String(consentStatus).toUpperCase();
        if (!validStatuses.includes(normalizedStatus)) {
            throw new Error(`Invalid consent status: ${consentStatus}. Allowed: ${validStatuses.join(', ')}`);
        }

        const { data, error } = await supabase
            .from('patients')
            .update({
                consent_status: normalizedStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async listByWorker(workerId) {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .eq('registered_by_health_worker_id', workerId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    async listByDistrict(district) {
        let query = supabase.from('patients').select('*').order('full_name', { ascending: true });
        if (district && district !== 'ALL') {
            query = query.ilike('district', `%${district}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async search(term) {
        if (!term || !term.trim()) return [];
        const cleanTerm = term.trim();

        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .or(`full_name.ilike.%${cleanTerm}%,phone.ilike.%${cleanTerm}%,abha_id.ilike.%${cleanTerm}%,district.ilike.%${cleanTerm}%`)
            .order('full_name', { ascending: true })
            .limit(50);

        if (error) throw error;
        return data || [];
    }
}

module.exports = new PatientRepository();
