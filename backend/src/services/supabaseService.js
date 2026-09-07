const supabase = require('../config/supabaseClient');
const crypto = require('crypto');
const localDb = require('./localDb');

class SupabaseService {
    // ==========================================
    // USER & PATIENT CLOUD DATABASE OPERATIONS
    // ==========================================
    async createUser(userId, userData) {
        let phone = userData.phone;
        if (!phone || String(phone).trim() === '') {
            phone = String(Math.floor(6000000000 + Math.random() * 3999999999));
        } else {
            phone = String(phone).replace(/\D/g, '').slice(-10);
        }

        const fullName = userData.name || userData.full_name || 'New User';
        const rawRole = (userData.role || 'patient').toUpperCase();
        const role = rawRole.includes('DOC') ? 'DOCTOR' : (rawRole.includes('HEALTH') || rawRole.includes('WORKER') || rawRole.includes('ASHA') ? 'HEALTH_WORKER' : 'PATIENT');

        const userPayload = {
            id: userId,
            phone: phone,
            full_name: fullName,
            email: userData.email ? userData.email.trim().toLowerCase() : null,
            role: role,
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        if (userData.password_hash) {
            userPayload.password_hash = userData.password_hash;
        }

        try {
            const { data, error } = await supabase
                .from('users')
                .upsert(userPayload)
                .select()
                .single();

            if (error) {
                console.warn('[SUPABASE] user upsert error:', error.message);
            }

            // Also create/update associated patient record in Supabase patients table
            const patientPayload = {
                id: userId,
                user_id: userId,
                full_name: fullName,
                phone: phone,
                gender: userData.gender || 'Male',
                date_of_birth: userData.dob || userData.date_of_birth || '2000-01-01',
                address: userData.address || '',
                district: userData.address_city || userData.district || 'Lucknow',
                village: userData.village || userData.address_state || '',
                abha_id: userData.abha_id || null,
                abha_address: userData.abha_address || null,
                consent_status: 'GRANTED',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { error: patientErr } = await supabase
                .from('patients')
                .upsert(patientPayload);

            if (patientErr) {
                console.warn('[SUPABASE] patient table sync notice:', patientErr.message);
            }

            const unified = {
                ...userPayload,
                ...patientPayload,
                name: fullName,
                role: role.toLowerCase(),
                dob: patientPayload.date_of_birth,
                blood_group: userData.blood_group || 'O+',
                allergies: userData.allergies || 'None',
                chronic_conditions: userData.chronic_conditions || 'None',
                emergency_contact: userData.emergency_contact || null
            };

            localDb.insert('users', unified);
            return unified;
        } catch (e) {
            console.error('[SUPABASE] createUser exception:', e.message);
            const fallback = { ...userPayload, name: fullName, role: role.toLowerCase() };
            return localDb.insert('users', fallback);
        }
    }

    async updateUserPassword(userId, passwordHash) {
        try {
            const { data, error } = await supabase
                .from('users')
                .update({
                    password_hash: passwordHash,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId)
                .select()
                .single();

            if (!error && data) {
                localDb.update('users', u => u.id === userId, { password_hash: passwordHash });
                return data;
            }
        } catch (e) {
            console.warn('[SUPABASE] Password update notice:', e.message);
        }

        return localDb.update('users', u => u.id === userId, { password_hash: passwordHash });
    }

    async getUser(userId) {
        try {
            const { data: supaUser, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (supaUser) {
                // Fetch joined patient record
                const { data: patientRecord } = await supabase
                    .from('patients')
                    .select('*')
                    .or(`id.eq.${userId},user_id.eq.${userId}`)
                    .maybeSingle();

                return {
                    ...supaUser,
                    ...(patientRecord || {}),
                    id: supaUser.id,
                    name: supaUser.full_name || patientRecord?.full_name || 'User',
                    full_name: supaUser.full_name || patientRecord?.full_name || 'User',
                    phone: supaUser.phone || patientRecord?.phone,
                    role: (supaUser.role || 'PATIENT').toLowerCase(),
                    dob: patientRecord?.date_of_birth || supaUser.dob,
                    address_city: patientRecord?.district || '',
                    address_state: patientRecord?.village || '',
                    address: patientRecord?.address || '',
                    abha_id: patientRecord?.abha_id || '',
                    abha_address: patientRecord?.abha_address || ''
                };
            }
        } catch (e) {
            console.warn('[SUPABASE] getUser notice:', e.message);
        }

        return localDb.findOne('users', u => u.id === userId);
    }

    async getUserByPhone(phone) {
        const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
        try {
            const { data: supaUser, error } = await supabase
                .from('users')
                .select('*')
                .ilike('phone', `%${cleanPhone}%`)
                .maybeSingle();

            if (supaUser) {
                return this.getUser(supaUser.id);
            }
        } catch (e) {}

        return localDb.findOne('users', u => u.phone && u.phone.includes(cleanPhone));
    }

    async getUserByEmail(email) {
        if (!email) return null;
        const cleanEmail = email.trim().toLowerCase();
        try {
            const { data: supaUser, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', cleanEmail)
                .maybeSingle();

            if (supaUser) {
                return this.getUser(supaUser.id);
            }
        } catch (e) {}

        return localDb.findOne('users', u => u.email && u.email.toLowerCase() === cleanEmail);
    }

    async getUserByQrId(doctor_qr_id) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('assigned_facility_id', doctor_qr_id)
            .maybeSingle();

        return data;
    }

    async updateUser(userId, updateData) {
        const fullName = updateData.name || updateData.full_name;
        const userUpdates = { updated_at: new Date().toISOString() };
        if (fullName) userUpdates.full_name = fullName;
        if (updateData.email) userUpdates.email = updateData.email.trim().toLowerCase();
        if (updateData.phone) userUpdates.phone = String(updateData.phone).replace(/\D/g, '').slice(-10);
        if (updateData.role) userUpdates.role = updateData.role.toUpperCase();

        try {
            await supabase
                .from('users')
                .update(userUpdates)
                .eq('id', userId);

            // Update patients table
            const patientUpdates = {
                updated_at: new Date().toISOString()
            };
            if (fullName) patientUpdates.full_name = fullName;
            if (updateData.gender) patientUpdates.gender = updateData.gender;
            if (updateData.dob || updateData.date_of_birth) patientUpdates.date_of_birth = updateData.dob || updateData.date_of_birth;
            if (updateData.address) patientUpdates.address = updateData.address;
            if (updateData.address_city || updateData.district) patientUpdates.district = updateData.address_city || updateData.district;
            if (updateData.address_state || updateData.village) patientUpdates.village = updateData.address_state || updateData.village;
            if (updateData.abha_id) patientUpdates.abha_id = updateData.abha_id;
            if (updateData.abha_address) patientUpdates.abha_address = updateData.abha_address;

            await supabase
                .from('patients')
                .update(patientUpdates)
                .or(`id.eq.${userId},user_id.eq.${userId}`);

            return this.getUser(userId);
        } catch (err) {
            console.error('[SUPABASE] updateUser error:', err);
            return this.getUser(userId);
        }
    }

    async deleteUser(userId) {
        try {
            await supabase.from('patients').delete().or(`id.eq.${userId},user_id.eq.${userId}`);
            await supabase.from('users').delete().eq('id', userId);
        } catch (e) {}
        return true;
    }

    // ==========================================
    // SWASTHYASETU FACILITIES & MATCHING
    // ==========================================
    async getFacilities(filters = {}) {
        try {
            let query = supabase.from('facilities').select('*');
            if (filters.district) query = query.eq('district', filters.district);
            if (filters.tier) query = query.eq('tier', filters.tier);
            if (filters.emergency_capable !== undefined) query = query.eq('emergency_capable', filters.emergency_capable);

            const { data, error } = await query.order('current_load', { ascending: true });
            if (!error && data && data.length > 0) return data;
        } catch (e) {
            console.warn('[SUPABASE] Facilities fetch notice, using localDb:', e.message);
        }

        let list = localDb.getCollection('facilities');
        if (filters.tier && filters.tier !== 'ALL') {
            list = list.filter(f => f.tier === filters.tier);
        }
        if (filters.emergency_capable) {
            list = list.filter(f => f.emergency_capable === true);
        }
        return list;
    }

    async getFacilityById(facilityId) {
        try {
            const { data, error } = await supabase
                .from('facilities')
                .select('*')
                .eq('id', facilityId)
                .maybeSingle();

            if (!error && data) return data;
        } catch (e) {}

        return localDb.findOne('facilities', f => f.id === facilityId);
    }

    async updateFacilityStatus(facilityId, updateData) {
        const payload = { ...updateData, updated_at: new Date().toISOString() };
        try {
            const { data, error } = await supabase
                .from('facilities')
                .update(payload)
                .eq('id', facilityId)
                .select()
                .single();

            if (!error && data) {
                localDb.update('facilities', f => f.id === facilityId, payload);
                return data;
            }
        } catch (e) {}

        return localDb.update('facilities', f => f.id === facilityId, payload);
    }

    // ==========================================
    // SWASTHYASETU DOCTORS & INTERNAL ASSIGNMENT
    // ==========================================
    async getDoctorsByFacility(facilityId, specialty = null) {
        try {
            let query = supabase.from('doctors').select('*').eq('facility_id', facilityId);
            if (specialty) query = query.ilike('specialty_name', `%${specialty}%`);

            const { data, error } = await query;
            if (!error && data && data.length > 0) return data;
        } catch (e) {}

        let list = localDb.getCollection('doctors');
        if (facilityId) list = list.filter(d => d.facility_id === facilityId);
        return list;
    }

    async assignDoctorToReferral(referralId, doctorId) {
        const doc = localDb.findOne('doctors', d => d.id === doctorId) || { name: 'Dr. Anand Deshmukh', specialty_name: 'OBSTETRICS' };
        const updatePayload = {
            assigned_doctor_id: doctorId,
            status: 'CONSULTATION_IN_PROGRESS',
            updated_at: new Date().toISOString(),
            doctors: doc
        };

        try {
            const { data: ref, error: refErr } = await supabase
                .from('referrals')
                .update({
                    assigned_doctor_id: doctorId,
                    status: 'CONSULTATION_IN_PROGRESS',
                    updated_at: new Date().toISOString()
                })
                .eq('id', referralId)
                .select()
                .single();

            if (!refErr && ref) {
                localDb.update('referrals', r => r.id === referralId, updatePayload);
                return ref;
            }
        } catch (e) {}

        localDb.update('referrals', r => r.id === referralId, updatePayload);
        await this.logReferralEvent(referralId, 'PATIENT_REACHED', 'CONSULTATION_IN_PROGRESS', doctorId, 'DOCTOR', 'Doctor assigned internally');
        return localDb.findOne('referrals', r => r.id === referralId);
    }

    // ==========================================
    // SWASTHYASETU CLINICAL ASSESSMENTS
    // ==========================================
    async createAssessment(assessmentData) {
        const payload = {
            id: 'ass-' + Date.now(),
            patient_id: assessmentData.patient_id,
            assessor_id: assessmentData.assessor_id || null,
            systolic_bp: assessmentData.systolic_bp || null,
            diastolic_bp: assessmentData.diastolic_bp || null,
            pulse_rate: assessmentData.pulse_rate || null,
            spo2: assessmentData.spo2 || null,
            respiratory_rate: assessmentData.respiratory_rate || null,
            temperature: assessmentData.temperature || null,
            is_pregnant: !!assessmentData.is_pregnant,
            danger_signs: assessmentData.danger_signs || null,
            ai_risk_score: assessmentData.ai_risk_score || 0.0,
            computed_risk_level: assessmentData.computed_risk_level || 'LOW',
            ai_triage_explanation: assessmentData.ai_triage_explanation || null,
            created_at: new Date().toISOString()
        };

        try {
            const { data, error } = await supabase
                .from('assessments')
                .insert(payload)
                .select()
                .single();

            if (!error && data) {
                localDb.insert('assessments', data);
                return data;
            }
        } catch (e) {}

        return localDb.insert('assessments', payload);
    }

    async getAssessmentsByPatient(patientId) {
        try {
            const { data, error } = await supabase
                .from('assessments')
                .select('*')
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false });

            if (!error && data && data.length > 0) return data;
        } catch (e) {}

        return localDb.find('assessments', a => a.patient_id === patientId || patientId === 'all');
    }

    // ==========================================
    // SWASTHYASETU CLOSED-LOOP REFERRALS (13-State Machine)
    // ==========================================
    async createReferral(referralData) {
        const fac = localDb.findOne('facilities', f => f.id === referralData.receiving_facility_id) || {
            name: 'District Hospital Nashik',
            tier: 'DISTRICT_HOSPITAL',
            address: 'Civil Hospital Road, Nashik',
            district: 'Nashik'
        };

        const payload = {
            id: 'ref-' + Date.now(),
            patient_id: referralData.patient_id,
            assessment_id: referralData.assessment_id || null,
            referring_facility_id: referralData.referring_facility_id || null,
            referring_user_id: referralData.referring_user_id || null,
            receiving_facility_id: referralData.receiving_facility_id || '22222222-2222-2222-2222-222222222222',
            assigned_doctor_id: referralData.assigned_doctor_id || '44444444-4444-4444-4444-444444444444',
            status: referralData.status || 'TRIAGED',
            risk_level: referralData.risk_level || 'MODERATE',
            urgency: referralData.urgency || 'ROUTINE',
            specialty_required: referralData.specialty_required || 'GENERAL_MEDICINE',
            primary_complaint: referralData.primary_complaint || '',
            clinical_summary: referralData.clinical_summary || '',
            destination_facility_id: referralData.destination_facility_id || null,
            reason_for_referral: referralData.reason_for_referral || '',
            appointment_slot_time: referralData.appointment_slot_time || null,
            slot_token: referralData.slot_token || `Token #${Math.floor(10 + Math.random() * 90)}`,
            created_at: new Date().toISOString(),
            facilities: fac,
            doctors: {
                name: 'Dr. Anand Deshmukh',
                specialty_name: referralData.specialty_required || 'OBSTETRICS'
            }
        };

        try {
            const { data, error } = await supabase
                .from('referrals')
                .insert(payload)
                .select()
                .single();

            if (!error && data) {
                localDb.insert('referrals', data);
                await this.logReferralEvent(data.id, 'INIT', data.status, referralData.referring_user_id || 'system', 'CREATOR', 'Referral created');
                return data;
            }
        } catch (e) {}

        localDb.insert('referrals', payload);
        await this.logReferralEvent(payload.id, 'INIT', payload.status, referralData.referring_user_id || 'system', 'CREATOR', 'Referral created from triage');
        return payload;
    }

    async getReferralById(referralId) {
        try {
            const { data, error } = await supabase
                .from('referrals')
                .select(`*, facilities:receiving_facility_id (*), doctors:assigned_doctor_id (*)`)
                .eq('id', referralId)
                .maybeSingle();

            if (!error && data) return data;
        } catch (e) {}

        return localDb.findOne('referrals', r => r.id === referralId) || localDb.getCollection('referrals')[0];
    }

    async getReferralsByPatient(patientId) {
        try {
            const { data, error } = await supabase
                .from('referrals')
                .select(`*, facilities:receiving_facility_id (name, tier, address, district), doctors:assigned_doctor_id (name, specialty_name)`)
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false });

            if (!error && data && data.length > 0) return data;
        } catch (e) {}

        return localDb.getCollection('referrals');
    }

