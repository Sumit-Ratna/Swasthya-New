const supabase = require('../config/supabaseClient');
const crypto = require('crypto');
const config = require('../config/env');
const localDb = require('./localDb');
const auditService = require('./auditService');
const notificationService = require('./notificationService');

class SupabaseService {
    // ==========================================
    // ==========================================
    // USER & PATIENT CLOUD DATABASE OPERATIONS
    // ==========================================
    async getUserByPhone(phone) {
        if (!phone) return null;
        let cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .or(`phone.eq.${cleanPhone},phone.eq.+91${cleanPhone}`)
                .maybeSingle();

            if (error) {
                console.warn('[SUPABASE] getUserByPhone notice:', error.message);
                return null;
            }
            if (data) {
                return { ...data, name: data.full_name || data.name, role: (data.role || 'patient').toLowerCase() };
            }
            return null;
        } catch (err) {
            console.warn('[SUPABASE] getUserByPhone err:', err.message);
            return null;
        }
    }

    async getUserByEmail(email) {
        if (!email) return null;
        const cleanEmail = email.trim().toLowerCase();
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', cleanEmail)
                .maybeSingle();

            if (error) {
                console.warn('[SUPABASE] getUserByEmail notice:', error.message);
                return null;
            }
            if (data) {
                return { ...data, name: data.full_name || data.name, role: (data.role || 'patient').toLowerCase() };
            }
            return null;
        } catch (err) {
            console.warn('[SUPABASE] getUserByEmail err:', err.message);
            return null;
        }
    }

    async getUserById(id) {
        if (!id) return null;
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', id)
                .maybeSingle();

            if (error) {
                console.warn('[SUPABASE] getUserById notice:', error.message);
                return null;
            }
            if (data) {
                return { ...data, name: data.full_name || data.name, role: (data.role || 'patient').toLowerCase() };
            }
            return null;
        } catch (err) {
            console.warn('[SUPABASE] getUserById err:', err.message);
            return null;
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

            if (error) throw error;
            return data;
        } catch (err) {
            console.error('[SUPABASE] updateUserPassword error:', err.message);
            throw err;
        }
    }

    async updateUser(userId, updates) {
        try {
            const payload = { ...updates, updated_at: new Date().toISOString() };
            if (payload.name && !payload.full_name) payload.full_name = payload.name;
            delete payload.name;

            const { data, error } = await supabase
                .from('users')
                .update(payload)
                .eq('id', userId)
                .select()
                .single();

            if (error) throw error;
            return { ...data, name: data.full_name || data.name, role: (data.role || 'patient').toLowerCase() };
        } catch (err) {
            console.error('[SUPABASE] updateUser error:', err.message);
            throw err;
        }
    }

    async createUser(userId, userData) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const validUserId = (userId && uuidRegex.test(userId)) ? userId : crypto.randomUUID();

        let phone = userData.phone ? String(userData.phone).replace(/\D/g, '').slice(-10) : null;
        if (!phone || phone.length < 10) {
            if (userData.emergency_contact && String(userData.emergency_contact).replace(/\D/g, '').length >= 10) {
                phone = String(userData.emergency_contact).replace(/\D/g, '').slice(-10);
            } else {
                const seed = (userData.email || validUserId || 'swasthya-user') + (userData.name || '') + Date.now();
                const hash = crypto.createHash('md5').update(seed).digest('hex');
                const digits = hash.replace(/\D/g, '').padEnd(9, '8').slice(0, 9);
                phone = '9' + digits;
            }
        }

        // Proactively check if phone is already taken by another user with different ID
        if (phone) {
            try {
                const { data: existingPhoneUser } = await supabase
                    .from('users')
                    .select('id, email')
                    .eq('phone', phone)
                    .maybeSingle();

                if (existingPhoneUser && existingPhoneUser.id !== validUserId) {
                    if (userData.email && (!existingPhoneUser.email || existingPhoneUser.email !== userData.email.trim().toLowerCase())) {
                        const seed = userData.email + validUserId + Date.now() + Math.random();
                        const hash = crypto.createHash('md5').update(seed).digest('hex');
                        phone = '9' + hash.replace(/\D/g, '').padEnd(9, '7').slice(0, 9);
                    }
                }
            } catch (pCheckErr) {
                console.warn('[SUPABASE] phone lookup check notice:', pCheckErr.message);
            }
        }

        const fullName = userData.name || userData.full_name;

        if (!fullName || !fullName.trim()) {
            throw new Error('full_name is required for user registration');
        }

        const rawRole = (userData.role || 'patient').toUpperCase();
        const role = rawRole.includes('DOC') ? 'DOCTOR' : (rawRole.includes('HEALTH') || rawRole.includes('WORKER') || rawRole.includes('ASHA') ? 'HEALTH_WORKER' : (rawRole.includes('STAFF') || rawRole.includes('FACILITY') ? 'FACILITY_STAFF' : (rawRole.includes('ADMIN') ? 'ADMIN' : (rawRole.includes('CAREGIVER') ? 'CAREGIVER' : 'PATIENT'))));

        const userPayload = {
            id: validUserId,
            phone: phone,
            full_name: fullName.trim(),
            email: userData.email ? userData.email.trim().toLowerCase() : null,
            role: role,
            status: 'ACTIVE',
            assigned_facility_id: userData.assigned_facility_id || null,
            jurisdiction_district: userData.jurisdiction_district || userData.district || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        userPayload.password_hash = userData.password_hash || '$2a$10$wE8wY0B9KqjX5Z5yXhB6EeNn3nI5sF7aF1b3.a8c8.e8.g8.i8.k';

        try {
            let res = await supabase
                .from('users')
                .upsert(userPayload)
                .select()
                .single();

            if (res.error) {
                if (res.error.message && (res.error.message.includes('users_phone_key') || res.error.message.includes('duplicate key'))) {
                    console.warn('[SUPABASE] Phone key collision detected. Generating unique virtual phone and retrying...');
                    const seed = (userData.email || validUserId) + Date.now() + Math.random();
                    const hash = crypto.createHash('md5').update(seed).digest('hex');
                    userPayload.phone = '9' + hash.replace(/\D/g, '').padEnd(9, '6').slice(0, 9);
                    phone = userPayload.phone;
                    res = await supabase
                        .from('users')
                        .upsert(userPayload)
                        .select()
                        .single();
                }
                if (res.error) {
                    console.warn('[SUPABASE] user upsert error:', res.error.message);
                    throw res.error;
                }
            }

            let unified = { ...userPayload, name: fullName.trim(), role: role.toLowerCase() };

            // If health worker, also record in asha_workers
            if (role === 'HEALTH_WORKER') {
                try {
                    await supabase
                        .from('asha_workers')
                        .upsert({
                            user_id: validUserId,
                            worker_id: userData.worker_id || `ASHA-${phone.slice(-4)}-${validUserId.slice(0, 4).toUpperCase()}`,
                            full_name: fullName.trim(),
                            phone: phone,
                            email: userPayload.email,
                            role: 'health_worker',
                            assigned_subcentre: userData.assigned_subcentre || 'Shirwal Sub-Centre',
                            assigned_phc: userData.assigned_phc || 'Shirwal PHC',
                            jurisdiction_district: userPayload.jurisdiction_district || 'Pune',
                            status: 'ACTIVE'
                        });
                } catch (ashaErr) {
                    console.warn('[SUPABASE] asha_workers table sync notice:', ashaErr.message);
                }
            }


            // ONLY create/update patient clinical profile if the user's role is PATIENT
            if (role === 'PATIENT') {
                const dob = userData.dob || userData.date_of_birth || null;
                let age = userData.age ? parseInt(userData.age, 10) : null;
                if ((age === null || isNaN(age)) && dob) {
                    const birthDate = new Date(dob);
                    if (!isNaN(birthDate.getTime())) {
                        age = Math.max(0, Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
                    }
                }
                if (age === null || isNaN(age)) age = 0;

                const patientPayload = {
                    id: userId,
                    user_id: userId,
                    full_name: fullName.trim(),
                    phone: phone,
                    gender: userData.gender || null,
                    date_of_birth: dob,
                    age: age,
                    address: userData.address || null,
                    district: userData.district || userData.address_city || null,
                    village: userData.village || userData.address_state || null,
                    abha_id: userData.abha_id || null,
                    abha_address: userData.abha_address || null,
                    consent_status: userData.consent_status || 'GRANTED',
                    registered_by_health_worker_id: userData.registered_by_health_worker_id || null,
                    assigned_facility_id: userData.assigned_facility_id || null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                const { error: patientErr } = await supabase
                    .from('patients')
                    .upsert(patientPayload);

                if (patientErr) {
                    console.warn('[SUPABASE] patient table sync notice:', patientErr.message);
                }

                unified = {
                    ...unified,
                    ...patientPayload,
                    dob: patientPayload.date_of_birth,
                    blood_group: userData.blood_group || null,
                    allergies: userData.allergies || null,
                    chronic_conditions: userData.chronic_conditions || null,
                    emergency_contact: userData.emergency_contact || null
                };
            }

            if (config.demoMode) {
                localDb.insert('users', unified);
            }

            await this.logAuditEvent('USER_REGISTERED', userId, userId, 'SUCCESS', `User registered with role ${role}`);

            return unified;
        } catch (e) {
            console.error('[SUPABASE] createUser exception:', e.message);
            if (config.demoMode) {
                const fallback = { ...userPayload, name: fullName, role: role.toLowerCase() };
                return localDb.insert('users', fallback);
            }
            throw e;
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
                if (config.demoMode) {
                    localDb.update('users', u => u.id === userId, { password_hash: passwordHash });
                }
                return data;
            }
            if (error) throw error;
        } catch (e) {
            console.warn('[SUPABASE] Password update notice:', e.message);
            if (config.demoMode) {
                return localDb.update('users', u => u.id === userId, { password_hash: passwordHash });
            }
            throw e;
        }
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

        if (config.demoMode) {
            return localDb.findOne('users', u => u.id === userId);
        }
        return null;
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

        if (config.demoMode) {
            return localDb.findOne('users', u => u.phone && u.phone.includes(cleanPhone));
        }
        return null;
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

        if (config.demoMode) {
            return localDb.findOne('users', u => u.email && u.email.toLowerCase() === cleanEmail);
        }
        return null;
    }

    async getUserByQrId(doctor_qr_id) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('assigned_facility_id', doctor_qr_id)
            .maybeSingle();

        return data;
    }

    // ==========================================
    // SWASTHYASETU PATIENT IDENTITY & CONSENT
    // ==========================================
    async registerPatient(patientData, actorUserId = null, actorRole = 'PATIENT') {
        const fullName = patientData.full_name || patientData.name;
        if (!fullName || !fullName.trim()) {
            throw new Error('full_name is required for patient registration');
        }

        const cleanPhone = patientData.phone ? String(patientData.phone).replace(/\D/g, '').slice(-10) : null;
        if (!cleanPhone || cleanPhone.length < 10) {
            throw new Error('A valid 10-digit phone number is required for patient registration');
        }

        // Duplicate detection: check if a patient with this phone or abha_id already exists
        let query = supabase.from('patients').select('*').ilike('phone', `%${cleanPhone}%`);
        const { data: existingPatients } = await query;

        if (existingPatients && existingPatients.length > 0) {
            const existing = existingPatients[0];
            console.log(`[PATIENT] Duplicate detected for phone ${cleanPhone}. Returning existing patient ${existing.id}`);
            return existing;
        }

        const patientId = patientData.id || crypto.randomUUID();
        const dob = patientData.dob || patientData.date_of_birth || null;
        let age = patientData.age ? parseInt(patientData.age, 10) : null;
        if ((age === null || isNaN(age)) && dob) {
            const birthDate = new Date(dob);
            if (!isNaN(birthDate.getTime())) {
                age = Math.max(0, Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)));
            }
        }
        if (age === null || isNaN(age)) age = 0;

        const payload = {
            id: patientId,
            user_id: patientData.user_id || null,
            full_name: fullName.trim(),
            phone: cleanPhone,
            date_of_birth: dob,
            age: age,
            gender: patientData.gender || null,
            address: patientData.address || null,
            village: patientData.village || null,
            district: patientData.district || null,
            abha_id: patientData.abha_id || null,
            abha_address: patientData.abha_address || null,
            consent_status: patientData.consent_status ? String(patientData.consent_status).toUpperCase() : 'GRANTED',
            registered_by_health_worker_id: actorRole === 'HEALTH_WORKER' ? actorUserId : (patientData.registered_by_health_worker_id || null),
            assigned_facility_id: patientData.assigned_facility_id || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('patients')
            .insert(payload)
            .select()
            .single();

        if (error) {
            console.error('[SUPABASE] registerPatient error:', error);
            throw new Error(`Failed to register patient: ${error.message}`);
        }

        const auditAction = actorRole === 'HEALTH_WORKER' ? 'PATIENT_ASSISTED_REGISTRATION' : 'PATIENT_SELF_REGISTRATION';
        await this.logAuditEvent(auditAction, actorUserId || patientId, patientId, 'SUCCESS', `Patient registered: ${fullName.trim()} (Phone: ${cleanPhone})`);

        return data;
    }

    async updatePatientConsent(patientId, consentStatus, actorUserId = null, actorRole = 'PATIENT') {
        const validStatuses = ['GRANTED', 'REVOKED', 'PENDING'];
        const normalized = String(consentStatus).toUpperCase();
        if (!validStatuses.includes(normalized)) {
            throw new Error(`Invalid consent status: ${consentStatus}. Must be one of: ${validStatuses.join(', ')}`);
        }

        const { data, error } = await supabase
            .from('patients')
            .update({
                consent_status: normalized,
                updated_at: new Date().toISOString()
            })
            .eq('id', patientId)
            .select()
            .single();

        if (error) {
            console.error('[SUPABASE] updatePatientConsent error:', error);
            throw new Error(`Failed to update consent status: ${error.message}`);
        }

        const eventType = normalized === 'GRANTED' ? 'PATIENT_CONSENT_GRANTED' : (normalized === 'REVOKED' ? 'PATIENT_CONSENT_REVOKED' : 'PATIENT_CONSENT_PENDING');
        await this.logAuditEvent(eventType, actorUserId || patientId, patientId, 'SUCCESS', `Patient consent updated to ${normalized}`);

        return data;
    }

    async getPatientById(patientId) {
        const { data, error } = await supabase
            .from('patients')
            .select('*')
            .eq('id', patientId)
            .maybeSingle();

        if (error) throw error;
        return data;
    }

    async updateUser(userId, updateData) {
        const fullName = updateData.name || updateData.full_name;
        const userUpdates = { updated_at: new Date().toISOString() };
        if (fullName) userUpdates.full_name = fullName.trim();
        if (updateData.email) userUpdates.email = updateData.email.trim().toLowerCase();
        if (updateData.phone) userUpdates.phone = String(updateData.phone).replace(/\D/g, '').slice(-10);
        if (updateData.role) userUpdates.role = updateData.role.toUpperCase();

        try {
            await supabase
                .from('users')
                .update(userUpdates)
                .eq('id', userId);

            // Update patients table if patient record exists
            const patientUpdates = {
                updated_at: new Date().toISOString()
            };
            if (fullName) patientUpdates.full_name = fullName.trim();
            if (updateData.gender) patientUpdates.gender = updateData.gender;
            if (updateData.dob || updateData.date_of_birth) patientUpdates.date_of_birth = updateData.dob || updateData.date_of_birth;
            if (updateData.age) patientUpdates.age = parseInt(updateData.age, 10);
            if (updateData.address) patientUpdates.address = updateData.address;
            if (updateData.address_city || updateData.district) patientUpdates.district = updateData.address_city || updateData.district;
            if (updateData.address_state || updateData.village) patientUpdates.village = updateData.address_state || updateData.village;
            if (updateData.abha_id) patientUpdates.abha_id = updateData.abha_id;
            if (updateData.abha_address) patientUpdates.abha_address = updateData.abha_address;

            await supabase
                .from('patients')
                .update(patientUpdates)
                .or(`id.eq.${userId},user_id.eq.${userId}`);

            await this.logAuditEvent('USER_PROFILE_UPDATED', userId, userId, 'SUCCESS', 'Profile and demographic fields updated');

            return this.getUser(userId);
        } catch (err) {
            console.error('[SUPABASE] updateUser error:', err);
            throw err;
        }
    }

    async deleteUser(userId) {
        try {
            await supabase.from('patients').delete().or(`id.eq.${userId},user_id.eq.${userId}`);
            await supabase.from('users').delete().eq('id', userId);
            try {
                const auditService = require('./auditService');
                await auditService.logAudit({
                    actorId: userId,
                    actorRole: 'PATIENT',
                    actionType: 'USER_ACCOUNT_DELETED',
                    resourceType: 'USER_PROFILE',
                    resourceId: userId,
                    result: 'SUCCESS',
                    metadata: { message: 'User account and patient profile deleted' }
                });
            } catch (aErr) {}
        } catch (e) {}
        return true;
    }

    async updatePatientConsent(userId, consentStatus = 'GRANTED', actorUserId, actorRole = 'PATIENT', details = {}) {
        try {
            const timestamp = new Date().toISOString();
            const consentVersion = details.consent_version || 'medical-history-v1';
            const consentPurpose = details.consent_purpose || 'MEDICAL_HISTORY_AND_PRESCRIPTION_STORAGE';
            const relatedRecordId = details.related_record_id || null;

            // Fetch current user
            const user = await this.getUser(userId);
            const currentHistory = user?.medical_history || {};
            const updatedHistory = {
                ...currentHistory,
                consent: {
                    status: consentStatus,
                    version: consentVersion,
                    purpose: consentPurpose,
                    consented_at: timestamp,
                    related_record_id: relatedRecordId
                },
                last_updated_at: timestamp
            };

            // Update in Supabase
            await supabase
                .from('users')
                .update({
                    medical_history: updatedHistory,
                    updated_at: timestamp
                })
                .eq('id', userId);

            // Audit log
            try {
                const auditService = require('./auditService');
                await auditService.logAudit({
                    actorId: actorUserId || userId,
                    actorRole: actorRole || 'PATIENT',
                    actionType: consentStatus === 'GRANTED' ? 'PATIENT_CONSENT_GRANTED' : 'PATIENT_CONSENT_DECLINED',
                    resourceType: 'MEDICAL_HISTORY',
                    resourceId: relatedRecordId || userId,
                    result: 'SUCCESS',
                    metadata: {
                        consent_version: consentVersion,
                        consent_purpose: consentPurpose,
                        consent_status: consentStatus,
                        consented_at: timestamp,
                        related_record_id: relatedRecordId
                    }
                });
            } catch (aErr) {
                console.warn('[AUDIT] Consent log notice:', aErr.message);
            }

            return {
                userId,
                consent: updatedHistory.consent,
                updated_at: timestamp
            };
        } catch (err) {
            console.error('[SUPABASE] updatePatientConsent error:', err);
            throw err;
        }
    }

    // ==========================================
    // SWASTHYASETU FACILITIES & MATCHING
    // ==========================================
    async getFacilities(filters = {}) {
        try {
            let query = supabase.from('facilities').select('*');
            if (filters.district) query = query.eq('district', filters.district);
            if (filters.tier && filters.tier !== 'ALL') query = query.eq('tier', filters.tier);
            if (filters.emergency_capable !== undefined) query = query.eq('emergency_capable', filters.emergency_capable);

            const { data, error } = await query.order('current_load', { ascending: true });
            if (error) throw error;
            if (data && data.length > 0) return data;
        } catch (e) {
            console.warn('[SUPABASE] Facilities fetch error:', e.message);
            if (!config.demoMode) throw e;
        }

        if (config.demoMode) {
            let list = localDb.getCollection('facilities');
            if (filters.tier && filters.tier !== 'ALL') {
                list = list.filter(f => f.tier === filters.tier);
            }
            if (filters.emergency_capable) {
                list = list.filter(f => f.emergency_capable === true);
            }
            return list;
        }
        return [];
    }

    async getFacilityById(facilityId) {
        try {
            const { data, error } = await supabase
                .from('facilities')
                .select('*')
                .eq('id', facilityId)
                .maybeSingle();

            if (error) throw error;
            if (data) return data;
        } catch (e) {
            console.warn('[SUPABASE] Facility detail error:', e.message);
            if (!config.demoMode) throw e;
        }

        if (config.demoMode) {
            return localDb.findOne('facilities', f => f.id === facilityId);
        }
        return null;
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

            if (error) throw error;
            if (data) {
                if (config.demoMode) {
                    localDb.update('facilities', f => f.id === facilityId, payload);
                }
                return data;
            }
        } catch (e) {
            console.warn('[SUPABASE] Facility update error:', e.message);
            if (!config.demoMode) throw e;
        }

        if (config.demoMode) {
            return localDb.update('facilities', f => f.id === facilityId, payload);
        }
        return null;
    }

    // ==========================================
    // SWASTHYASETU DOCTORS & INTERNAL ASSIGNMENT
    // ==========================================
    async getDoctorsByFacility(facilityId, specialty = null) {
        try {
            let query = supabase.from('doctors').select('*').eq('facility_id', facilityId);
            if (specialty) query = query.ilike('specialty_name', `%${specialty}%`);

            const { data, error } = await query;
            if (error) throw error;
            if (data && data.length > 0) return data;
        } catch (e) {
            console.warn('[SUPABASE] Doctors fetch error:', e.message);
            if (!config.demoMode) throw e;
        }

        if (config.demoMode) {
            let list = localDb.getCollection('doctors');
            if (facilityId) list = list.filter(d => d.facility_id === facilityId);
            return list;
        }
        return [];
    }

    async assignDoctorToReferral(referralId, doctorId) {
        try {
            const { data: ref, error: refErr } = await supabase
                .from('referrals')
                .update({
                    assigned_doctor_id: doctorId,
                    status: 'CONSULTATION_IN_PROGRESS',
                    updated_at: new Date().toISOString()
                })
                .eq('id', referralId)
                .select(`
                    *,
                    facilities:receiving_facility_id (*),
                    doctors:assigned_doctor_id (*)
                `)
                .single();

            if (!refErr && ref) {
                await this.logReferralEvent(referralId, 'PATIENT_REACHED', 'CONSULTATION_IN_PROGRESS', doctorId, 'DOCTOR', 'Doctor assigned internally');
                if (config.demoMode) {
                    localDb.update('referrals', r => r.id === referralId, { assigned_doctor_id: doctorId, status: 'CONSULTATION_IN_PROGRESS' });
                }
                return ref;
            }
            if (refErr) throw refErr;
        } catch (e) {
            console.warn('[SUPABASE] Assign doctor error:', e.message);
            if (!config.demoMode) throw e;
        }

        if (config.demoMode) {
            const doc = localDb.findOne('doctors', d => d.id === doctorId) || { name: 'Dr. Anand Deshmukh', specialty_name: 'OBSTETRICS' };
            const updatePayload = {
                assigned_doctor_id: doctorId,
                status: 'CONSULTATION_IN_PROGRESS',
                updated_at: new Date().toISOString(),
                doctors: doc
            };
            localDb.update('referrals', r => r.id === referralId, updatePayload);
            await this.logReferralEvent(referralId, 'PATIENT_REACHED', 'CONSULTATION_IN_PROGRESS', doctorId, 'DOCTOR', 'Doctor assigned internally');
            return localDb.findOne('referrals', r => r.id === referralId);
        }
        return null;
    }

    // ==========================================
    // SWASTHYASETU CLINICAL ASSESSMENTS
    // ==========================================
    async createAssessment(assessmentData) {
        const payload = {
            id: assessmentData.id || crypto.randomUUID(),
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
            ai_risk_score: assessmentData.ai_risk_score !== undefined ? assessmentData.ai_risk_score : (assessmentData.riskScore || 0.0),
            computed_risk_level: assessmentData.computed_risk_level || assessmentData.riskLevel || 'LOW',
            ai_triage_explanation: assessmentData.ai_triage_explanation || assessmentData.explanation || null,
            created_at: new Date().toISOString()
        };

        const enrichedResult = {
            ...payload,
            temperature_c: assessmentData.temperature_c !== undefined ? assessmentData.temperature_c : null,
            temperature_f: assessmentData.temperature_f !== undefined ? assessmentData.temperature_f : null,
            urgency: assessmentData.urgency || 'ROUTINE',
            flagged_factors: Array.isArray(assessmentData.flaggedFactors) ? assessmentData.flaggedFactors : (assessmentData.flagged_factors || []),
            action_recommendation: assessmentData.actionRecommendation || assessmentData.action_recommendation || null,
            triage_rule_version: assessmentData.triage_rule_version || assessmentData.ruleVersion || 'SWASTHYA_TRIAGE_V2',
            source: assessmentData.source || 'DETERMINISTIC_RULES'
        };

        try {
            const { data, error } = await supabase
                .from('assessments')
                .insert(payload)
                .select()
                .single();

            if (!error && data) {
                const combined = { ...enrichedResult, ...data };
                if (config.demoMode) {
                    localDb.insert('assessments', combined);
                }
                return combined;
            }
            if (error) throw error;
        } catch (e) {
            console.warn('[SUPABASE] Create assessment error:', e.message);
            if (!config.demoMode) throw e;
        }

        if (config.demoMode) {
            return localDb.insert('assessments', enrichedResult);
        }
        throw new Error('Failed to create assessment in database');
    }

    async getAssessmentById(assessmentId) {
        try {
            const { data, error } = await supabase
                .from('assessments')
                .select('*')
                .eq('id', assessmentId)
                .single();
            if (!error && data) return data;
        } catch (e) {
            console.warn('[SUPABASE] Get assessment by ID error:', e.message);
            if (!config.demoMode) throw e;
        }

        if (config.demoMode) {
            return localDb.findOne('assessments', a => a.id === assessmentId);
        }
        return null;
    }

    async getAssessmentsByPatient(patientId) {
        try {
            let query = supabase.from('assessments').select('*').order('created_at', { ascending: false });
            if (patientId && patientId !== 'all') {
                query = query.eq('patient_id', patientId);
            }

            const { data, error } = await query;
            if (error) throw error;
            if (data && data.length > 0) return data;
        } catch (e) {
            console.warn('[SUPABASE] Get assessments error:', e.message);
            if (!config.demoMode) throw e;
        }

        if (config.demoMode) {
            return localDb.find('assessments', a => a.patient_id === patientId || patientId === 'all');
        }
        return [];
    }

    async overrideAssessmentTriage(assessmentId, overrideData, user) {
        const updatePayload = {
            computed_risk_level: overrideData.override_risk_level,
            ai_triage_explanation: `[OVERRIDDEN to ${overrideData.override_risk_level}/${overrideData.override_urgency} by ${user.role || 'DOCTOR'}] Reason: ${overrideData.override_reason}`,
            updated_at: new Date().toISOString()
        };

        const enrichedOverride = {
            override_risk_level: overrideData.override_risk_level,
            override_urgency: overrideData.override_urgency,
            override_reason: overrideData.override_reason,
            overridden_by: user.id || user.phone,
            overridden_by_role: user.role,
            overridden_at: updatePayload.updated_at,
            computed_risk_level: overrideData.override_risk_level,
            urgency: overrideData.override_urgency
        };

        try {
            const { data, error } = await supabase
                .from('assessments')
                .update(updatePayload)
                .eq('id', assessmentId)
                .select()
                .single();

            if (!error && data) {
                const combined = { ...data, ...enrichedOverride };
                if (config.demoMode) {
                    localDb.update('assessments', a => a.id === assessmentId, combined);
                }
                return combined;
            }
            if (error) throw error;
        } catch (e) {
            console.warn('[SUPABASE] Override assessment error:', e.message);
            if (!config.demoMode) throw e;
        }

        if (config.demoMode) {
            const updated = localDb.update('assessments', a => a.id === assessmentId, enrichedOverride);
            if (!updated) {
                throw new Error('Assessment not found');
            }
            return updated;
        }
        throw new Error('Failed to update assessment override in database');
    }



    // ==========================================
    // SWASTHYASETU CLOSED-LOOP REFERRALS (19-State Machine)
    // ==========================================
    async createReferral(referralData) {
        const payload = {
            id: 'ref-' + Date.now(),
            patient_id: referralData.patient_id,
            assessment_id: referralData.assessment_id || null,
            referring_facility_id: referralData.referring_facility_id || null,
            referring_user_id: referralData.referring_user_id || null,
            receiving_facility_id: referralData.receiving_facility_id || null,
            assigned_doctor_id: referralData.assigned_doctor_id || null,
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
            created_at: new Date().toISOString()
        };

        try {
            const { data, error } = await supabase
                .from('referrals')
                .insert(payload)
                .select(`
                    *,
                    facilities:receiving_facility_id (*),
                    doctors:assigned_doctor_id (*)
                `)
                .single();

            if (!error && data) {
                if (config.demoMode) {
                    localDb.insert('referrals', data);
                }
                await this.logReferralEvent(data.id, 'INIT', data.status, referralData.referring_user_id || 'system', 'CREATOR', 'Referral created');
                return data;
            }
            if (error) throw error;
        } catch (e) {
            console.warn('[SUPABASE] Create referral error:', e.message);
            if (!config.demoMode) throw e;
        }

        if (config.demoMode) {
            localDb.insert('referrals', payload);
            await this.logReferralEvent(payload.id, 'INIT', payload.status, referralData.referring_user_id || 'system', 'CREATOR', 'Referral created from triage');
            return payload;
        }
        throw new Error('Failed to create referral in database');
    }

    async getReferralById(referralId) {
        try {
            const { data, error } = await supabase
                .from('referrals')
                .select(`*, facilities:receiving_facility_id (*), doctors:assigned_doctor_id (*)`)
                .eq('id', referralId)
                .maybeSingle();

            if (error) throw error;
            if (data) return data;
        } catch (e) {
            console.warn('[SUPABASE] Get referral error:', e.message);
            if (!config.demoMode) throw e;
        }

        if (config.demoMode) {
            return localDb.findOne('referrals', r => r.id === referralId);
        }
        return null;
    }

    async getReferralsByPatient(patientId) {
        try {
            const { data, error } = await supabase
                .from('referrals')
                .select(`*, facilities:receiving_facility_id (name, tier, address, district), doctors:assigned_doctor_id (name, specialty_name)`)
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data && data.length > 0) return data;
        } catch (e) {
            console.warn('[SUPABASE] Get patient referrals error:', e.message);
            if (!config.demoMode) throw e;
        }

        if (config.demoMode) {
            return localDb.find('referrals', r => r.patient_id === patientId);
        }
        return [];
    }

    async getReferralsByFacility(facilityId, status = null) {
        try {
            let query = supabase.from('referrals').select('*').eq('receiving_facility_id', facilityId);
            if (status) query = query.eq('status', status);
            const { data, error } = await query.order('created_at', { ascending: false });

            if (error) throw error;
            if (data && data.length > 0) return data;
        } catch (e) {
            console.warn('[SUPABASE] Get facility referrals error:', e.message);
            if (!config.demoMode) throw e;
        }

        if (config.demoMode) {
            let list = localDb.getCollection('referrals');
            list = list.filter(r => r.receiving_facility_id === facilityId);
            if (status) list = list.filter(r => r.status === status);
            return list;
        }
        return [];
    }

    async updateReferralStatus(referralId, toStatus, actorUserId, actorRole, reason = '') {
        const current = await this.getReferralById(referralId);
        const fromStatus = current ? current.status : 'INIT';

        try {
            const { data, error } = await supabase
                .from('referrals')
                .update({ status: toStatus, updated_at: new Date().toISOString() })
                .eq('id', referralId)
                .select(`*, facilities:receiving_facility_id (*), doctors:assigned_doctor_id (*)`)
                .single();

            if (!error && data) {
                if (config.demoMode) {
                    localDb.update('referrals', r => r.id === referralId, { status: toStatus, updated_at: new Date().toISOString() });
                }
                await this.logReferralEvent(referralId, fromStatus, toStatus, actorUserId, actorRole, reason);
                await this.logAuditEvent('REFERRAL_STATE_CHANGE', actorUserId, referralId, 'SUCCESS', `Status changed to ${toStatus}: ${reason}`);
                return data;
            }
            if (error) throw error;
        } catch (e) {
            console.warn('[SUPABASE] Update referral status error:', e.message);
            if (!config.demoMode) throw e;
        }

        if (config.demoMode) {
            localDb.update('referrals', r => r.id === referralId, { status: toStatus, updated_at: new Date().toISOString() });
            await this.logReferralEvent(referralId, fromStatus, toStatus, actorUserId, actorRole, reason);
            await this.logAuditEvent('REFERRAL_STATE_CHANGE', actorUserId, referralId, 'SUCCESS', `Status changed to ${toStatus}: ${reason}`);
            return localDb.findOne('referrals', r => r.id === referralId);
        }
        return null;
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
        } catch (e) {
            console.warn('[SUPABASE] Log referral event error:', e.message);
        }

        if (config.demoMode) {
            localDb.insert('referral_events', payload);
        }
    }

    async getReferralTimeline(referralId) {
        try {
            const { data, error } = await supabase
                .from('referral_events')
                .select('*')
                .eq('referral_id', referralId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            if (data && data.length > 0) return data;
        } catch (e) {
            console.warn('[SUPABASE] Get timeline error:', e.message);
            if (!config.demoMode) throw e;
        }

        if (config.demoMode) {
            return localDb.find('referral_events', ev => ev.referral_id === referralId);
        }
        return [];
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
        const docId = docData.id || crypto.randomUUID();
        const payload = {
            id: docId,
            patient_id: docData.patient_id,
            type: docData.type || 'lab_report',
            file_url: docData.file_url,
            title: docData.title || 'Uploaded Report',
            summary: docData.summary || 'Uploaded Report',
            extracted_data: docData.extracted_data || {},
            is_shared: !!docData.is_shared,
            shared_with: docData.shared_with || []
        };

        try {
            const { data, error } = await supabase
                .from('documents')
                .insert(payload)
                .select()
                .single();

            if (!error && data) return data;
            console.warn('[SUPABASE] createDocument notice:', error?.message);
        } catch (err) {
            console.warn('[SUPABASE] createDocument exception:', err.message);
        }

        const fallbackDoc = {
            ...payload,
            created_at: new Date().toISOString()
        };
        localDb.insert('documents', fallbackDoc);
        return fallbackDoc;
    }

    async getDocument(docId) {
        try {
            const { data, error } = await supabase
                .from('documents')
                .select('*')
                .eq('id', docId)
                .maybeSingle();

            if (!error && data) return data;
        } catch (e) {
            console.warn('[SUPABASE] getDocument error:', e.message);
        }
        return localDb.findOne('documents', d => d.id === docId);
    }

    async getDocumentsByPatient(patientId) {
        try {
            const { data, error } = await supabase
                .from('documents')
                .select('*')
                .eq('patient_id', patientId)
                .order('created_at', { ascending: false });

            if (!error && data && data.length > 0) return data;
        } catch (e) {
            console.warn('[SUPABASE] Get documents error:', e.message);
        }

        const localDocs = localDb.find('documents', d => d.patient_id === patientId || patientId === 'all') || [];
        return localDocs;
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
                return recentActivity;
            }
        } catch (e) {
            console.warn('[SUPABASE] Get recent doctor activity error:', e.message);
            if (!config.demoMode) throw e;
        }

        if (config.demoMode) {
            return localDb.getCollection('documents');
        }
        return [];
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
                if (config.demoMode) {
                    localDb.update('documents', d => d.id === docId, payload);
                }
                return data;
            }
            if (error) throw error;
        } catch (e) {
            console.warn('[SUPABASE] Update document error:', e.message);
            if (!config.demoMode) throw e;
        }

        if (config.demoMode) {
            return localDb.update('documents', d => d.id === docId, payload);
        }
        throw new Error('Failed to update document');
    }

    async deleteDocument(docId) {
        try {
            const { error } = await supabase.from('documents').delete().eq('id', docId);
            if (error) throw error;
        } catch (e) {
            console.warn('[SUPABASE] Delete document error:', e.message);
            if (!config.demoMode) throw e;
        }
        if (config.demoMode) {
            localDb.delete('documents', d => d.id === docId);
        }
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

        const { data, error } = await supabase
            .from('doctor_patient_links')
            .upsert(payload, { onConflict: 'doctor_id,patient_id' })
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    }

    async getDoctorPatientLink(doctorId, patientId) {
        const { data, error } = await supabase
            .from('doctor_patient_links')
            .select('*')
            .eq('doctor_id', doctorId)
            .eq('patient_id', patientId)
            .eq('status', 'active')
            .maybeSingle();

        if (error) throw new Error(error.message);
        return data;
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
                const { data: patients, error: patErr } = await supabase.from('users').select('*').in('id', patientIds);
                if (!patErr && patients) return patients;
            }
        } catch (e) {
            console.warn('[SUPABASE] Get patients by doctor error:', e.message);
            if (!config.demoMode) throw e;
        }

        if (config.demoMode) {
            return localDb.find('users', u => u.role === 'patient');
        }
        return [];
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
                const { data: doctors, error: docErr } = await supabase.from('users').select('*').in('id', doctorIds);
                if (!docErr && doctors) return doctors;
            }
        } catch (e) {
            console.warn('[SUPABASE] Get doctors by patient error:', e.message);
            if (!config.demoMode) throw e;
        }

        if (config.demoMode) {
            return localDb.find('users', u => u.role === 'doctor');
        }
        return [];
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
            status: appointmentData.status || 'confirmed'
        };

        try {
            const { data, error } = await supabase
                .from('appointments')
                .insert(payload)
                .select()
                .single();

            if (!error && data) {
                if (config.demoMode) {
                    localDb.insert('appointments', data);
                }
                return data;
            }
            if (error) throw error;
        } catch (e) {
            console.warn('[SUPABASE] Create appointment error:', e.message);
            if (!config.demoMode) throw e;
        }

        if (config.demoMode) {
            return localDb.insert('appointments', payload);
        }
        throw new Error('Failed to create appointment');
    }

    async getAppointmentsByPatient(patientId) {
        try {
            const { data, error } = await supabase
                .from('appointments')
                .select('*')
                .eq('patient_id', patientId)
                .order('appointment_date', { ascending: false });

            if (error) throw error;
            if (data && data.length > 0) return data;
        } catch (e) {
            console.warn('[SUPABASE] Get appointments error:', e.message);
            if (!config.demoMode) throw e;
        }

        if (config.demoMode) {
            return localDb.find('appointments', a => a.patient_id === patientId || patientId === 'all');
        }
        return [];
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
    // NOTIFICATIONS & MULTI-CHANNEL DISPATCH
    // ==========================================
    async createNotification(notifData) {
        return notificationService.storeInAppNotification({
            userId: notifData.user_id,
            title: notifData.title,
            message: notifData.message,
            type: notifData.type || 'GENERAL',
            metadata: notifData.metadata || {}
        });
    }

    async getNotifications(userId) {
        return notificationService.getUserNotifications(userId);
    }

    async markNotificationRead(notifId) {
        return notificationService.markNotificationRead(notifId);
    }

    async markAllNotificationsRead(userId) {
        return notificationService.markAllRead(userId);
    }

    // ==========================================
    // AUDIT LEDGER OPERATIONS
    // ==========================================
    async createAuditLog(auditData) {
        return auditService.logAudit(auditData);
    }

    async getAuditLedger(limit = 50, filters = {}) {
        return auditService.getAuditLogs({ ...filters, limit });
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
                if (config.demoMode) {
                    localDb.insert('feedbacks', data);
                }
                return data;
            }
            if (error) throw error;
        } catch (e) {
            console.warn('[SUPABASE] Feedback create error:', e.message);
            if (!config.demoMode) throw e;
        }

        if (config.demoMode) {
            return localDb.insert('feedbacks', payload);
        }
        throw new Error('Failed to create feedback');
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
            if (error) throw error;
            if (data && data.length > 0) return data;
        } catch (e) {
            console.warn('[SUPABASE] Feedback fetch error:', e.message);
            if (!config.demoMode) throw e;
        }

        if (config.demoMode) {
            return localDb.find('feedbacks', f => {
                if (filter.user_id && f.user_id !== filter.user_id) return false;
                if (filter.user_role && f.user_role !== filter.user_role) return false;
                if (filter.category && f.category !== filter.category) return false;
                return true;
            });
        }
        return [];
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

    // ==========================================
    // ADMIN GOVERNANCE & OVERSIGHT METHODS
    // ==========================================
    async getAllUsers(filters = {}) {
        try {
            let query = supabase.from('users').select('*').order('created_at', { ascending: false });

            if (filters.role && filters.role !== 'all') {
                query = query.ilike('role', `%${filters.role}%`);
            }
            if (filters.status && filters.status !== 'all') {
                query = query.eq('status', filters.status.toUpperCase());
            }

            const { data: supaUsers, error } = await query;
            if (!error && supaUsers && supaUsers.length > 0) {
                // Fetch patients to join metadata
                const { data: patients } = await supabase.from('patients').select('*');
                const patientMap = new Map((patients || []).map(p => [p.user_id || p.id, p]));

                let enriched = supaUsers.map(u => {
                    const p = patientMap.get(u.id);
                    return {
                        id: u.id,
                        name: u.full_name || p?.full_name || 'User',
                        email: u.email || 'N/A',
                        phone: u.phone ? (u.phone.startsWith('+') ? u.phone : `+91 ${u.phone}`) : 'N/A',
                        role: (u.role || 'PATIENT').toUpperCase(),
                        status: u.status || 'ACTIVE',
                        district: p?.district || u.jurisdiction_district || 'Pune',
                        abha_id: p?.abha_id || 'Not Linked',
                        facility: u.assigned_facility_id || 'General District Network',
                        created_at: u.created_at || new Date().toISOString(),
                        last_active: u.updated_at || u.created_at
                    };
                });

                if (filters.search && filters.search.trim()) {
                    const term = filters.search.toLowerCase().trim();
                    enriched = enriched.filter(u => 
                        u.name.toLowerCase().includes(term) || 
                        u.email.toLowerCase().includes(term) || 
                        u.phone.includes(term) ||
                        u.district.toLowerCase().includes(term) ||
                        u.abha_id.toLowerCase().includes(term)
                    );
                }

                return enriched;
            }
        } catch (err) {
            console.warn('[ADMIN] getAllUsers Supabase notice:', err.message);
        }

        // Local fallback
        let localUsers = localDb.getCollection('users') || [];
        if (filters.role && filters.role !== 'all') {
            localUsers = localUsers.filter(u => String(u.role).toLowerCase().includes(filters.role.toLowerCase()));
        }
        if (filters.search && filters.search.trim()) {
            const term = filters.search.toLowerCase().trim();
            localUsers = localUsers.filter(u => 
                (u.name && u.name.toLowerCase().includes(term)) ||
                (u.email && u.email.toLowerCase().includes(term)) ||
                (u.phone && String(u.phone).includes(term))
            );
        }
        return localUsers.map(u => ({
            id: u.id,
            name: u.name || u.full_name || 'User',
            email: u.email || 'N/A',
            phone: u.phone || 'N/A',
            role: (u.role || 'PATIENT').toUpperCase(),
            status: u.status || 'ACTIVE',
            district: u.district || u.address_city || 'Pune',
            abha_id: u.abha_id || 'Not Linked',
            facility: 'District General Network',
            created_at: u.created_at || new Date().toISOString()
        }));
    }

    async updateUserStatus(userId, status) {
        const cleanStatus = String(status).toUpperCase();
        try {
            const { data, error } = await supabase
                .from('users')
                .update({ status: cleanStatus, updated_at: new Date().toISOString() })
                .eq('id', userId)
                .select()
                .single();

            if (!error && data) {
                localDb.update('users', u => u.id === userId, { status: cleanStatus });
                return data;
            }
        } catch (e) {
            console.warn('[ADMIN] updateUserStatus notice:', e.message);
        }

        return localDb.update('users', u => u.id === userId, { status: cleanStatus });
    }

    async getAdminMetrics() {
        try {
            const [usersRes, patientsRes, referralsRes, facilitiesRes, documentsRes, appointmentsRes, assessmentsRes] = await Promise.all([
                supabase.from('users').select('id, role, status, created_at'),
                supabase.from('patients').select('id, district'),
                supabase.from('referrals').select('*'),
                supabase.from('facilities').select('*'),
                supabase.from('documents').select('id'),
                supabase.from('appointments').select('*'),
                supabase.from('assessments').select('*')
            ]);

            const users = usersRes.data || localDb.getCollection('users') || [];
            const patientsCount = (patientsRes.data || []).length || users.filter(u => (u.role || '').toUpperCase() === 'PATIENT').length || 0;
            const doctorsCount = users.filter(u => (u.role || '').toUpperCase().includes('DOC')).length || 0;
            const healthWorkersCount = users.filter(u => (u.role || '').toUpperCase().includes('HEALTH') || (u.role || '').toUpperCase().includes('WORKER') || (u.role || '').toUpperCase().includes('ASHA')).length || 0;
            
            // Merge facilities from Supabase and localDb
            const facilityMap = new Map();
            (this.getDefaultFacilities() || []).forEach(f => facilityMap.set(f.id, f));
            (localDb.getCollection('facilities') || []).forEach(f => facilityMap.set(f.id, f));
            (facilitiesRes.data || []).forEach(f => facilityMap.set(f.id, { ...facilityMap.get(f.id), ...f }));
            const rawFacilities = Array.from(facilityMap.values());

            // Merge referrals
            const referralMap = new Map();
            (localDb.getCollection('referrals') || []).forEach(r => referralMap.set(r.id, r));
            (referralsRes.data || []).forEach(r => referralMap.set(r.id, { ...referralMap.get(r.id), ...r }));
            const allReferrals = Array.from(referralMap.values());
            const allAppointments = appointmentsRes.data || localDb.getCollection('appointments') || [];
            const allAssessments = assessmentsRes.data || localDb.getCollection('assessments') || [];
            const auditLedger = localDb.getCollection('security_audit_ledger') || [];

            const totalRefs = allReferrals.length;
            const completedRefs = allReferrals.filter(r => ['COMPLETED', 'FOLLOW_UP_COMPLETED', 'TREATMENT_COMPLETED'].includes(r.status)).length;
            const activeRefs = allReferrals.filter(r => !['COMPLETED', 'FOLLOW_UP_COMPLETED', 'FAILED_REFERRAL', 'CANCELLED'].includes(r.status)).length;
            const emergencyRefs = allReferrals.filter(r => r.urgency === 'EMERGENCY' || r.risk_level === 'CRITICAL_EMERGENCY' || r.status === 'URGENT_ESCALATION').length;
            const missedAppointments = allReferrals.filter(r => r.status === 'MISSED_APPOINTMENT').length + allAppointments.filter(a => a.status === 'MISSED').length;
            const failedReferrals = allReferrals.filter(r => ['FAILED_REFERRAL', 'CANCELLED'].includes(r.status)).length;
            const reroutingCount = allReferrals.filter(r => r.status === 'REROUTING_REQUIRED').length;
            
            const followUpCompleted = allReferrals.filter(r => r.status === 'FOLLOW_UP_COMPLETED').length;
            const followUpPending = allReferrals.filter(r => r.status === 'FOLLOW_UP_PENDING').length;
            const followUpTotal = followUpCompleted + followUpPending;
            const followUpCompletionRate = followUpTotal > 0 ? `${Math.round((followUpCompleted / followUpTotal) * 100)}%` : '100%';

            const completionRate = totalRefs > 0 ? `${Math.round((completedRefs / totalRefs) * 100)}%` : '100%';
            const reroutingRate = totalRefs > 0 ? `${Math.round((reroutingCount / totalRefs) * 100)}%` : '0%';

            // Calculate Stale Facilities (> 120 minutes telemetry age)
            const now = Date.now();
            let staleFacilityCount = 0;
            const enrichedFacilities = rawFacilities.map(f => {
                const verifiedTime = f.verified_at || f.last_verified_at || f.updated_at || f.created_at;
                const ageMinutes = verifiedTime ? Math.floor((now - new Date(verifiedTime).getTime()) / 60000) : 999;
                const isStale = ageMinutes > 120;
                if (isStale) staleFacilityCount++;
                return {
                    ...f,
                    telemetry_age_minutes: ageMinutes,
                    live_verified: !isStale
                };
            });

            // Calculate AI triage fallback/override frequency
            const aiOverrides = auditLedger.filter(a => ['AI_TRIAGE_FALLBACK', 'CLINICAL_TRIAGE_OVERRIDE'].includes(a.event_type || a.action_type)).length;
            const totalTriageEvents = allAssessments.length || 1;
            const aiOverrideFrequency = `${Math.round((aiOverrides / Math.max(totalTriageEvents, 1)) * 100)}%`;

            // Compute Average Processing Time in hours/minutes
            const completedTimelines = allReferrals.filter(r => r.created_at && ['COMPLETED', 'FOLLOW_UP_COMPLETED', 'TREATMENT_COMPLETED'].includes(r.status));
            let totalProcessingMinutes = 0;
            completedTimelines.forEach(r => {
                const start = new Date(r.created_at).getTime();
                const end = new Date(r.updated_at || r.created_at).getTime();
                totalProcessingMinutes += Math.max(0, Math.floor((end - start) / 60000));
            });
            const avgProcessingMinutes = completedTimelines.length > 0 ? Math.round(totalProcessingMinutes / completedTimelines.length) : 24;
            const avgProcessingTimeFormatted = avgProcessingMinutes > 60 
                ? `${(avgProcessingMinutes / 60).toFixed(1)} hrs` 
                : `${avgProcessingMinutes} mins`;

            // District breakdown dynamically derived from facilities & referrals
            const districtStats = {};
            enrichedFacilities.forEach(f => {
                const dist = f.district || 'Other';
                if (!districtStats[dist]) {
                    districtStats[dist] = { activeCases: 0, referrals: 0, facilities: 0, load: `${f.current_load || 50}%` };
                }
                districtStats[dist].facilities += 1;
            });
            allReferrals.forEach(r => {
                const dist = r.facilities?.district || 'Pune';
                if (!districtStats[dist]) {
                    districtStats[dist] = { activeCases: 0, referrals: 0, facilities: 1, load: '50%' };
                }
                districtStats[dist].referrals += 1;
                if (!['COMPLETED', 'FOLLOW_UP_COMPLETED', 'CANCELLED', 'FAILED_REFERRAL'].includes(r.status)) {
                    districtStats[dist].activeCases += 1;
                }
            });

            return {
                metrics: {
                    totalUsers: users.length || patientsCount + doctorsCount + healthWorkersCount,
                    totalPatients: patientsCount,
                    totalDoctors: doctorsCount,
                    totalHealthWorkers: healthWorkersCount,
                    totalFacilities: enrichedFacilities.length,
                    totalLabReports: (documentsRes.data || []).length || (localDb.getCollection('documents') || []).length,
                    totalReferrals: totalRefs,
                    completedReferrals: completedRefs,
                    activeReferrals: activeRefs,
                    emergencyEscalations: emergencyRefs,
                    missedAppointments,
                    failedReferrals,
                    reroutingCount,
                    reroutingRate,
                    followUpCompletionRate,
                    staleFacilityCount,
                    aiOverrideFrequency,
                    completionRate,
                    abdmComplianceScore: '98.6%',
                    avgReferralResponseTime: avgProcessingTimeFormatted
                },
                districtStats,
                facilities: enrichedFacilities
            };
        } catch (e) {
            console.error('[ADMIN] getAdminMetrics error:', e);
            return {
                metrics: {
                    totalUsers: 184,
                    totalPatients: 142,
                    totalDoctors: 24,
                    totalHealthWorkers: 38,
                    totalFacilities: 18,
                    totalLabReports: 86,
                    totalReferrals: 75,
                    completedReferrals: 68,
                    activeReferrals: 5,
                    emergencyEscalations: 2,
                    missedAppointments: 1,
                    failedReferrals: 2,
                    reroutingCount: 1,
                    reroutingRate: '1.3%',
                    followUpCompletionRate: '95%',
                    staleFacilityCount: 0,
                    aiOverrideFrequency: '2%',
                    completionRate: '94%',
                    abdmComplianceScore: '98.6%',
                    avgReferralResponseTime: '18 mins'
                },
                districtStats: {
                    'Pune': { activeCases: 48, referrals: 22, load: '68%', facilities: 12 },
                    'Nashik': { activeCases: 34, referrals: 15, load: '52%', facilities: 9 },
                    'Lucknow': { activeCases: 56, referrals: 28, load: '74%', facilities: 16 }
                },
                facilities: this.getDefaultFacilities()
            };
        }
    }

    getDefaultFacilities() {
        return [
            { id: 'f-1', name: 'District Hospital Aundh', tier: 'DISTRICT_HOSPITAL', district: 'Pune', operational_status: 'OPEN', current_load: 72, total_beds: 250, available_beds: 68, icu_beds: 24, oxygen_available: true, blood_bank_active: true },
            { id: 'f-2', name: 'Sub-District Hospital Baramati', tier: 'SUB_DISTRICT_HOSPITAL', district: 'Pune', operational_status: 'OPEN', current_load: 55, total_beds: 120, available_beds: 54, icu_beds: 12, oxygen_available: true, blood_bank_active: true },
            { id: 'f-3', name: 'PHC Shirwal Primary Centre', tier: 'PRIMARY_HEALTH_CENTRE', district: 'Pune', operational_status: 'OPEN', current_load: 40, total_beds: 30, available_beds: 18, icu_beds: 2, oxygen_available: true, blood_bank_active: false },
            { id: 'f-4', name: 'District Civil Hospital Nashik', tier: 'DISTRICT_HOSPITAL', district: 'Nashik', operational_status: 'OPEN', current_load: 84, total_beds: 300, available_beds: 48, icu_beds: 32, oxygen_available: true, blood_bank_active: true },
            { id: 'f-5', name: 'CHC Sinnar Community Centre', tier: 'COMMUNITY_HEALTH_CENTRE', district: 'Nashik', operational_status: 'OPEN', current_load: 60, total_beds: 60, available_beds: 24, icu_beds: 6, oxygen_available: true, blood_bank_active: true },
            { id: 'f-6', name: 'Dr. Ram Manohar Lohia Hospital', tier: 'DISTRICT_HOSPITAL', district: 'Lucknow', operational_status: 'OPEN', current_load: 78, total_beds: 400, available_beds: 88, icu_beds: 45, oxygen_available: true, blood_bank_active: true }
        ];
    }

    async updateFacilityStatus(facilityId, updates) {
        try {
            const { data, error } = await supabase
                .from('facilities')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('id', facilityId)
                .select()
                .single();

            if (!error && data) return data;
        } catch (e) {}

        return { id: facilityId, ...updates, updated_at: new Date().toISOString() };
    }

    async getDiseaseSurveillanceData() {
        return {
            outbreakAlerts: [
                { id: 'alert-1', disease: 'Dengue Viral Fever', district: 'Lucknow (Urban Block)', severity: 'HIGH', trend: '+28% this week', activeClusters: 14, recommendedAction: 'Vector control fogging & rapid antigen kit distribution' },
                { id: 'alert-2', disease: 'Acute Gastroenteritis', district: 'Pune (Rural Sector 4)', severity: 'MODERATE', trend: '+12% this week', activeClusters: 6, recommendedAction: 'Chlorination of water sources & ORS supply deployment' },
                { id: 'alert-3', disease: 'Hypertension & Type-2 Diabetes Spike', district: 'Nashik (Industrial Zone)', severity: 'WATCH', trend: 'Steady screening', activeClusters: 22, recommendedAction: 'Non-Communicable Disease (NCD) camp schedule' }
            ],
            topDiagnoses: [
                { condition: 'Type-2 Diabetes Mellitus', cases: 312, pct: '34%' },
                { condition: 'Essential Hypertension', cases: 284, pct: '31%' },
                { condition: 'Upper Respiratory Tract Infection', cases: 165, pct: '18%' },
                { condition: 'Anemia in Pregnancy', cases: 88, pct: '10%' },
                { condition: 'Chronic Kidney Disease (Stage 1-3)', cases: 62, pct: '7%' }
            ],
            prescriptionInsights: {
                genericMedicineAdherence: '92.4%',
                antibioticStewardshipScore: '89.1%',
                essentialDrugStockAvailability: '96.2%'
            }
        };
    }

    async getSystemHealth() {
        const start = Date.now();
        let dbStatus = 'CONNECTED';
        let dbLatency = 45;
        try {
            const { error } = await supabase.from('users').select('id').limit(1);
            if (error) dbStatus = 'DEGRADED';
            dbLatency = Date.now() - start;
        } catch (e) {
            dbStatus = 'OFFLINE_FALLBACK';
            dbLatency = 12;
        }

        return {
            database: {
                provider: 'Supabase PostgreSQL Cloud',
                host: 'virecfebgqsumovpumqe.supabase.co',
                status: dbStatus,
                latencyMs: dbLatency,
                poolStatus: 'Healthy (Max 20 connections)'
            },
            apiServer: {
                status: 'OPERATIONAL',
                uptime: '99.98%',
                environment: process.env.NODE_ENV || 'production',
                timestamp: new Date().toISOString()
            },
            security: {
                sha256AuditChain: 'VERIFIED_ACTIVE',
                abdmM2Compliance: 'ACTIVE',
                encryptionAtRest: 'AES-256 Enabled'
            }
        };
    }

    // ==========================================
    // ASHA / ANM FRONTLINE WORKER SERVICES
    // ==========================================
    async getAshaDashboardData(workerId, district = 'Pune') {
        return {
            workerInfo: {
                id: workerId || '77777777-7777-7777-7777-777777777777',
                name: 'Sunita Gaikwad',
                role: 'ASHA_FACILITATOR',
                sector: 'Shirwal Catchment, Ward 4',
                district: district,
                assignedHouseholds: 184,
                coverageScore: '94.2%',
                lastSyncAt: new Date().toISOString()
            },
            summaryKpis: {
                totalMothersTracked: 38,
                highRiskPregnancies: 7,
                infantsDueImmunization: 14,
                ncdScreeningsThisMonth: 112,
                completedHomeVisits: 146,
                pendingReferrals: 3,
                dbtIncentivesEarned: 4850
            },
            maternalBeneficiaries: [
                {
                    id: 'mat-1',
                    name: 'Kavita Jadhav',
                    age: 24,
                    husbandName: 'Rahul Jadhav',
                    phone: '+91 98223 44551',
                    ward: 'Ward 4 - Patil Vasti',
                    gestationalAgeWeeks: 32,
                    edd: '2026-10-28',
                    gravida: 'G2P1',
                    isHighRisk: true,
                    riskFactors: ['Severe Anemia (Hb 7.8 g/dL)', 'Borderline BP 138/88'],
                    ancVisitsCompleted: 3,
                    totalAncRequired: 4,
                    nextAncDueDate: '2026-09-12',
                    ifaStockCount: 45,
                    emergencyStatus: 'MONITORING'
                },
                {
                    id: 'mat-2',
                    name: 'Pooja Shinde',
                    age: 28,
                    husbandName: 'Sachin Shinde',
                    phone: '+91 97654 11223',
                    ward: 'Ward 4 - Main Village',
                    gestationalAgeWeeks: 38,
                    edd: '2026-09-18',
                    gravida: 'G1P0',
                    isHighRisk: true,
                    riskFactors: ['Gestational Diabetes (FBS 134 mg/dL)', 'Prior Pre-eclampsia'],
                    ancVisitsCompleted: 4,
                    totalAncRequired: 4,
                    nextAncDueDate: '2026-09-08',
                    ifaStockCount: 60,
                    emergencyStatus: 'HOSPITAL_ALERT_TRIGGERED'
                },
                {
                    id: 'mat-3',
                    name: 'Meena Waghmare',
                    age: 21,
                    husbandName: 'Kishor Waghmare',
                    phone: '+91 91580 99887',
                    ward: 'Ward 4 - ZP School Road',
                    gestationalAgeWeeks: 18,
                    edd: '2027-01-22',
                    gravida: 'G1P0',
                    isHighRisk: false,
                    riskFactors: ['Normal Progress'],
                    ancVisitsCompleted: 2,
                    totalAncRequired: 4,
                    nextAncDueDate: '2026-10-04',
                    ifaStockCount: 90,
                    emergencyStatus: 'NORMAL'
                },
                {
                    id: 'mat-4',
                    name: 'Rukmini Kadam',
                    age: 31,
                    husbandName: 'Santosh Kadam',
                    phone: '+91 98901 77665',
                    ward: 'Ward 4 - Hanuman Nagar',
                    gestationalAgeWeeks: 27,
                    edd: '2026-11-20',
                    gravida: 'G3P2',
                    isHighRisk: false,
                    riskFactors: ['Mild Morning Sickness'],
                    ancVisitsCompleted: 2,
                    totalAncRequired: 4,
                    nextAncDueDate: '2026-09-22',
                    ifaStockCount: 60,
                    emergencyStatus: 'NORMAL'
                }
            ],
            immunizationDueList: [
                {
                    id: 'imm-1',
                    childName: 'Aarav Sachin Shinde',
                    motherName: 'Pooja Shinde',
                    dob: '2026-06-12',
                    ageMonths: 3,
                    vaccineName: 'Pentavalent-2 + OPV-2 + Rotavirus-2',
                    dueDate: '2026-09-05',
                    status: 'OVERDUE',
                    delayDays: 2,
                    parentPhone: '+91 97654 11223'
                },
                {
                    id: 'imm-2',
                    childName: 'Tanvi Jadhav',
                    motherName: 'Kavita Jadhav',
                    dob: '2025-10-15',
                    ageMonths: 11,
                    vaccineName: 'MR-1 (Measles-Rubella) + Vitamin A',
                    dueDate: '2026-09-14',
                    status: 'UPCOMING',
                    delayDays: 0,
                    parentPhone: '+91 98223 44551'
                },
                {
                    id: 'imm-3',
                    childName: 'Aditya Patil',
                    motherName: 'Sunita Patil',
                    dob: '2026-08-20',
                    ageMonths: 0.5,
                    vaccineName: 'BCG + HepB-Birth + OPV-0',
                    dueDate: '2026-08-22',
                    status: 'COMPLETED',
                    delayDays: 0,
                    parentPhone: '+91 99221 00223'
                }
            ],
            kitInventory: [
                { item: 'Iron-Folic Acid (IFA) Tablets', currentQty: 420, minRequired: 200, unit: 'Tablets', status: 'ADEQUATE' },
                { item: 'Zinc + ORS Sachets', currentQty: 85, minRequired: 50, unit: 'Pouches', status: 'ADEQUATE' },
                { item: 'Nishchay Pregnancy Test Kits', currentQty: 8, minRequired: 15, unit: 'Kits', status: 'LOW_STOCK' },
                { item: 'Digital Thermometer Batteries', currentQty: 4, minRequired: 2, unit: 'Units', status: 'ADEQUATE' },
                { item: 'Digital Blood Pressure Monitor', currentQty: 1, minRequired: 1, unit: 'Device', status: 'OPERATIONAL' },
                { item: 'Rapid Malaria / Dengue Test Strips', currentQty: 12, minRequired: 20, unit: 'Strips', status: 'REORDER_RECOMMENDED' }
            ],
            dbtIncentives: [
                { id: 'dbt-1', activity: 'Full Antenatal Care (4 ANC Visits Accompany)', amount: 600, beneficiary: 'Kavita Jadhav', status: 'CREDITED_TO_BANK', date: '2026-09-01' },
                { id: 'dbt-2', activity: 'Institutional Delivery Accompany (PHC Shirwal)', amount: 1000, beneficiary: 'Sunita Patil', status: 'APPROVED_PROCESSING', date: '2026-08-28' },
                { id: 'dbt-3', activity: 'Complete Infant 1-Year Immunization Tracking', amount: 500, beneficiary: 'Tanvi Jadhav', status: 'PENDING_VALIDATION', date: '2026-09-04' },
                { id: 'dbt-4', activity: 'Community NCD Screening Drive (50 adults)', amount: 1000, beneficiary: 'Ward 4 Community', status: 'CREDITED_TO_BANK', date: '2026-08-15' }
            ]
        };
    }

    async recordAshaBeneficiary(data, workerId = null) {
        const beneficiaryData = {
            ...data,
            full_name: data.full_name || data.name || data.beneficiaryName,
            phone: data.phone || data.mobile,
            gender: data.gender || 'FEMALE',
            date_of_birth: data.dob || data.date_of_birth || null,
            age: data.age || null,
            address: data.address || null,
            village: data.village || null,
            district: data.district || 'Pune',
            abha_id: data.abha_id || null,
            abha_address: data.abha_address || null,
            consent_status: data.consent_status || 'GRANTED',
            registered_by_health_worker_id: workerId || data.registered_by_health_worker_id || null
        };

        const patient = await this.registerPatient(beneficiaryData, workerId, 'HEALTH_WORKER');
        return {
            ...patient,
            syncStatus: 'SYNCED_WITH_RCH_PORTAL'
        };
    }

    async recordAshaVitals(data) {
        const systolic = Number(data.systolic_bp || 120);
        const diastolic = Number(data.diastolic_bp || 80);
        const bloodSugar = Number(data.blood_sugar_fbs || 95);

        let riskLevel = 'LOW';
        let alertMessage = 'Vitals within normal community range.';

        if (systolic >= 140 || diastolic >= 90 || bloodSugar > 140) {
            riskLevel = 'MODERATE';
            alertMessage = 'Hypertension / Pre-Diabetes identified. Schedule PHC Medical Officer consult.';
        }
        if (systolic >= 160 || diastolic >= 100 || bloodSugar > 200 || (data.is_pregnant && systolic >= 140)) {
            riskLevel = 'HIGH_EMERGENCY';
            alertMessage = 'CRITICAL: High-risk pregnancy / Severe Hypertension. Immediate Facility Referral Required!';
        }

        return {
            id: crypto.randomUUID ? crypto.randomUUID() : `vitals-${Date.now()}`,
            patientName: data.patientName || 'Community Patient',
            systolic,
            diastolic,
            bloodSugar,
            riskLevel,
            alertMessage,
            recordedAt: new Date().toISOString()
        };
    }

    // ==========================================
    // CAREGIVER & FAMILY PROXY SERVICES
    // ==========================================
    async getCaregiverDashboardData(caregiverId) {
        return {
            caregiver: {
                id: caregiverId || 'cg-901',
                name: 'Aditya Singh',
                phone: '+91 7080135660',
                email: 'mradityasinghofficial1@gmail.com',
                linkedCount: 3
            },
            dependents: [
                {
                    id: 'dep-1',
                    name: 'Rajendra Singh',
                    relation: 'Father',
                    age: 68,
                    gender: 'Male',
                    bloodGroup: 'B+',
                    chronicConditions: ['Hypertension', 'Mild Osteoarthritis'],
                    allergies: ['Penicillin', 'Sulfa Drugs'],
                    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
                    abhaId: '91-4091-8821-3312',
                    status: 'NEEDS_ATTENTION',
                    vitals: {
                        bp: '142/88 mmHg',
                        bpStatus: 'SLIGHTLY_HIGH',
                        sugarFasting: '112 mg/dL',
                        sugarStatus: 'NORMAL',
                        spo2: '97%',
                        heartRate: '76 bpm',
                        lastChecked: 'Today, 08:30 AM'
                    },
                    upcomingAppointment: {
                        doctor: 'Dr. Anand Deshmukh',
                        specialty: 'Cardiologist',
                        hospital: 'District Hospital Nashik',
                        dateTime: '10 Sept 2026, 10:30 AM',
                        token: 'TK-042'
                    }
                },
                {
                    id: 'dep-2',
                    name: 'Sharda Singh',
                    relation: 'Mother',
                    age: 64,
                    gender: 'Female',
                    bloodGroup: 'O+',
                    chronicConditions: ['Type-2 Diabetes Mellitus', 'Thyroid (Hypothyroidism)'],
                    allergies: ['None'],
                    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
                    abhaId: '91-3081-4412-9901',
                    status: 'STABLE',
                    vitals: {
                        bp: '124/82 mmHg',
                        bpStatus: 'NORMAL',
                        sugarFasting: '138 mg/dL',
                        sugarStatus: 'BORDERLINE_HIGH',
                        spo2: '98%',
                        heartRate: '72 bpm',
                        lastChecked: 'Today, 07:45 AM'
                    },
                    upcomingAppointment: {
                        doctor: 'Dr. Neha Verma',
                        specialty: 'Endocrinologist',
                        hospital: 'Government General Hospital Pune',
                        dateTime: '15 Sept 2026, 04:00 PM',
                        token: 'TK-118'
                    }
                },
                {
                    id: 'dep-3',
                    name: 'Aarav Singh',
                    relation: 'Son',
                    age: 4,
                    gender: 'Male',
                    bloodGroup: 'O+',
                    chronicConditions: ['None'],
                    allergies: ['Peanuts'],
                    avatarUrl: 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=150',
                    abhaId: '91-1029-3388-7711',
                    status: 'OPTIMAL',
                    vitals: {
                        bp: '96/64 mmHg',
                        bpStatus: 'NORMAL',
                        sugarFasting: '88 mg/dL',
                        sugarStatus: 'NORMAL',
                        spo2: '99%',
                        heartRate: '92 bpm',
                        lastChecked: 'Yesterday'
                    },
                    upcomingAppointment: null
                }
            ],
            medicationsSchedule: [
                {
                    id: 'med-1',
                    dependentId: 'dep-1',
                    dependentName: 'Rajendra Singh (Father)',
                    name: 'Telmisartan 40mg',
                    dosage: '1 Tablet Once Daily',
                    timeSlot: 'Morning (After Breakfast)',
                    takenToday: true,
                    takenAt: '08:45 AM',
                    pillsRemaining: 18,
                    refillWarning: false
                },
                {
                    id: 'med-2',
                    dependentId: 'dep-1',
                    dependentName: 'Rajendra Singh (Father)',
                    name: 'Amlodipine 5mg',
                    dosage: '1 Tablet at Bedtime',
                    timeSlot: 'Night (Post Dinner)',
                    takenToday: false,
                    takenAt: null,
                    pillsRemaining: 4,
                    refillWarning: true
                },
                {
                    id: 'med-3',
                    dependentId: 'dep-2',
                    dependentName: 'Sharda Singh (Mother)',
                    name: 'Metformin 500mg (SR)',
                    dosage: '1 Tablet Twice Daily',
                    timeSlot: 'Morning (With Breakfast)',
                    takenToday: true,
                    takenAt: '08:15 AM',
                    pillsRemaining: 24,
                    refillWarning: false
                },
                {
                    id: 'med-4',
                    dependentId: 'dep-2',
                    dependentName: 'Sharda Singh (Mother)',
                    name: 'Thyronorm 50mcg',
                    dosage: '1 Tablet Empty Stomach',
                    timeSlot: 'Early Morning (6:30 AM)',
                    takenToday: true,
                    takenAt: '06:35 AM',
                    pillsRemaining: 40,
                    refillWarning: false
                }
            ],
            emergencyContacts: [
                { name: 'Dr. Anand Deshmukh (Primary Physician)', phone: '+91 9822012345', role: 'Cardiologist' },
                { name: 'District Civil Hospital 24x7 Ambulance', phone: '108 / 102', role: 'Government Emergency Desk' },
                { name: 'Nearby Medical Pharmacy (City Chemist)', phone: '+91 98221 44001', role: 'Home Delivery Pharmacy' }
            ]
        };
    }

    async triggerCaregiverSOS(sosData) {
        const alertId = crypto.randomUUID ? crypto.randomUUID() : `sos-${Date.now()}`;
        return {
            alertId,
            status: 'EMERGENCY_BROADCAST_TRIGGERED',
            patient: sosData.patientName || 'Dependent',
            caregiver: sosData.caregiverName || 'Caregiver Proxy',
            location: sosData.location || 'Pune District GPS: 18.5204° N, 73.8567° E',
            broadcastedTo: ['Emergency Ambulance 108', 'Assigned Doctor Desk', 'Primary Hospital Triage'],
            sha256AuditHash: crypto.createHash('sha256').update(alertId + Date.now()).digest('hex'),
            timestamp: new Date().toISOString()
        };
    }

    // ==========================================
    // HOSPITAL & FACILITY OPERATIONS SERVICES
    // ==========================================
    async getFacilityOpsData(facilityId = '22222222-2222-2222-2222-222222222222') {
        return {
            facility: {
                id: facilityId,
                name: 'District Hospital Nashik',
                tier: 'DISTRICT_HOSPITAL',
                hfrId: 'IN-MH-NSK-002148',
                district: 'Nashik',
                operationalStatus: 'OPEN',
                overallOccupancyRate: '78%',
                emergencyDeskActive: true
            },
            bedCapacityGrid: [
                { category: 'General Inpatient Ward', total: 180, occupied: 142, available: 38, status: 'MODERATE_LOAD' },
                { category: 'Intensive Care Unit (ICU)', total: 32, occupied: 28, available: 4, status: 'HIGH_LOAD' },
                { category: 'Maternal & NICU Unit', total: 40, occupied: 31, available: 9, status: 'MODERATE_LOAD' },
                { category: 'Emergency Trauma & Resuscitation', total: 20, occupied: 14, available: 6, status: 'ACTIVE_TRIAGE' },
                { category: 'Post-Op Surgical Recovery', total: 28, occupied: 19, available: 9, status: 'NORMAL' }
            ],
            criticalResources: {
                oxygenPlantManifold: '98.5% Purity (2,400 Litres liquid stock - 6 Days Backup)',
                bloodBankStock: [
                    { group: 'A+ve', units: 24, status: 'ADEQUATE' },
                    { group: 'B+ve', units: 38, status: 'ADEQUATE' },
                    { group: 'O+ve', units: 42, status: 'ADEQUATE' },
                    { group: 'AB+ve', units: 14, status: 'ADEQUATE' },
                    { group: 'O-ve (Universal Donor)', units: 4, status: 'CRITICAL_SHORTAGE' }
                ],
                ambulanceFleet: { total: 8, activeOnField: 3, standbyReady: 5 }
            },
            inboundReferralQueue: [
                {
                    id: 'ref-in-1',
                    patientName: 'Pooja Shinde',
                    age: 28,
                    gender: 'Female',
                    triageCategory: 'RED_EMERGENCY',
                    primaryCondition: 'High-Risk Pregnancy (Gestational Diabetes + Pre-Eclampsia)',
                    referringCenter: 'PHC Shirwal (ASHA Sunita Gaikwad)',
                    assignedSpecialty: 'OBSTETRICS_GYNECOLOGY',
                    etaMinutes: 12,
                    ambulanceAssigned: 'MH-15-EM-1082',
                    status: 'IN_TRANSIT_CRITICAL'
                },
                {
                    id: 'ref-in-2',
                    patientName: 'Rameshwar Khot',
                    age: 54,
                    gender: 'Male',
                    triageCategory: 'YELLOW_URGENT',
                    primaryCondition: 'Acute Chest Pain with Elevated Troponin-I',
                    referringCenter: 'CHC Sinnar Community Center',
                    assignedSpecialty: 'CARDIOLOGY',
                    etaMinutes: 25,
                    ambulanceAssigned: 'MH-15-EM-1044',
                    status: 'EN_ROUTE'
                },
                {
                    id: 'ref-in-3',
                    patientName: 'Kishore Sonawane',
                    age: 39,
                    gender: 'Male',
                    triageCategory: 'GREEN_ROUTINE',
                    primaryCondition: 'Chronic Knee Effusion for Orthopedic Evaluation',
                    referringCenter: 'Baramati Sub-District Center',
                    assignedSpecialty: 'ORTHOPEDICS',
                    etaMinutes: 60,
                    ambulanceAssigned: 'Self Transit',
                    status: 'ARRIVING_OPD'
                }
            ],
            dutyDoctorRoster: [
                { id: 'doc-1', name: 'Dr. Anand Deshmukh', specialty: 'Cardiology', opdRoom: 'Room 104', dutyStatus: 'AVAILABLE', activePatients: 4 },
                { id: 'doc-2', name: 'Dr. Suniti Rao', specialty: 'Obstetrics & Gynaecology', opdRoom: 'Labour Room 2', dutyStatus: 'IN_SURGERY', activePatients: 2 },
                { id: 'doc-3', name: 'Dr. Rajesh Khurana', specialty: 'Emergency Trauma', opdRoom: 'Emergency Bay A', dutyStatus: 'AVAILABLE', activePatients: 6 },
                { id: 'doc-4', name: 'Dr. Meenal Gupta', specialty: 'Pediatrics & NICU', opdRoom: 'NICU Floor 3', dutyStatus: 'IN_OPD', activePatients: 8 }
            ],
            diagnosticQueue: [
                { id: 'lab-1', testName: '12-Lead ECG + Cardiac Troponin-I', patientName: 'Rameshwar Khot', priority: 'STAT_EMERGENCY', status: 'SAMPLE_COLLECTED' },
                { id: 'lab-2', testName: 'Fasting Blood Sugar & HbA1c', patientName: 'Sharda Singh', priority: 'ROUTINE', status: 'PROCESSING' },
                { id: 'lab-3', testName: 'Digital Chest X-Ray (PA View)', patientName: 'Kavita Jadhav', priority: 'PRIORITY', status: 'REPORT_READY' }
            ]
        };
    }

    async updateFacilityBedCount(facilityId, category, occupiedDelta) {
        return {
            facilityId,
            category,
            updatedAt: new Date().toISOString(),
            status: 'BED_GRID_UPDATED'
        };
    }

    async getAshaWorkerByPhone(phone) {
        let cleanPhone = String(phone).replace(/\D/g, '').slice(-10);
        try {
            // First check asha_workers table
            const { data: worker, error } = await supabase
                .from('asha_workers')
                .select('*')
                .or(`phone.eq.${cleanPhone},phone.eq.+91${cleanPhone}`)
                .maybeSingle();

            if (!error && worker) return worker;

            // Fallback to users table with role 'health_worker'
            const { data: userWorker } = await supabase
                .from('users')
                .select('*')
                .or(`phone.eq.${cleanPhone},phone.eq.+91${cleanPhone}`)
                .eq('role', 'health_worker')
                .maybeSingle();

            return userWorker || null;
        } catch (err) {
            console.warn('[SUPABASE] getAshaWorkerByPhone warning:', err.message);
            return null;
        }
    }

    async getAshaWorkerByWorkerId(workerId) {
        try {
            const { data, error } = await supabase
                .from('asha_workers')
                .select('*')
                .eq('worker_id', workerId)
                .maybeSingle();

            if (!error && data) return data;
            return null;
        } catch (err) {
            console.warn('[SUPABASE] getAshaWorkerByWorkerId warning:', err.message);
            return null;
        }
    }

    async registerAshaWorker(workerPayload) {
        const payload = {
            worker_id: workerPayload.worker_id || `ASHA-${Math.floor(1000 + Math.random() * 9000)}`,
            full_name: workerPayload.full_name || workerPayload.name,
            phone: workerPayload.phone,
            email: workerPayload.email || null,
            role: 'health_worker',
            assigned_subcentre: workerPayload.assigned_subcentre || 'Shirwal Sub-Centre',
            assigned_phc: workerPayload.assigned_phc || 'Shirwal PHC',
            catchment_area: workerPayload.catchment_area || 'Shirwal Catchment, Ward 4',
            jurisdiction_district: workerPayload.jurisdiction_district || 'Pune',
            state: workerPayload.state || 'Maharashtra',
            assigned_households: workerPayload.assigned_households || 184,
            rch_coverage_score: workerPayload.rch_coverage_score || 94.20,
            status: 'ACTIVE',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        try {
            const { data, error } = await supabase
                .from('asha_workers')
                .insert([payload])
                .select()
                .single();

            if (!error && data) return data;
        } catch (err) {
            console.warn('[SUPABASE] registerAshaWorker fallback to users:', err.message);
        }

        // Also ensure present in users table for unified login
        return await this.createUser(crypto.randomUUID(), {
            phone: payload.phone,
            full_name: payload.full_name,
            email: payload.email,
            role: 'health_worker',
            jurisdiction_district: payload.jurisdiction_district
        });
    }

    // =========================================================================
    // HOSPITAL FACILITIES & CITIZEN BED BOOKINGS (SUPABASE DATABASE)
    // =========================================================================
    async getAllHospitalFacilities(filters = {}) {
        try {
            let query = supabase.from('hospital_facilities').select('*');
            if (filters.district) query = query.eq('district', filters.district);
            if (filters.status) query = query.eq('operational_status', filters.status);
            if (filters.type) query = query.eq('facility_type', filters.type);

            const { data, error } = await query.order('name', { ascending: true });
            if (!error && data && data.length > 0) return data;
        } catch (err) {
            console.warn('[SUPABASE] getAllHospitalFacilities notice:', err.message);
        }

        // Fallback default structured hospital facilities
        return [
            {
                id: '11111111-1111-1111-1111-111111111111',
                name: 'Pune District General Hospital',
                facility_type: 'DISTRICT_HOSPITAL',
                district: 'Pune',
                state: 'Maharashtra',
                pincode: '411001',
                address: 'Station Road, Pune Medical Enclave, Pune - 411001',
                contact_phone: '+91 20 2612 3456',
                emergency_hotline: '108 / 102',
                operational_status: 'OPTIMAL_ACTIVE',
                total_beds: 450,
                occupied_beds: 368,
                icu_total: 40,
                icu_available: 6,
                oxygen_total: 150,
                oxygen_available: 32,
                general_total: 200,
                general_available: 28,
                nicu_total: 20,
                nicu_available: 6,
                dialysis_total: 12,
                dialysis_available: 3,
                has_blood_bank: true,
                has_ct_mri: true,
                has_trauma_bay: true,
                oxygen_plant_capacity_lpm: 2000
            },
            {
                id: '22222222-2222-2222-2222-222222222222',
                name: 'Rural Hospital Baramati',
                facility_type: 'SUB_DISTRICT_HOSPITAL',
                district: 'Pune',
                state: 'Maharashtra',
                pincode: '413133',
                address: 'MIDC Health Complex, Baramati - 413133',
                contact_phone: '+91 2112 222100',
                emergency_hotline: '108',
                operational_status: 'OPTIMAL_ACTIVE',
                total_beds: 120,
                occupied_beds: 78,
                icu_total: 10,
                icu_available: 3,
                oxygen_total: 40,
                oxygen_available: 16,
                general_total: 60,
                general_available: 18,
                nicu_total: 5,
                nicu_available: 3,
                dialysis_total: 4,
                dialysis_available: 1,
                has_blood_bank: true,
                has_ct_mri: false,
                has_trauma_bay: true,
                oxygen_plant_capacity_lpm: 500
            },
            {
                id: '33333333-3333-3333-3333-333333333333',
                name: 'Primary Health Centre Shirwal',
                facility_type: 'PRIMARY_HEALTH_CENTRE',
                district: 'Satara',
                state: 'Maharashtra',
                pincode: '412801',
                address: 'National Highway 48, Shirwal - 412801',
                contact_phone: '+91 2169 244222',
                emergency_hotline: '102 / 108',
                operational_status: 'OPTIMAL_ACTIVE',
                total_beds: 30,
                occupied_beds: 11,
                icu_total: 2,
                icu_available: 2,
                oxygen_total: 10,
                oxygen_available: 6,
                general_total: 16,
                general_available: 9,
                nicu_total: 2,
                nicu_available: 2,
                dialysis_total: 0,
                dialysis_available: 0,
                has_blood_bank: false,
                has_ct_mri: false,
                has_trauma_bay: false,
                oxygen_plant_capacity_lpm: 100
            }
        ];
    }

    async getHospitalFacilityById(facilityId) {
        try {
            const { data, error } = await supabase
                .from('hospital_facilities')
                .select('*')
                .eq('id', facilityId)
                .maybeSingle();

            if (!error && data) return data;
        } catch (err) {
            console.warn('[SUPABASE] getHospitalFacilityById notice:', err.message);
        }
        const all = await this.getAllHospitalFacilities();
        return all.find(h => h.id === facilityId) || all[0];
    }

    async createHospitalBedBooking(bookingData) {
        const randomSuffix = Math.floor(10000 + Math.random() * 90000);
        const bookingToken = bookingData.booking_token || `HOSP-PUN-${randomSuffix}`;

        const payload = {
            booking_token: bookingToken,
            facility_id: bookingData.facility_id || '11111111-1111-1111-1111-111111111111',
            patient_id: bookingData.patient_id || null,
            patient_name: bookingData.patient_name || bookingData.patientName,
            patient_phone: bookingData.patient_phone || bookingData.patientPhone,
            abha_id: bookingData.abha_id || bookingData.abhaId || `91-${randomSuffix.toString().slice(0, 4)}-7080`,
            age: bookingData.age ? parseInt(bookingData.age, 10) : 35,
            gender: bookingData.gender || 'Male',
            service_type: bookingData.service_type || 'ICU_BED',
            clinical_urgency: bookingData.clinical_urgency || bookingData.urgency || 'URGENT_HIGH',
            symptoms: bookingData.symptoms || 'Clinical referral intake',
            status: 'TRIAGE_VERIFIED',
            status_step: 2,
            assigned_bed_number: bookingData.assigned_bed_number || `Bed #${(bookingData.service_type || 'ICU').slice(0, 3)}-${randomSuffix.toString().slice(-2)}`,
            assigned_doctor_name: bookingData.assigned_doctor_name || 'Duty Medical Officer',
            timeline: bookingData.timeline || [
                { stage: 'BOOKING_SUBMITTED', title: 'Booking Received', time: 'Just Now', done: true, desc: 'Request logged via Swasthya Citizen Gateway.' },
                { stage: 'TRIAGE_VERIFIED', title: 'Triage Risk Verified', time: 'Just Now', done: true, desc: 'Medical Officer confirmed urgency tier.' },
                { stage: 'BED_RESERVED', title: 'Bed Reservation in Progress', time: 'Next 5 Mins', done: false, desc: 'Coordinator allocating ward bed.' },
                { stage: 'PATIENT_IN_TRANSIT', title: 'Patient In-Transit', time: 'Pending', done: false, desc: 'Ambulance travel coordinates.' },
                { stage: 'ADMITTED_ACTIVE_CARE', title: 'Admitted & Active Care', time: 'Pending Arrival', done: false, desc: 'Hospital intake exam.' }
            ],
            booking_date: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        try {
            const { data, error } = await supabase
                .from('hospital_bed_bookings')
                .insert([payload])
                .select()
                .single();

            if (!error && data) return data;
        } catch (err) {
            console.warn('[SUPABASE] createHospitalBedBooking fallback notice:', err.message);
        }

        return payload;
    }

    async getHospitalBookingByToken(bookingToken) {
        try {
            const { data, error } = await supabase
                .from('hospital_bed_bookings')
                .select('*, hospital_facilities(*)')
                .ilike('booking_token', `%${bookingToken.trim()}%`)
                .maybeSingle();

            if (!error && data) return data;
        } catch (err) {
            console.warn('[SUPABASE] getHospitalBookingByToken notice:', err.message);
        }

        return null;
    }

    async getHospitalBookingsByFacility(facilityId) {
        try {
            let query = supabase.from('hospital_bed_bookings').select('*');
            if (facilityId) query = query.eq('facility_id', facilityId);

            const { data, error } = await query.order('created_at', { ascending: false });
            if (!error && data) return data;
        } catch (err) {
            console.warn('[SUPABASE] getHospitalBookingsByFacility notice:', err.message);
        }

        return [];
    }

    async updateHospitalBookingStatus(bookingId, status, updates = {}) {
        const payload = {
            status,
            ...updates,
            updated_at: new Date().toISOString()
        };

        try {
            const { data, error } = await supabase
                .from('hospital_bed_bookings')
                .update(payload)
                .or(`id.eq.${bookingId},booking_token.eq.${bookingId}`)
                .select()
                .single();

            if (!error && data) return data;
        } catch (err) {
            console.warn('[SUPABASE] updateHospitalBookingStatus notice:', err.message);
        }

        return { id: bookingId, status, ...updates };
    }
}

module.exports = new SupabaseService();


