const dbService = require('../services/supabaseService');

const VALID_USER_COLUMNS = new Set([
    'name', 'email', 'dob', 'gender', 'blood_group',
    'emergency_contact', 'allergies', 'chronic_conditions',
    'medications', 'specialization', 'hospital_name', 'doctor_qr_id'
]);

// Update User Profile
exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { section, data } = req.body;
        const inputData = data || req.body;

        console.log(`[UPDATE] Updating profile for user ${userId} in Supabase`);

        const updatedUser = await dbService.updateUser(userId, inputData);

        res.json({
            message: "Profile updated successfully",
            user: updatedUser
        });

    } catch (err) {
        console.error("Profile Update Error:", err);
        res.status(500).json({ error: err.message });
    }
};

// Get User Profile
exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await dbService.getUser(userId);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const flattened = {
            ...user,
            ...(user?.medical_history || {})
        };

        res.json(flattened);
    } catch (err) {
        console.error("Get Profile Error:", err);
        res.status(500).json({ error: err.message });
    }
};

// Delete User Profile
exports.deleteProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log(`[DELETE] Deleting account for user ${userId}`);

        await dbService.deleteUser(userId);
        res.json({ message: "Account deleted successfully" });
    } catch (err) {
        console.error("Delete Profile Error:", err);
        res.status(500).json({ error: err.message });
    }
};

module.exports = exports;
