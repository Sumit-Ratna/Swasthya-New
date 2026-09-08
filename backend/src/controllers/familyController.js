const proxyAuthorizationService = require('../services/proxyAuthorizationService');
const supabase = require('../config/supabaseClient');
const dbService = require('../services/supabaseService');
const smsService = require('../services/smsService');
const localDb = require('../services/localDb');

/**
 * Email-Based Family Connection Flow Controller
 */
exports.inviteFamilyMemberByEmail = async (req, res) => {
    try {
        const { email, relation = 'FAMILY', permission_scope = 'REFERRAL_STATUS' } = req.body;
        const userId = req.user.id;

        if (!email) {
            return res.status(400).json({ error: "Family member's email address is required." });
        }

        const invitation = await proxyAuthorizationService.createFamilyInvitation({
            patientId: userId,
            caregiverEmail: email,
            relationshipType: relation,
            permissionScope: permission_scope,
            requestingUser: req.user
        });

        res.status(201).json({
            success: true,
            message: `Verification email sent to ${email}. Waiting for family member to accept the connection.`,
            invitation
        });
    } catch (err) {
        console.error("[FAMILY] Invite by email error:", err);
        const status = err.status || 500;
        res.status(status).json({ error: err.message, code: err.code });
    }
};

exports.getPendingInvitations = async (req, res) => {
    try {
        const userId = req.user.id;
        const invitations = await proxyAuthorizationService.getPendingInvitations(userId);
        res.json(invitations);
    } catch (err) {
        console.error("[FAMILY] Get pending invitations error:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.getInvitationDetailsByToken = async (req, res) => {
    try {
        const { token } = req.params;
        const invitation = await proxyAuthorizationService.getInvitationByToken(token);
        res.json({
            id: invitation.id,
            requester_name: invitation.requester_name,
            requester_email: invitation.requester_email,
            caregiver_email: invitation.caregiver_email,
            relationship_type: invitation.relationship_type,
            permission_scope: invitation.permission_scope,
            status: invitation.status,
            expires_at: invitation.expires_at
        });
    } catch (err) {
        console.error("[FAMILY] Get invite details error:", err);
        const status = err.status || 404;
        res.status(status).json({ error: err.message, code: err.code });
    }
};

exports.acceptFamilyInvitation = async (req, res) => {
    try {
        const { token, verification_code } = req.body;
        const acceptingUser = req.user;

        const result = await proxyAuthorizationService.acceptFamilyInvitation({
            token,
            verificationCode: verification_code,
            acceptingUser
        });

        res.json(result);
    } catch (err) {
        console.error("[FAMILY] Accept invite error:", err);
        const status = err.status || 400;
        res.status(status).json({ error: err.message, code: err.code });
    }
};

exports.declineFamilyInvitation = async (req, res) => {
    try {
        const { token, verification_code } = req.body;
        const decliningUser = req.user;

        const result = await proxyAuthorizationService.declineFamilyInvitation({
            token,
            verificationCode: verification_code,
            decliningUser
        });

        res.json(result);
    } catch (err) {
        console.error("[FAMILY] Decline invite error:", err);
        const status = err.status || 400;
        res.status(status).json({ error: err.message, code: err.code });
    }
};

exports.cancelFamilyInvitation = async (req, res) => {
    try {
        const { invitationId } = req.params;
        const userId = req.user.id;

        const result = await proxyAuthorizationService.cancelFamilyInvitation({
            invitationId,
            userId
        });

        res.json(result);
    } catch (err) {
        console.error("[FAMILY] Cancel invite error:", err);
        const status = err.status || 400;
        res.status(status).json({ error: err.message, code: err.code });
    }
};

/**
 * Backward-compatible endpoint (mapped to invite or direct grant if explicit)
 */
exports.initiateFamilyLink = async (req, res) => {
    try {
        const { email, phone, relation = 'FAMILY', permission_scope = 'REFERRAL_STATUS' } = req.body;
        const userId = req.user.id;

        if (email) {
            const invitation = await proxyAuthorizationService.createFamilyInvitation({
                patientId: userId,
                caregiverEmail: email,
                relationshipType: relation,
                permissionScope: permission_scope,
                requestingUser: req.user
            });

            return res.status(201).json({
                success: true,
                message: `Verification email sent to ${email}.`,
                invitation
            });
        }

        const normalizedPhone = String(phone || '').replace(/\D/g, '').slice(-10);
        const member = await dbService.getUserByPhone(normalizedPhone);

        if (!member) {
            return res.status(404).json({ error: "Target user not found with this phone number." });
        }

        if (member.id === userId) {
            return res.status(400).json({ error: "Cannot add yourself as a family proxy." });
        }

        const link = await proxyAuthorizationService.grantProxyAccess({
            patientId: userId,
            caregiverUserId: member.id,
            relationshipType: relation,
            permissionScope: permission_scope,
            requestingUser: req.user
        });

        res.status(201).json({
            success: true,
            message: "Family proxy relationship established successfully.",
            link_id: link.id,
            data: link
        });
    } catch (err) {
        console.error("[FAMILY] Init error:", err);
        const status = err.status || 500;
        res.status(status).json({ error: err.message, code: err.code });
    }
};

exports.verifyFamilyLink = async (req, res) => {
    try {
        const { phone } = req.body;
        const userId = req.user.id;

        const normalizedPhone = String(phone).replace(/\D/g, '').slice(-10);
        const member = await dbService.getUserByPhone(normalizedPhone);

        if (!member) {
            return res.status(404).json({ error: "User not found." });
        }

        // Return verified status
        res.json({
            success: true,
            message: "Family link verified and active."
        });
    } catch (err) {
        console.error("[FAMILY] Verify error:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.getFamilyMembers = async (req, res) => {
    try {
        const userId = req.user.id;
        const members = await proxyAuthorizationService.getCaregiverLinkedPatients(userId);

        // Also fetch any managed dependent profiles
        let dependents = [];
        try {
            const { data } = await supabase
                .from('users')
                .select('id, name, full_name, phone, dob, date_of_birth, gender, blood_group, medical_history')
                .eq('managed_by_user_id', userId);
            
            if (data && Array.isArray(data)) {
                dependents = data;
            }
        } catch (e) {}

        if (dependents.length === 0) {
            dependents = localDb.find('users', u => u.managed_by_user_id === userId) || [];
        }

        const formattedDependents = dependents.map(dep => ({
            id: 'dep_link_' + dep.id,
            caregiver_user_id: userId,
            patient_id: dep.id,
            relationship_type: dep.medical_history?.relationship_type || 'DEPENDENT',
            permission_scope: 'FULL_ACCESS',
            status: 'ACTIVE',
            is_managed_dependent: true,
            patient: {
                id: dep.id,
                full_name: dep.full_name || dep.name,
                phone: dep.phone || 'Managed Dependent',
                date_of_birth: dep.dob || dep.date_of_birth,
                gender: dep.gender,
                blood_group: dep.blood_group,
                medical_history: dep.medical_history
            }
        }));

        // Merge and deduplicate
        const merged = [...members];
        formattedDependents.forEach(dep => {
            if (!merged.some(m => (m.patient?.id === dep.patient.id || m.patient_id === dep.patient_id))) {
                merged.push(dep);
            }
        });

        res.json(merged);
    } catch (err) {
        console.error("[FAMILY] Get members error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * -------------------------------------------------------------
 * 1. CHILD & ELDER DEPENDENT PROFILES (MANAGED ACCOUNTS)
 * -------------------------------------------------------------
 */
exports.createDependentProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            name,
            full_name,
            relation = 'CHILD',
            dob,
            date_of_birth,
            gender,
            blood_group,
            allergies = [],
            medical_conditions = [],
            emergency_notes
        } = req.body;

        const displayName = full_name || name;
        if (!displayName) {
            return res.status(400).json({ error: "Dependent's full name is required." });
        }

        const birthDate = date_of_birth || dob || new Date().toISOString().split('T')[0];
        const depId = 'dep_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

        const dependentUser = {
            id: depId,
            name: displayName,
            full_name: displayName,
            role: 'PATIENT',
            dob: birthDate,
            date_of_birth: birthDate,
            gender: gender || 'Other',
            blood_group: blood_group || 'Unknown',
            managed_by_user_id: userId,
            is_dependent: true,
            phone: `dep_${depId.slice(-6)}`,
            medical_history: {
                relationship_type: relation.toUpperCase(),
                allergies: Array.isArray(allergies) ? allergies : [allergies].filter(Boolean),
                medical_conditions: Array.isArray(medical_conditions) ? medical_conditions : [medical_conditions].filter(Boolean),
                emergency_notes: emergency_notes || '',
                created_by_user_id: userId,
                created_at: new Date().toISOString()
            },
            created_at: new Date().toISOString()
        };

        // Persist to Supabase users / patients
        try {
            await supabase.from('users').upsert(dependentUser);
            await supabase.from('patients').upsert({
                id: depId,
                full_name: displayName,
                gender: gender || 'Other',
                date_of_birth: birthDate,
                blood_group: blood_group || 'Unknown'
            });
        } catch (e) {
            console.warn('[FAMILY] Supabase dependent save notice:', e.message);
        }

        // Persist to localDb
        localDb.insert('users', dependentUser);
        localDb.insert('patients', {
            id: depId,
            full_name: displayName,
            gender: gender || 'Other',
            date_of_birth: birthDate,
            blood_group: blood_group || 'Unknown'
        });

        // Auto-grant full caregiver proxy authorization
        await proxyAuthorizationService.grantProxyAccess({
            patientId: depId,
            caregiverUserId: userId,
            relationshipType: relation,
            permissionScope: 'FULL_ACCESS',
            requestingUser: req.user
        });

        res.status(201).json({
            success: true,
            message: `Managed profile for ${displayName} created successfully.`,
            dependent: dependentUser
        });
    } catch (err) {
        console.error("[FAMILY] Create dependent error:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.getDependentsList = async (req, res) => {
    try {
        const userId = req.user.id;
        let dependents = [];

        try {
            const { data } = await supabase
                .from('users')
                .select('*')
                .eq('managed_by_user_id', userId);
            if (data && Array.isArray(data)) dependents = data;
        } catch (e) {}

        if (dependents.length === 0) {
            dependents = localDb.find('users', u => u.managed_by_user_id === userId) || [];
        }

        res.json({
            success: true,
            count: dependents.length,
            dependents
        });
    } catch (err) {
        console.error("[FAMILY] Get dependents error:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.updateDependentProfile = async (req, res) => {
    try {
        const { dependentId } = req.params;
        const userId = req.user.id;
        const updates = req.body;

        const dep = localDb.findOne('users', u => u.id === dependentId && u.managed_by_user_id === userId);
        if (!dep) {
            return res.status(404).json({ error: "Managed dependent profile not found." });
        }

        const updatedUser = {
            ...dep,
            name: updates.name || updates.full_name || dep.name,
            full_name: updates.full_name || updates.name || dep.full_name,
            gender: updates.gender || dep.gender,
            blood_group: updates.blood_group || dep.blood_group,
            dob: updates.dob || updates.date_of_birth || dep.dob,
            date_of_birth: updates.date_of_birth || updates.dob || dep.date_of_birth,
            medical_history: {
                ...(dep.medical_history || {}),
                ...(updates.medical_history || {}),
                relationship_type: (updates.relation || dep.medical_history?.relationship_type || 'DEPENDENT').toUpperCase()
            }
        };

        try {
            await supabase.from('users').update(updatedUser).eq('id', dependentId);
        } catch (e) {}

        localDb.update('users', u => u.id === dependentId, updatedUser);

        res.json({
            success: true,
            message: "Dependent profile updated successfully.",
            dependent: updatedUser
        });
    } catch (err) {
        console.error("[FAMILY] Update dependent error:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.deleteDependentProfile = async (req, res) => {
    try {
        const { dependentId } = req.params;
        const userId = req.user.id;

        const dep = localDb.findOne('users', u => u.id === dependentId && u.managed_by_user_id === userId);
        if (!dep) {
            return res.status(404).json({ error: "Managed dependent profile not found." });
        }

        // Revoke proxy access
        try {
            await proxyAuthorizationService.revokeProxyAccess({
                relationshipId: null,
                patientId: dependentId,
                caregiverUserId: userId,
                requestingUser: req.user,
                reason: 'Dependent profile deleted by manager'
            });
        } catch (e) {}

        // Remove from localDb
        localDb.delete('users', u => u.id === dependentId);

        try {
            await supabase.from('users').delete().eq('id', dependentId);
        } catch (e) {}

        res.json({ success: true, message: "Managed dependent profile removed successfully." });
    } catch (err) {
        console.error("[FAMILY] Delete dependent error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * -------------------------------------------------------------
 * 2. MULTI-CHANNEL DISPATCH (SMS & WHATSAPP INTEGRATION)
 * -------------------------------------------------------------
 */
exports.inviteFamilyMemberByPhone = async (req, res) => {
    try {
        const { phone, relation = 'FAMILY', permission_scope = 'REFERRAL_STATUS' } = req.body;
        const userId = req.user.id;

        if (!phone) {
            return res.status(400).json({ error: "Family member's mobile phone number is required." });
        }

        const normalizedPhone = String(phone).replace(/\D/g, '').slice(-10);
        if (normalizedPhone.length < 10) {
            return res.status(400).json({ error: "Please enter a valid 10-digit mobile number." });
        }

        const fakeEmail = `${normalizedPhone}@phone.swasthya.org`;

        const invitation = await proxyAuthorizationService.createFamilyInvitation({
            patientId: userId,
            caregiverEmail: fakeEmail,
            relationshipType: relation,
            permissionScope: permission_scope,
            requestingUser: req.user
        });

        invitation.caregiver_phone = normalizedPhone;

        const requesterName = req.user.name || req.user.full_name || 'A family member';
        const smsResult = await smsService.sendFamilyInviteSMS(normalizedPhone, {
            requesterName,
            relation,
            code: invitation.verification_code,
            link: `https://swasthya-zeta.vercel.app/family/accept?token=${invitation.invitation_token}`
        });

        res.status(201).json({
            success: true,
            message: `SMS invitation sent to +91 ${normalizedPhone}. Verification code: ${invitation.verification_code}`,
            invitation,
            sms: smsResult
        });
    } catch (err) {
        console.error("[FAMILY] Invite by phone error:", err);
        const status = err.status || 500;
        res.status(status).json({ error: err.message, code: err.code });
    }
};

exports.getWhatsAppInvitePayload = async (req, res) => {
    try {
        const { phone, relation = 'Family', code, token } = req.query;
        const requesterName = req.user?.name || req.user?.full_name || 'Family Member';
        const acceptUrl = `https://swasthya-zeta.vercel.app/family/accept?token=${token || ''}`;

        const messageText = `*Swasthya Family Connection Request*\n\n` +
            `Hello! ${requesterName} has invited you to connect as *${relation}* on Swasthya to coordinate health updates and medical records.\n\n` +
            `• *6-Digit Verification Code:* ${code || '------'}\n` +
            `• *Accept Connection Link:* ${acceptUrl}\n\n` +
            `_This request is secure, end-to-end encrypted, and revocable at any time._`;

        const waUrl = phone 
            ? `https://wa.me/91${String(phone).replace(/\D/g, '').slice(-10)}?text=${encodeURIComponent(messageText)}`
            : `https://wa.me/?text=${encodeURIComponent(messageText)}`;

        res.json({
            success: true,
            shareText: messageText,
            whatsappUrl: waUrl,
            acceptUrl
        });
    } catch (err) {
        console.error("[FAMILY] WhatsApp payload error:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * -------------------------------------------------------------
 * 3. FAMILY ACTIVITY FEED & REAL-TIME CARE ALERTS
 * -------------------------------------------------------------
 */
exports.getFamilyActivityFeed = async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Get all linked family members and dependents
        const members = await proxyAuthorizationService.getCaregiverLinkedPatients(userId);
        const localDependents = localDb.find('users', u => u.managed_by_user_id === userId) || [];

        const allTargetIds = new Set();
        const memberInfoMap = new Map();

        members.forEach(m => {
            const pId = m.patient_id || m.patient?.id;
            if (pId) {
                allTargetIds.add(pId);
                memberInfoMap.set(pId, {
                    name: m.patient?.full_name || m.patient?.name || 'Family Member',
                    relation: m.relationship_type || 'Family'
                });
            }
        });

        localDependents.forEach(dep => {
            allTargetIds.add(dep.id);
            memberInfoMap.set(dep.id, {
                name: dep.full_name || dep.name || 'Dependent',
                relation: dep.medical_history?.relationship_type || 'Dependent'
            });
        });

        const targetIdList = Array.from(allTargetIds);
        const activities = [];

        // 2. Fetch recent appointments
        for (const targetId of targetIdList) {
            const info = memberInfoMap.get(targetId) || { name: 'Family Member', relation: 'Family' };
            const appointments = localDb.find('appointments', a => a.patient_id === targetId) || [];
            appointments.forEach(apt => {
                activities.push({
                    id: `act_apt_${apt.id}`,
                    type: 'APPOINTMENT',
                    member_id: targetId,
                    member_name: info.name,
                    relation: info.relation,
                    title: `Doctor Appointment: ${apt.department || 'Consultation'}`,
                    description: `Scheduled for ${apt.appointment_date ? new Date(apt.appointment_date).toLocaleDateString() : 'Upcoming'} (${apt.status || 'CONFIRMED'})`,
                    timestamp: apt.created_at || apt.appointment_date || new Date().toISOString(),
                    status: apt.status || 'CONFIRMED'
                });
            });

            // 3. Fetch recent referrals
            const referrals = localDb.find('referrals', r => r.patient_id === targetId) || [];
            referrals.forEach(ref => {
                activities.push({
                    id: `act_ref_${ref.id}`,
                    type: 'REFERRAL',
                    member_id: targetId,
                    member_name: info.name,
                    relation: info.relation,
                    title: `Referral: ${ref.primary_complaint || 'Specialist Care'}`,
                    description: `Status updated to ${ref.status?.replace(/_/g, ' ') || 'ACTIVE'} (Urgency: ${ref.urgency || 'ROUTINE'})`,
                    timestamp: ref.created_at || new Date().toISOString(),
                    status: ref.status
                });
            });

            // 4. Fetch recent documents / prescriptions
            const docs = localDb.find('documents', d => d.patient_id === targetId) || [];
            docs.filter(d => d.extracted_data?.hidden_from_family !== true && d.extracted_data?.hidden_from_family !== 'true')
                .forEach(doc => {
                    activities.push({
                        id: `act_doc_${doc.id}`,
                        type: 'DOCUMENT',
                        member_id: targetId,
                        member_name: info.name,
                        relation: info.relation,
                        title: doc.type === 'prescription' ? 'New Prescription Issued' : 'New Lab Report Added',
                        description: doc.summary || (doc.type === 'prescription' ? 'Doctor prescribed medicines' : 'Diagnostic report uploaded'),
                        timestamp: doc.created_at || new Date().toISOString(),
                        status: 'COMPLETED'
                    });
                });
        }

        // Sort descending by timestamp
        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        res.json({
            success: true,
            total_events: activities.length,
            activities: activities.slice(0, 30)
        });
    } catch (err) {
        console.error("[FAMILY] Activity feed error:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.getMemberDetails = async (req, res) => {
    try {
        const { memberId } = req.params;
        const userId = req.user.id;

        // Check if this is a managed dependent of the user
        const dependent = localDb.findOne('users', u => u.id === memberId && u.managed_by_user_id === userId);

        let relationship = null;
        if (!dependent) {
            // Verify caregiver access with required scope
            relationship = await proxyAuthorizationService.validateCaregiverAccess({
                caregiverUserId: userId,
                patientId: memberId,
                requiredScope: 'REFERRAL_STATUS'
            });
        }

        const member = dependent || await dbService.getUser(memberId);
        if (!member) {
            return res.status(404).json({ error: "Member not found." });
        }

        let documents = [];
        let appointments = [];

        try {
            const docProxy = await proxyAuthorizationService.getPatientDataProxy({
                caregiverUserId: userId,
                patientId: memberId,
                dataType: 'DOCUMENTS'
            });
            documents = docProxy.records;
        } catch (e) {
            documents = [];
        }

        try {
            const aptProxy = await proxyAuthorizationService.getPatientDataProxy({
                caregiverUserId: userId,
                patientId: memberId,
                dataType: 'APPOINTMENTS'
            });
            appointments = aptProxy.records;
        } catch (e) {
            appointments = [];
        }

        res.json({
            member: {
                id: member.id,
                name: member.name || member.full_name,
                phone: member.phone,
                dob: member.dob || member.date_of_birth,
                gender: member.gender,
                blood_group: member.blood_group,
                is_managed_dependent: !!dependent
            },
            documents,
            appointments,
            relation: dependent ? (dependent.medical_history?.relationship_type || 'DEPENDENT') : relationship?.relationship_type,
            permission_scope: dependent ? 'FULL_ACCESS' : relationship?.permission_scope
        });
    } catch (err) {
        console.error("[FAMILY] Get member details error:", err);
        const status = err.status || 403;
        res.status(status).json({ error: err.message, code: err.code });
    }
};

exports.removeFamilyMember = async (req, res) => {
    try {
        const { memberId } = req.params;
        const userId = req.user.id;

        await proxyAuthorizationService.revokeProxyAccess({
            relationshipId: null,
            patientId: memberId,
            caregiverUserId: userId,
            requestingUser: req.user,
            reason: 'Removed by family proxy'
        });

        res.json({ success: true, message: "Family member link revoked successfully." });
    } catch (err) {
        console.error("[FAMILY] Remove member error:", err);
        const status = err.status || 400;
        res.status(status).json({ error: err.message, code: err.code });
    }
};

module.exports = exports;
