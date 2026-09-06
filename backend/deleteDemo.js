const dbService = require('./src/services/mysqlService');

async function removeDemoUsers() {
    try {
        const p1 = '+91000000000D';
        const p2 = '+91000000000P';

        let u1 = await dbService.getUserByPhone(p1);
        if (u1) {
            await dbService.getUserModel().destroy({ where: { id: u1.id }});
            console.log('Removed demo doctor');
        } else {
            console.log('Demo doctor not found');
        }

        let u2 = await dbService.getUserByPhone(p2);
        if (u2) {
            await dbService.getUserModel().destroy({ where: { id: u2.id }});
            console.log('Removed demo patient');
        } else {
            console.log('Demo patient not found');
        }
    } catch (err) {
        console.error('Error removing demo users:', err);
    } finally {
        process.exit();
    }
}

// Ensure connection is established before running DB service.
// In mysqlService, the models depend on sequelize.sync() resolving, but simply connecting is enough for .destroy
const sequelize = require('./src/config/database');
sequelize.authenticate().then(() => {
    console.log('DB connected, removing...');
    removeDemoUsers();
}).catch(err => {
    console.error('Failed to connect to db:', err);
    process.exit(1);
});
