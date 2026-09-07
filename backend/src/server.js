const express = require('express');
const cors = require('cors');
const path = require('path');
const supabase = require('./config/supabaseClient');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const connectRoutes = require('./routes/connect');
const aiRoutes = require('./routes/ai');
const documentRoutes = require('./routes/documents');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const notificationRoutes = require('./routes/notifications');
const appointmentRoutes = require('./routes/appointments');
const doctorRoutes = require('./routes/doctor');
const familyRoutes = require('./routes/family');
const referralRoutes = require('./routes/referrals');
const facilityRoutes = require('./routes/facilities');
const assessmentRoutes = require('./routes/assessments');
const adminRoutes = require('./routes/admin');
const feedbackRoutes = require('./routes/feedback');
const ashaRoutes = require('./routes/asha');
const caregiverRoutes = require('./routes/caregiver');
const facilityOpsRoutes = require('./routes/facilityOps');

const app = express();
const PORT = process.env.PORT || 8000;

// CORS configuration supporting mobile Capacitor, Web, Localhost, and LAN IPs
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Bypass-Tunnel-Reminder', 'ngrok-skip-browser-warning', 'X-Requested-With', 'x-user-id', 'x-user-role'],
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Diagnostic Request Logger for Mobile & Web requests
app.use((req, res, next) => {
    const origin = req.headers.origin || 'mobile/direct';
    console.log(`[HTTP ${req.method}] ${req.originalUrl} | From: ${origin} | IP: ${req.ip}`);
    next();
});

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/connect', connectRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/facilities', facilityRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/asha', ashaRoutes);
app.use('/api/caregiver', caregiverRoutes);
app.use('/api/facility-ops', facilityOpsRoutes);

app.get('/', (req, res) => {
    res.json({
        name: 'SwasthyaSetu / HealthNexus Unified Healthcare API',
        message: 'API is Running with Supabase PostgreSQL and Closed-Loop Referral Engine',
        status: 'healthy',
        database: 'Connected to Supabase PostgreSQL',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        database: 'Supabase PostgreSQL (Active)',
        timestamp: new Date().toISOString()
    });
});

// Start Server listening on 0.0.0.0 (Accessible via localhost, LAN IP 192.168.29.111, & reverse proxy)
const HOST = '0.0.0.0';
if (require.main && require.main.filename === __filename && !process.env.VERCEL) {
    app.listen(PORT, HOST, async () => {
        console.log(`[SERVER] Running on http://${HOST}:${PORT}`);
        console.log(`[NETWORK] Localhost: http://localhost:${PORT}`);
        console.log(`[NETWORK] Wi-Fi LAN:  http://192.168.29.111:${PORT}`);
        try {
            const { error } = await supabase.from('users').select('id').limit(1);
            if (error) {
                console.warn('[WARNING] Supabase query notice:', error.message);
            } else {
                console.log('[SUCCESS] Connected to Supabase Database successfully (virecfebgqsumovpumqe.supabase.co)');
            }
        } catch (err) {
            console.warn('[WARNING] Supabase initial ping exception:', err.message);
        }
    });
}

module.exports = app;


