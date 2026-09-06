const { Document } = require('./src/models');
const sequelize = require('./src/config/database');

async function fixDb() {
    try {
        console.log("Fixing Documents table...");
        await sequelize.query("ALTER TABLE Documents MODIFY COLUMN file_url VARCHAR(255) NULL;");
        console.log("✅ file_url is now NULLABLE");

        // Also ensure shared_with is NULLABLE if not already
        await sequelize.query("ALTER TABLE Documents MODIFY COLUMN shared_with JSON NULL;");
        console.log("✅ shared_with is now NULLABLE");

        // Fix specialization and hospital_name mapping if needed
        // The User model has them as top-level fields. 
        // Let's ensure they exist in DB.
        const [results] = await sequelize.query("DESCRIBE Users;");
        const columns = results.map(r => r.Field);

        if (!columns.includes('specialization')) {
            await sequelize.query("ALTER TABLE Users ADD COLUMN specialization VARCHAR(255);");
        }
        if (!columns.includes('hospital_name')) {
            await sequelize.query("ALTER TABLE Users ADD COLUMN hospital_name VARCHAR(255);");
        }
        if (!columns.includes('doctor_qr_id')) {
            await sequelize.query("ALTER TABLE Users ADD COLUMN doctor_qr_id VARCHAR(255) UNIQUE;");
        }

        // Ensure Role Column Exists & Correct Data
        if (!columns.includes('role')) {
            await sequelize.query("ALTER TABLE Users ADD COLUMN role ENUM('patient', 'doctor', 'admin') DEFAULT 'patient';");
            console.log("✅ Added role column");
        }
        // Fix any potential null or uppercase roles
        await sequelize.query("UPDATE Users SET role='patient' WHERE role IS NULL;");
        // Ensure lowercase is used
        // Note: ENUM handles this usually, but good to be safe if changed to VARCHAR

        console.log("✅ Doctor fields & Role verified");

        process.exit(0);
    } catch (err) {
        console.error("❌ Fix failed:", err);
        process.exit(1);
    }
}

fixDb();
