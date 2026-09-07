const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const config = {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '8000', 10),
    host: process.env.HOST || '0.0.0.0',
    jwtSecret: process.env.JWT_SECRET || 'swasthya_secure_jwt_secret_2026_modular',
    supabase: {
        url: process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
        anonKey: process.env.SUPABASE_ANON_KEY || 'placeholder-anon-key',
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'placeholder-service-key'
    },
    aiServiceUrl: process.env.AI_SERVICE_URL || 'http://127.0.0.1:8001',
    corsOrigins: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(s => s.trim()) : ['*'],
    enableAuditChain: process.env.ENABLE_AUDIT_CHAIN !== 'false',
    demoMode: process.env.DEMO_MODE === 'true'
};

module.exports = config;
