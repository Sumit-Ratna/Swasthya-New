const express = require('express');
const cors = require('cors');
const path = require('path');
const supabase = require('./config/supabaseClient');
require('dotenv').config();

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

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());
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

app.get('/', (req, res) => {
    res.json({
        name: 'SwasthyaSetu / HealthNexus Unified Healthcare API',
        message: 'API is Running with Supabase PostgreSQL and Closed-Loop Referral Engine',
        status: 'healthy',
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

// Start Server with Supabase Check
app.listen(PORT, async () => {
    console.log(`[SERVER] Running on http://localhost:${PORT}`);
    try {
        const { error } = await supabase.from('users').select('id').limit(1);
        if (error) {
            console.warn('[WARNING] Supabase query notice:', error.message);
        } else {
            console.log('[SUCCESS] Connected to Supabase Database successfully');
        }
    } catch (err) {
        console.warn('[WARNING] Supabase initial ping exception:', err.message);
    }
});

module.exports = app;

