const { User } = require('./src/models');
const sequelize = require('./src/config/database');

(async () => {
    try {
        console.log("🔍 Debugging Users...");
        const users = await User.findAll();
        console.log(`✅ Found ${users.length} users.`);

        users.forEach(u => {
            console.log(`--------------------------------------------------`);
            console.log(`ID:       ${u.id}`);
            console.log(`Name:     ${u.name}`);
            console.log(`Phone:    ${u.phone}`);
            console.log(`Role:     '${u.role}' (Type: ${typeof u.role})`);

            // Check if role is enumerable but hidden?
            console.log(`Raw Values:`, u.dataValues);
        });

    } catch (err) {
        console.error("❌ Error fetching users:", err);
    } finally {
        process.exit();
    }
})();
