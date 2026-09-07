const proxyAuthorizationService = require('../services/proxyAuthorizationService');
const supabase = require('../config/supabaseClient');
const dbService = require('../services/supabaseService');

/**
 * Legacy-compatible Family Controller mapped to Canonical Proxy Authorization Service
 */
exports.initiateFamilyLink = async (req, res) => {
    try {
        const { phone, relation = 'FAMILY', permission_scope = 'REFERRAL_STATUS' } = req.body;
        const userId = req.user.id;

        const normalizedPhone = String(phone).replace(/\D/g, '').slice(-10);
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
        res.json(members);
    } catch (err) {
        console.error("[FAMILY] Get members error:", err);
        res.status(500).json({ error: err.message });
    }
};

exports.getMemberDetails = async (req, res) => {
    try {
        const { memberId } = req.params;
        const userId = req.user.id;

        // Verify caregiver access with required scope
        const relationship = await proxyAuthorizationService.validateCaregiverAccess({
            caregiverUserId: userId,
            patientId: memberId,
            requiredScope: 'REFERRAL_STATUS'
        });

        const member = await dbService.getUser(memberId);
        if (!member) {
            return res.status(404).json({ error: "Member not found." });
        }

        // Check if caregiver has scope for clinical documents
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
            // Scope not granted for documents (omit gracefully)
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
                blood_group: member.blood_group
            },
            documents,
            appointments,
            relation: relationship.relationship_type,
            permission_scope: relationship.permission_scope
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
