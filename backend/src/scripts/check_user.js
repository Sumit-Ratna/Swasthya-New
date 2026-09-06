const firestoreService = require('../services/firestoreService');
const { db } = require('../config/firebaseAdmin');

async function checkUserData() {
    try {
        console.log("Fetching users...");
        const snapshot = await db.collection('users').get();

        const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        for (const user of users) {
            console.log(`\nUser: ${user.name} (${user.phone}) [ID: ${user.id}]`);
            console.log("Medical History:", JSON.stringify(user.medical_history, null, 2));
            console.log("Lifestyle:", JSON.stringify(user.lifestyle, null, 2));

            const docs = await db.collection('documents').where('patient_id', '==', user.id).get();
            console.log(`Documents found: ${docs.size}`);
            docs.forEach(d => console.log(` - ${d.data().type} (${d.id})`));
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

// Wait for DB init
setTimeout(checkUserData, 2000);
