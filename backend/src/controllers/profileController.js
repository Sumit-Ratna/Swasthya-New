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
            return res.status(404).json({
                success: false,
                error: "User not found",
                code: "USER_NOT_FOUND"
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

// Update Profile Consent
exports.updateConsent = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { consent_status } = req.body;

        if (!consent_status) {
            return res.status(400).json({
                success: false,
                error: "consent_status is required",
                code: "VALIDATION_ERROR"
            });
        }

        const updated = await dbService.updatePatientConsent(userId, consent_status, userId, req.user.role);

        res.json({
            success: true,
            message: `Consent updated to ${consent_status}`,
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
