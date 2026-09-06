const { sequelize, FamilyLink } = require('./models');

async function syncFamily() {
    try {
        console.log("Syncing FamilyLink table...");
        await FamilyLink.sync({ alter: true });
        console.log("[SUCCESS] FamilyLink table synced successfully!");
    } catch (err) {
        console.error("[ERROR] Failed to sync FamilyLink:", err);
    } finally {
        await sequelize.close();
    }
}

syncFamily();