    async getReferralsByFacility(facilityId, status = null) {
        try {
            let query = supabase.from('referrals').select('*').eq('receiving_facility_id', facilityId);
            if (status) query = query.eq('status', status);
            const { data, error } = await query;
            if (!error && data && data.length > 0) return data;
        } catch (e) {}

        let list = localDb.getCollection('referrals');
        if (status) list = list.filter(r => r.status === status);
        return list;
    }

    async updateReferralStatus(referralId, toStatus, actorUserId, actorRole, reason = '') {
        const current = await this.getReferralById(referralId);
        const fromStatus = current ? current.status : 'INIT';

        try {
            const { data, error } = await supabase
                .from('referrals')
                .update({ status: toStatus, updated_at: new Date().toISOString() })
                .eq('id', referralId)
                .select()
                .single();

            if (!error && data) {
                localDb.update('referrals', r => r.id === referralId, { status: toStatus, updated_at: new Date().toISOString() });
                await this.logReferralEvent(referralId, fromStatus, toStatus, actorUserId, actorRole, reason);
                await this.logAuditEvent('REFERRAL_STATE_CHANGE', actorUserId, referralId, 'SUCCESS', `Status changed to ${toStatus}: ${reason}`);
                return data;
            }
        } catch (e) {}

        localDb.update('referrals', r => r.id === referralId, { status: toStatus, updated_at: new Date().toISOString() });
        await this.logReferralEvent(referralId, fromStatus, toStatus, actorUserId, actorRole, reason);
        await this.logAuditEvent('REFERRAL_STATE_CHANGE', actorUserId, referralId, 'SUCCESS', `Status changed to ${toStatus}: ${reason}`);
        return localDb.findOne('referrals', r => r.id === referralId);
    }

