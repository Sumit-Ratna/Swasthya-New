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

        console.log(`[UPDATE] Updating ${section || 'full'} profile for user ${userId}`);

        let updates = {};
        const inputData = data || req.body;

        if (section === 'medical') {
            updates = { medical_history: inputData };
        } else if (section === 'lifestyle') {
            updates = { lifestyle: inputData };
        } else {
            // Personal / Full profile update
            const directFields = {};
            const extraMeta = {};

            Object.entries(inputData).forEach(([key, val]) => {
                if (key === 'id' || key === 'phone' || key === 'role' || key === 'section' || key === 'refresh_token') {
                    return; // Skip protected/internal fields
                }
                
                let cleanVal = val;
                if (cleanVal === '') cleanVal = null;

                if (VALID_USER_COLUMNS.has(key)) {
                    directFields[key] = cleanVal;
                } else if (key === 'medical_history' || key === 'lifestyle') {
                    directFields[key] = cleanVal;
                } else {
                    extraMeta[key] = cleanVal;
                }
            });

            // If allergies/chronic_conditions/medications are arrays or strings
            if (Array.isArray(directFields.allergies)) directFields.allergies = directFields.allergies.join(', ');
            if (Array.isArray(directFields.chronic_conditions)) directFields.chronic_conditions = directFields.chronic_conditions.join(', ');
            if (Array.isArray(directFields.medications)) directFields.medications = directFields.medications.join(', ');

            // Merge extra Indian Citizen metadata into medical_history jsonb
            const existingUser = await dbService.getUser(userId) || {};
            const currentMedHist = existingUser.medical_history || {};
            
            directFields.medical_history = {
                ...currentMedHist,
                ...extraMeta,
                ...(inputData.medical_history || {})
            };

            updates = directFields;
        }

        const updated = await dbService.updateUser(userId, updates);
        const fullUser = await dbService.getUser(userId);

        // Flatten metadata for seamless frontend consumption
        const responseUser = {
            ...fullUser,
            ...(fullUser?.medical_history || {})
        };

        res.json({
            message: "Profile updated successfully",
            user: responseUser
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
