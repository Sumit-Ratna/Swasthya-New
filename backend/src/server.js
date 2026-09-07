const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/env');
const supabase = require('./config/supabaseClient');
const { errorHandler } = require('./middleware/errorHandler');
const requestId = require('./middleware/requestId');

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
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swaggerDoc');

const app = express();
const PORT = config.port;

// 1. Attach Unique X-Request-ID Header to every request
app.use(requestId);

// 2. Strict / Explicit CORS Allow-list
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:8080',
    'http://localhost:8000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8000',
    'capacitor://localhost',
    'http://localhost',
    'ionic://localhost'
];

const lanIpRegex = /^(http:\/\/|https:\/\/)(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

app.use(cors({
    origin: (origin, callback) => {
        // Direct mobile native requests, Postman, curl have no Origin header
        if (!origin) return callback(null, true);

        // Check configured origins wildcard or specific match
        if (config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) {
            return callback(null, true);
        }

        // Check local development allow-list
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        // Check LAN IP patterns (Wi-Fi testing) or Vercel preview URLs
        if (lanIpRegex.test(origin) || origin.endsWith('.vercel.app')) {
            return callback(null, true);
        }

        console.warn(`[CORS] Rejected Origin: ${origin}`);
        return callback(new Error(`CORS policy does not allow access from origin: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Bypass-Tunnel-Reminder',
        'ngrok-skip-browser-warning',
        'X-Requested-With',
        'X-Request-ID',
        'x-user-id',
        'x-user-role',
        'x-facility-id'
    ],
    credentials: true
}));

// 3. Disciplined Body Limits for Standard Endpoints (Uploads use Multer)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// 4. Sanitized Diagnostic Request Logger (no passwords / tokens / medical payloads dumped)
app.use((req, res, next) => {
    const origin = req.headers.origin || 'mobile/direct';
    console.log(`[HTTP ${req.method}] ${req.originalUrl} | ReqID: ${req.id} | From: ${origin}`);
    next();
});

// Static uploads directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 5. Root & Health check with Real Lightweight Supabase Probe
app.get('/', (req, res) => {
    res.json({
        name: 'SwasthyaSetu Unified Healthcare API',
        version: '2.0.0',
        message: 'API is running with Supabase PostgreSQL and Canonical Closed-Loop Referral State Engine',
        swagger_docs: '/api-docs',
        status: 'healthy',
        requestId: req.id,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/health', async (req, res) => {
    const startTime = Date.now();
    let dbStatus = 'healthy';
    let dbLatencyMs = 0;

    try {
        const { error } = await supabase.from('facilities').select('id').limit(1);
        dbLatencyMs = Date.now() - startTime;
        if (error) {
            dbStatus = `degraded: ${error.message}`;
        }
    } catch (err) {
        dbStatus = `unreachable: ${err.message}`;
        dbLatencyMs = Date.now() - startTime;
    }

    const overallHealthy = !dbStatus.startsWith('unreachable');
    res.status(overallHealthy ? 200 : 503).json({
        status: overallHealthy ? 'healthy' : 'unhealthy',
        environment: config.env,
        database: {
            status: dbStatus,
            latencyMs: dbLatencyMs,
            engine: 'Supabase PostgreSQL'
        },
        uptimeSeconds: Math.floor(process.uptime()),
        requestId: req.id,
        timestamp: new Date().toISOString()
    });
});

// API Routes
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

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Swasthya Healthcare API - Swagger Docs'
}));
app.use('/swagger', (req, res) => res.redirect('/api-docs'));

// 6. Centralized 404 Handler for Unknown Routes
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        code: 'NOT_FOUND',
        message: `Endpoint not found: ${req.method} ${req.originalUrl}`,
        error: `Endpoint not found: ${req.method} ${req.originalUrl}`,
        requestId: req.id,
        path: req.originalUrl,
        timestamp: new Date().toISOString()
    });
});

// 7. Centralized Error Handling Middleware
app.use(errorHandler);

// Start Server listening on 0.0.0.0
const HOST = config.host;
if (require.main && require.main.filename === __filename && !process.env.VERCEL) {
    app.listen(PORT, HOST, async () => {
        console.log(`[SERVER] Running on http://${HOST}:${PORT}`);
        console.log(`[NETWORK] Localhost: http://localhost:${PORT}`);
        console.log(`[SWAGGER] Docs: http://localhost:${PORT}/api-docs`);
        try {
            const { error } = await supabase.from('facilities').select('id').limit(1);
            if (error) {
                console.warn('[WARNING] Supabase query notice:', error.message);
            } else {
                console.log('[SUCCESS] Connected to Supabase Database successfully.');
            }
        } catch (err) {
            console.warn('[WARNING] Supabase initial ping exception:', err.message);
        }
    });
}

module.exports = app;
