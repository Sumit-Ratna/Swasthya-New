const axios = require('axios');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const supabase = require('../../src/config/supabaseClient');
const dbService = require('../../src/services/supabaseService');

async function testAshaRegistration() {
    const testEmail = 'sumitratna@gmail.com';
    const testPassword = 'password123';
    const testName = 'Sumitra Ratna (ASHA)';
    const testPhone = '9876543299';

    console.log('Testing ASHA registration with Supabase for:', testEmail);

    try {
        const userId = require('crypto').randomUUID();
        // Test dbService.createUser directly
        const user = await dbService.createUser(userId, {
            email: testEmail,
            password_hash: '$2b$10$wE8wY0B9KqjX5Z5yXhB6EeNn3nI5sF7aF1b3.a8c8.e8.g8.i8.k',
            name: testName,
            phone: testPhone,
            role: 'health_worker',
            assigned_subcentre: 'Shirwal Sub-Centre, Ward 4',
            assigned_phc: 'Shirwal PHC'
        });

        console.log('✅ Successfully created ASHA user in Supabase:', user);

        // Test querying user back by email
        const fetched = await dbService.getUserByEmail(testEmail);
        console.log('✅ Successfully fetched ASHA user from Supabase by email:', fetched);

    } catch (err) {
        console.error('❌ Test failed:', err);
    }
}

testAshaRegistration().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
