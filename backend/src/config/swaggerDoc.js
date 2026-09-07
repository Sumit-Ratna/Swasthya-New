const swaggerSpec = {
    openapi: '3.0.0',
    info: {
        title: 'SwasthyaSetu / HealthNexus Healthcare API',
        version: '1.0.0',
        description: 'Comprehensive Interactive API Documentation & Testing Sandbox for Swasthya AI-Assisted Rural Healthcare Coordination & Closed-Loop Referral Platform.',
        contact: {
            name: 'Swasthya Engineering Support',
            url: 'https://swasthya-zeta.vercel.app'
        }
    },
    servers: [
        {
            url: 'http://localhost:8000',
            description: 'Local Development Server'
        },
        {
            url: 'https://swasthya-zeta.vercel.app',
            description: 'Live Vercel Production Server'
        }
    ],
    components: {
        securitySchemes: {
            BearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Enter your Bearer token in the format **Bearer <token>**'
            }
        }
    },
    security: [
        {
            BearerAuth: []
        }
    ],
    paths: {
        '/api/health': {
            get: {
                summary: 'System Health Check',
                tags: ['System & Diagnostics'],
                responses: {
                    200: {
                        description: 'System is healthy and database is active'
                    }
                }
            }
        },
        '/api/auth/send-otp': {
            post: {
                summary: 'Send Mobile OTP for Authentication',
                tags: ['Authentication'],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    phone: { type: 'string', example: '9876543210' }
                                },
                                required: ['phone']
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'OTP sent successfully' }
                }
            }
        },
        '/api/auth/verify-otp': {
            post: {
                summary: 'Verify OTP & Log In / Register User',
                tags: ['Authentication'],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    phone: { type: 'string', example: '9876543210' },
                                    otp: { type: 'string', example: '123456' },
                                    role: { type: 'string', enum: ['patient', 'health_worker', 'caregiver', 'doctor', 'facility_staff', 'admin'], example: 'patient' }
                                },
                                required: ['phone', 'otp']
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'Authentication successful with JWT token and profile data' }
                }
            }
        },
        '/api/auth/email-login': {
            post: {
                summary: 'Sign In with Gmail / Email & Password',
                tags: ['Authentication'],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    email: { type: 'string', example: 'patient@example.com' },
                                    password: { type: 'string', example: 'password123' },
                                    role: { type: 'string', example: 'patient' }
                                },
                                required: ['email', 'password']
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'Logged in successfully' }
                }
            }
        },
        '/api/auth/guest-login': {
            post: {
                summary: 'Instant Role-Based Demo / Guest Login',
                tags: ['Authentication'],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    role: { 
                                        type: 'string', 
                                        enum: ['patient', 'health_worker', 'caregiver', 'doctor', 'facility_coordinator', 'admin'],
                                        example: 'health_worker' 
                                    }
                                },
                                required: ['role']
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'Session created for requested role' }
                }
            }
        },
        '/api/profile/me': {
            get: {
                summary: 'Fetch Current User Profile',
                tags: ['Patient & User Profile'],
                responses: {
                    200: { description: 'Returns user profile and medical history details' }
                }
            }
        },
        '/api/assessments/triage': {
            post: {
                summary: 'AI Clinical Risk Triage & Vitals Stratification',
                tags: ['AI Triage & Clinical Assessment'],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    systolic_bp: { type: 'number', example: 140 },
                                    diastolic_bp: { type: 'number', example: 90 },
                                    spo2: { type: 'number', example: 96 },
                                    heart_rate: { type: 'number', example: 78 },
                                    temperature: { type: 'number', example: 98.6 },
                                    respiratory_rate: { type: 'number', example: 18 },
                                    is_pregnant: { type: 'boolean', example: false },
                                    symptoms: { type: 'string', example: 'Persistent fever and mild chest discomfort' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'Returns calculated risk tier (GREEN/YELLOW/ORANGE/RED), priority score, and explainability factors' }
                }
            }
        },
        '/api/facilities': {
            get: {
                summary: 'List Capable Facilities & Real-Time Operational Loads',
                tags: ['Facilities & Referral Routing'],
                parameters: [
                    { name: 'specialty', in: 'query', schema: { type: 'string', example: 'Cardiology' } },
                    { name: 'emergency_only', in: 'query', schema: { type: 'boolean', example: false } }
                ],
                responses: {
                    200: { description: 'List of matching facilities with ICU/bed availability' }
                }
            }
        },
        '/api/referrals': {
            get: {
                summary: 'Get Referrals List',
                tags: ['13-State Referral Engine'],
                responses: {
                    200: { description: 'Returns list of referral records with current tracking state' }
                }
            },
            post: {
                summary: 'Create a Closed-Loop Referral',
                tags: ['13-State Referral Engine'],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    patient_id: { type: 'string', example: 'usr-12345' },
                                    source_facility: { type: 'string', example: 'PHC Shirur' },
                                    target_facility_id: { type: 'string', example: 'fac-dgh-01' },
                                    urgency_tier: { type: 'string', enum: ['ROUTINE', 'URGENT', 'EMERGENCY'], example: 'URGENT' },
                                    clinical_notes: { type: 'string', example: 'Suspected severe pre-eclampsia requiring specialist review' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    201: { description: 'Referral created and state machine initialized to TRIAGED / FACILITY_RECOMMENDED' }
                }
            }
        },
        '/api/referrals/{id}/status': {
            patch: {
                summary: 'Transition Referral State in 13-State Machine',
                tags: ['13-State Referral Engine'],
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    new_status: { 
                                        type: 'string', 
                                        enum: [
                                            'TRIAGED', 'FACILITY_RECOMMENDED', 'FACILITY_SELECTED', 
                                            'APPOINTMENT_BOOKED', 'PATIENT_IN_TRANSIT', 'PATIENT_REACHED', 
                                            'CONSULTATION_IN_PROGRESS', 'TREATMENT_COMPLETED', 'FOLLOW_UP_SCHEDULED', 
                                            'COMPLETED', 'MISSED_APPOINTMENT', 'FAILED_REFERRAL'
                                        ],
                                        example: 'PATIENT_REACHED'
                                    },
                                    remarks: { type: 'string', example: 'Patient checked in at hospital front desk' }
                                },
                                required: ['new_status']
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'State transitioned and SHA-256 audit ledger entry generated' }
                }
            }
        },
        '/api/doctor/patients': {
            get: {
                summary: 'List Assigned Doctor Patients & Queue',
                tags: ['Doctor Portal & Clinical OPD'],
                responses: {
                    200: { description: 'Queue of patients for consultation' }
                }
            }
        },
        '/api/doctor/prescribe': {
            post: {
                summary: 'Issue Digitally Signed Prescription & Guardian AI Safety Check',
                tags: ['Doctor Portal & Clinical OPD'],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    patient_id: { type: 'string', example: 'usr-12345' },
                                    diagnosis: { type: 'string', example: 'Essential Hypertension Grade 1' },
                                    medicines: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                name: { type: 'string', example: 'Amlodipine 5mg' },
                                                dosage: { type: 'string', example: '1 tablet once daily morning' },
                                                duration: { type: 'string', example: '30 days' },
                                                instructions: { type: 'string', example: 'After food with water' }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'Prescription stored and Guardian AI interaction analysis performed' }
                }
            }
        },
        '/api/asha/patients': {
            get: {
                summary: 'Get ASHA Catchment Patient Directory',
                tags: ['ASHA / ANM Rural Operations'],
                responses: {
                    200: { description: 'List of rural household members under ASHA tracking' }
                }
            }
        },
        '/api/asha/register-patient': {
            post: {
                summary: 'Quick Field Registration for Rural Patient',
                tags: ['ASHA / ANM Rural Operations'],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    name: { type: 'string', example: 'Sunita Patil' },
                                    age: { type: 'number', example: 28 },
                                    gender: { type: 'string', example: 'Female' },
                                    village: { type: 'string', example: 'Pimpalgaon' },
                                    mobile: { type: 'string', example: '9822334455' },
                                    rch_id: { type: 'string', example: 'RCH-MH-2026-0988' }
                                },
                                required: ['name', 'village']
                            }
                        }
                    }
                },
                responses: {
                    201: { description: 'Patient registered in local catchment and synced to Supabase' }
                }
            }
        },
        '/api/caregiver/dependents': {
            get: {
                summary: 'List Authorized Dependents under Caregiver Proxy',
                tags: ['Caregiver & Family Proxy Hub'],
                responses: {
                    200: { description: 'Dependents with scoped permissions, vitals radars, and pillbox adherence' }
                }
            }
        },
        '/api/caregiver/sos': {
            post: {
                summary: 'Trigger 1-Click Emergency SOS Panic Alert',
                tags: ['Caregiver & Family Proxy Hub'],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    patient_id: { type: 'string', example: 'usr-elderly-01' },
                                    lat: { type: 'number', example: 18.5204 },
                                    lng: { type: 'number', example: 73.8567 },
                                    notes: { type: 'string', example: 'Severe breathlessness reported at home' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'SOS dispatched to nearest emergency ambulance and linked primary facility' }
                }
            }
        },
        '/api/admin/kpis': {
            get: {
                summary: 'Get Executive Level KPIs and Referral Closure Metrics',
                tags: ['Admin & MSInS Oversight'],
                responses: {
                    200: { description: 'Closed-loop referral rates, facility load distributions, and SLA metrics' }
                }
            }
        },
        '/api/admin/audit-ledger': {
            get: {
                summary: 'Retrieve Tamper-Evident SHA-256 Audit Chain Ledger',
                tags: ['Admin & MSInS Oversight'],
                responses: {
                    200: { description: 'Cryptographic block chain of all referral state changes and medical records' }
                }
            }
        }
    }
};

module.exports = swaggerSpec;