    async logReferralEvent(referralId, fromStatus, toStatus, actorUserId, actorRole, reason = '') {
        const payload = {
            id: 'ev-' + Date.now(),
            referral_id: referralId,
            from_status: fromStatus,
            to_status: toStatus,
            actor_user_id: actorUserId || null,
            actor_role: actorRole || 'SYSTEM',
            reason: reason || '',
            created_at: new Date().toISOString()
        };

        try {
            await supabase.from('referral_events').insert(payload);
        } catch (e) {}

        localDb.insert('referral_events', payload);
    }

    async getReferralTimeline(referralId) {
        try {
            const { data, error } = await supabase
                .from('referral_events')
                .select('*')
                .eq('referral_id', referralId)
                .order('created_at', { ascending: true });

            if (!error && data && data.length > 0) return data;
        } catch (e) {}

        const events = localDb.find('referral_events', ev => ev.referral_id === referralId || referralId === 'all');
        return events.length > 0 ? events : localDb.getCollection('referral_events');
    }

    // ==========================================
    // PRESCRIPTIONS & DIAGNOSTIC ORDERS
    // ==========================================
    async createPrescription(prescriptionData) {
        const digitalHash = crypto
            .createHash('sha256')
            .update(`${prescriptionData.doctor_id}-${prescriptionData.patient_id}-${Date.now()}`)
            .digest('hex');

        const payload = {
            referral_id: prescriptionData.referral_id,
            patient_id: prescriptionData.patient_id,
            doctor_id: prescriptionData.doctor_id,
            facility_id: prescriptionData.facility_id,
            diagnosis: prescriptionData.diagnosis,
            items_json: typeof prescriptionData.items === 'string' ? prescriptionData.items : JSON.stringify(prescriptionData.items || []),
            instructions: prescriptionData.instructions || '',
            digital_signature_hash: digitalHash
        };

        const { data, error } = await supabase
            .from('prescriptions')
            .insert(payload)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    async createDiagnosticOrder(orderData) {
        const payload = {
            referral_id: orderData.referral_id,
            patient_id: orderData.patient_id,
            doctor_id: orderData.doctor_id,
            facility_id: orderData.facility_id,
            test_name: orderData.test_name,
            category: orderData.category || 'GENERAL',
            status: orderData.status || 'PENDING',
            clinical_indication: orderData.clinical_indication || ''
        };

        const { data, error } = await supabase
            .from('diagnostic_orders')
            .insert(payload)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    async getDiagnosticOrdersByReferral(referralId) {
        const { data, error } = await supabase
            .from('diagnostic_orders')
            .select('*')
            .eq('referral_id', referralId);

        if (error) throw new Error(error.message);
        return data || [];
    }

    // ==========================================
    // FOLLOW-UP RECORDS
    // ==========================================
    async createFollowUp(followUpData) {
        const payload = {
            referral_id: followUpData.referral_id,
            patient_id: followUpData.patient_id,
            scheduled_date: followUpData.scheduled_date,
            clinical_notes: followUpData.clinical_notes || '',
            status: 'PENDING'
        };

        const { data, error } = await supabase
            .from('follow_up_records')
            .insert(payload)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    async getFollowUpsByPatient(patientId) {
        const { data, error } = await supabase
            .from('follow_up_records')
            .select('*')
            .eq('patient_id', patientId)
            .order('scheduled_date', { ascending: true });

        if (error) throw new Error(error.message);
        return data || [];
    }

    // ==========================================
    // CAREGIVER RELATIONSHIPS
    // ==========================================
    async createCaregiverLink(patientId, caregiverUserId, relation, scope = 'APPOINTMENTS_ONLY') {
        const payload = {
            patient_id: patientId,
            caregiver_user_id: caregiverUserId,
            relationship_type: relation,
            permission_scope: scope,
            status: 'ACTIVE'
        };

        const { data, error } = await supabase
            .from('caregiver_relationships')
            .insert(payload)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    async getCaregiverLinks(patientId) {
        const { data, error } = await supabase
            .from('caregiver_relationships')
            .select(`
                *,
                caregiver:caregiver_user_id (name, phone, email)
            `)
            .eq('patient_id', patientId)
            .eq('status', 'ACTIVE');

        if (error) throw new Error(error.message);
        return data || [];
    }

    // ==========================================
    // CRYPTOGRAPHIC SECURITY AUDIT LEDGER (SHA-256 Chaining)
    // ==========================================
    async logAuditEvent(eventType, actorUserId, targetResourceId, status, details = '') {
        try {
            // Get last hash for chain
            const { data: lastLog } = await supabase
                .from('security_audit_ledger')
                .select('current_hash')
                .order('timestamp', { ascending: false })
                .limit(1)
                .maybeSingle();

            const prevHash = lastLog?.current_hash || 'GENESIS_BLOCK_HASH_0000000000000000';
            const currHash = crypto
                .createHash('sha256')
                .update(`${prevHash}|${eventType}|${actorUserId}|${targetResourceId}|${Date.now()}`)
                .digest('hex');

            await supabase.from('security_audit_ledger').insert({
                event_type: eventType,
                actor_user_id: String(actorUserId || 'ANONYMOUS'),
                target_resource_id: String(targetResourceId || ''),
                action_status: status,
                previous_hash: prevHash,
                current_hash: currHash,
                details: typeof details === 'object' ? JSON.stringify(details) : String(details)
            });
        } catch (e) {
            console.error('[AUDIT] Failed to write ledger:', e.message);
        }
    }

    async getAuditLogs(limit = 50) {
        const { data, error } = await supabase
            .from('security_audit_ledger')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(limit);

        if (error) throw new Error(error.message);
        return data || [];
    }

    // ==========================================
    // DOCUMENT OPERATIONS (Preserving Lab Reports)
    // ==========================================
    async createDocument(docData) {
        const payload = {
            patient_id: docData.patient_id,
            type: docData.type || 'lab_report',
            file_url: docData.file_url,
            title: docData.title || 'Uploaded Report',
            summary: docData.summary || 'Uploaded Report',
            extracted_data: docData.extracted_data || {},
            is_shared: !!docData.is_shared,
            shared_with: docData.shared_with || []
        };

        const { data, error } = await supabase
            .from('documents')
            .insert(payload)
            .select()
            .single();

        if (error) {
            console.error('[SUPABASE] createDocument error:', error);
            throw new Error(error.message);
        }
        return data;
    }

    async getDocument(docId) {
        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('id', docId)
            .maybeSingle();

        if (error) {
            console.error('[SUPABASE] getDocument error:', error);
            throw new Error(error.message);
        }
        return data;
    }

    async getDocumentsByPatient(patientId) {
        try {
            const { data, error } = await supabase
                .from('documents')
                .select('*')
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false });

            if (!error && data && data.length > 0) return data;
        } catch (e) {}

        return localDb.find('documents', d => d.patient_id === patientId || patientId === 'all');
    }

    async getRecentDoctorActivity(doctorId) {
        try {
            const { data: docs, error } = await supabase
                .from('documents')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (!error && docs) {
                const recentActivity = [];
                for (const doc of docs) {
                    const isCreator = doc.extracted_data?.doctor_id === doctorId;
                    const isShared = doc.shared_with && doc.shared_with.includes(doctorId);

                    if (isCreator || isShared) {
                        const patient = await this.getUser(doc.patient_id);
                        recentActivity.push({
                            ...doc,
                            patient: patient ? { id: patient.id, name: patient.name, phone: patient.phone } : null
                        });
                        if (recentActivity.length >= 12) break;
                    }
                }
                if (recentActivity.length > 0) return recentActivity;
            }
        } catch (e) {}

        return localDb.getCollection('documents');
    }

    async updateDocument(docId, updateData) {
        const payload = { ...updateData, updated_at: new Date().toISOString() };
        try {
            const { data, error } = await supabase
                .from('documents')
                .update(payload)
                .eq('id', docId)
                .select()
                .single();

            if (!error && data) {
                localDb.update('documents', d => d.id === docId, payload);
                return data;
            }
        } catch (e) {}

        return localDb.update('documents', d => d.id === docId, payload);
    }

    async deleteDocument(docId) {
        try {
            await supabase.from('documents').delete().eq('id', docId);
        } catch (e) {}
        localDb.delete('documents', d => d.id === docId);
        return true;
    }

    // ==========================================
    // DOCTOR-PATIENT LINK & APPOINTMENT OPERATIONS
    // ==========================================
    async createDoctorPatientLink(linkData) {
        const payload = {
            doctor_id: linkData.doctor_id,
            patient_id: linkData.patient_id,
            status: linkData.status || 'active',
            permissions: linkData.permissions || { view_records: true, prescribe: true }
        };

        try {
            const { data, error } = await supabase
                .from('doctor_patient_links')
                .upsert(payload, { onConflict: 'doctor_id,patient_id' })
                .select()
                .single();

            if (!error && data) return data;
        } catch (e) {}

        return payload;
    }

    async getDoctorPatientLink(doctorId, patientId) {
        try {
            const { data, error } = await supabase
                .from('doctor_patient_links')
                .select('*')
                .eq('doctor_id', doctorId)
                .eq('patient_id', patientId)
                .eq('status', 'active')
                .maybeSingle();

            if (!error && data) return data;
        } catch (e) {}

        return { doctor_id: doctorId, patient_id: patientId, status: 'active' };
    }

    async getPatientsByDoctor(doctorId) {
        try {
            const { data: links, error: linkErr } = await supabase
                .from('doctor_patient_links')
                .select('patient_id')
                .eq('doctor_id', doctorId)
                .eq('status', 'active');

            if (!linkErr && links && links.length > 0) {
                const patientIds = links.map(l => l.patient_id);
                const { data: patients } = await supabase.from('users').select('*').in('id', patientIds);
                if (patients && patients.length > 0) return patients;
            }
        } catch (e) {}

        return localDb.find('users', u => u.role === 'patient');
    }

    async getDoctorsByPatient(patientId) {
        try {
            const { data: links, error: linkErr } = await supabase
                .from('doctor_patient_links')
                .select('doctor_id')
                .eq('patient_id', patientId)
                .eq('status', 'active');

            if (!linkErr && links && links.length > 0) {
                const doctorIds = links.map(l => l.doctor_id);
                const { data: doctors } = await supabase.from('users').select('*').in('id', doctorIds);
                if (doctors && doctors.length > 0) return doctors;
            }
        } catch (e) {}

        return localDb.find('users', u => u.role === 'doctor');
    }

    async createAppointment(appointmentData) {
        const payload = {
            id: 'apt-' + Date.now(),
            patient_id: appointmentData.patient_id,
            doctor_id: appointmentData.doctor_id,
            appointment_date: appointmentData.appointment_date,
            time_slot: appointmentData.time_slot,
            type: appointmentData.type || 'general',
            department: appointmentData.department || null,
            reason: appointmentData.reason || null,
            status: appointmentData.status || 'confirmed',
            doctor: localDb.findOne('users', u => u.id === appointmentData.doctor_id) || {
                name: 'Dr. Anand Deshmukh',
                specialization: 'OBSTETRICS',
                hospital_name: 'District Hospital Nashik'
            }
        };

        try {
            const { data, error } = await supabase
                .from('appointments')
                .insert(payload)
                .select()
                .single();

            if (!error && data) {
                localDb.insert('appointments', data);
                return data;
            }
        } catch (e) {}

        return localDb.insert('appointments', payload);
    }

    async getAppointmentsByPatient(patientId) {
        try {
            const { data, error } = await supabase
                .from('appointments')
                .select('*')
                .eq('patient_id', patientId)
                .order('appointment_date', { ascending: false });

            if (!error && data && data.length > 0) return data;
        } catch (e) {}

        return localDb.find('appointments', a => a.patient_id === patientId || patientId === 'all');
    }

    async getAppointmentsByDoctor(doctorId) {
        const { data, error } = await supabase
            .from('appointments')
            .select('*')
            .eq('doctor_id', doctorId)
            .order('appointment_date', { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    }

    // ==========================================
    // FAMILY LINK OPERATIONS
    // ==========================================
    async createFamilyLink(linkData) {
        const payload = {
            user_id: linkData.user_id,
            family_member_id: linkData.family_member_id,
            member_name: linkData.member_name || null,
            relation: linkData.relation || 'Family',
            member_phone: linkData.member_phone || null,
            is_verified: !!linkData.is_verified,
            access_level: linkData.access_level || 'view_only',
            status: linkData.status || 'active'
        };

        const { data, error } = await supabase
            .from('family_links')
            .insert(payload)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    async getFamilyLink(userId, memberId) {
        const { data, error } = await supabase
            .from('family_links')
            .select('*')
            .eq('user_id', userId)
            .eq('family_member_id', memberId)
            .maybeSingle();

        if (error) throw new Error(error.message);
        return data;
    }

    async getFamilyMembers(userId) {
        const { data: links1, error: err1 } = await supabase
            .from('family_links')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active');

        const { data: links2, error: err2 } = await supabase
            .from('family_links')
            .select('*')
            .eq('family_member_id', userId)
            .eq('status', 'active');

        if (err1) throw new Error(err1.message);
        if (err2) throw new Error(err2.message);

        const members = [];
        const seenIds = new Set();

        const processLinks = async (links, idField, isInitiator) => {
            if (!links) return;
            for (const link of links) {
                const memberId = link[idField];
                if (seenIds.has(memberId)) continue;
                seenIds.add(memberId);
                const user = await this.getUser(memberId);
                if (user) {
                    members.push({
                        ...user,
                        relation: link.relation || 'Family',
                        linkId: link.id,
                        isInitiator
                    });
                }
            }
        };

        await processLinks(links1, 'family_member_id', false);
        await processLinks(links2, 'user_id', true);
        return members;
    }

    async updateFamilyLink(linkId, data) {
        const payload = { ...data, updated_at: new Date().toISOString() };
        const { data: updated, error } = await supabase
            .from('family_links')
            .update(payload)
            .eq('id', linkId)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return updated;
    }

    async deleteFamilyLink(linkId) {
        const { error } = await supabase
            .from('family_links')
            .delete()
            .eq('id', linkId);

        if (error) throw new Error(error.message);
        return true;
    }

    // ==========================================
    // NOTIFICATIONS
    // ==========================================
    async createNotification(notifData) {
        const payload = {
            user_id: notifData.user_id,
            title: notifData.title,
            message: notifData.message,
            type: notifData.type || 'general',
            is_read: false
        };

        const { data, error } = await supabase
            .from('notifications')
            .insert(payload)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    async getNotifications(userId) {
        const { data, error } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    }

    async markNotificationRead(notifId) {
        const { data, error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notifId)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    // ==========================================
    // FEEDBACK OPERATIONS (Supabase + LocalDb)
    // ==========================================
    async createFeedback(feedbackData) {
        const payload = {
            id: feedbackData.id || crypto.randomUUID(),
            user_id: feedbackData.user_id || null,
            user_role: feedbackData.user_role || 'patient',
            user_name: feedbackData.user_name || 'Anonymous User',
            user_phone: feedbackData.user_phone || null,
            rating: parseInt(feedbackData.rating) || 5,
            category: feedbackData.category || 'General',
            feedback_text: feedbackData.feedback_text || '',
            satisfaction_score: feedbackData.satisfaction_score || `${feedbackData.rating || 5}/5 Stars`,
            metadata: feedbackData.metadata || {},
            created_at: new Date().toISOString()
        };

        try {
            const { data, error } = await supabase
                .from('feedbacks')
                .insert(payload)
                .select()
                .single();

            if (!error && data) {
                localDb.insert('feedbacks', data);
                return data;
            }
        } catch (e) {
            console.warn('[SUPABASE] Feedback create fallback to localDb:', e.message);
        }

        return localDb.insert('feedbacks', payload);
    }

    async getFeedbacks(filter = {}) {
        try {
            let query = supabase
                .from('feedbacks')
                .select('*')
                .order('created_at', { ascending: false });

            if (filter.user_id) query = query.eq('user_id', filter.user_id);
            if (filter.user_role) query = query.eq('user_role', filter.user_role);
            if (filter.category) query = query.eq('category', filter.category);

            const { data, error } = await query;
            if (!error && data && data.length > 0) return data;
        } catch (e) {}

        return localDb.find('feedbacks', f => {
            if (filter.user_id && f.user_id !== filter.user_id) return false;
            if (filter.user_role && f.user_role !== filter.user_role) return false;
            if (filter.category && f.category !== filter.category) return false;
            return true;
        });
    }

    async getFeedbackStats() {
        const all = await this.getFeedbacks();
        const total = all.length;
        const avgRating = total > 0 
            ? (all.reduce((acc, curr) => acc + (Number(curr.rating) || 0), 0) / total).toFixed(1)
            : '5.0';
        
        const byRole = {};
        const byCategory = {};

        all.forEach(f => {
            byRole[f.user_role] = (byRole[f.user_role] || 0) + 1;
            byCategory[f.category] = (byCategory[f.category] || 0) + 1;
        });

        return {
            totalFeedbacks: total,
            averageRating: parseFloat(avgRating),
            byRole,
            byCategory,
            recent: all.slice(0, 10)
        };
    }
}

module.exports = new SupabaseService();
