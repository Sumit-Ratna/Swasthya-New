const dbService = require('../services/supabaseService');

const VALID_USER_COLUMNS = new Set([
    'name', 'email', 'dob', 'gender', 'blood_group',
    'emergency_contact', 'allergies', 'chronic_conditions',
    'medications', 'specialization', 'hospital_name', 'doctor_qr_id'
]);

// Update User Profile
exports.updateProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { section, data } = req.body;
        const inputData = data || req.body;

        console.log(`[UPDATE] Updating profile for user ${userId} in Supabase`);

        const updatedUser = await dbService.updateUser(userId, inputData);

        res.json({
            success: true,
            message: "Profile updated successfully",
            user: updatedUser
        });

    } catch (err) {
        next(err);
    }
};

// Get User Profile
exports.getProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const user = await dbService.getUser(userId);

        if (!user) {
            return res.json({
                success: true,
                user: {
                    id: userId,
                    name: req.user.name || "Swasthya User",
                    phone: req.user.phone || "",
                    email: req.user.email || "",
                    role: req.user.role || "PATIENT",
                    blood_group: "",
                    allergies: [],
                    chronic_conditions: [],
                    medications: [],
                    medical_history: {}
                }
            });
        }

        const flattened = {
            ...user,
            ...(user?.medical_history || {})
        };

        res.json({
            success: true,
            user: flattened
        });
    } catch (err) {
        next(err);
    }
};

// Update / Record Profile Consent
exports.updateConsent = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { 
            consent_status = 'GRANTED', 
            consent_version = 'medical-history-v1', 
            consent_purpose = 'MEDICAL_HISTORY_AND_PRESCRIPTION_STORAGE',
            related_record_id = null 
        } = req.body;

        const updated = await dbService.updatePatientConsent(
            userId, 
            consent_status, 
            userId, 
            req.user.role || 'patient',
            {
                consent_version,
                consent_purpose,
                related_record_id
            }
        );

        res.json({
            success: true,
            message: `Consent successfully recorded as ${consent_status}`,
            data: updated
        });
    } catch (err) {
        next(err);
    }
};

// Delete User Profile
exports.deleteProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;
        console.log(`[DELETE] Deleting account for user ${userId}`);

        await dbService.deleteUser(userId);
        res.json({
            success: true,
            message: "Account deleted successfully"
        });
    } catch (err) {
        next(err);
    }
};

module.exports = exports;
