const swaggerSpec = {
    openapi: '3.0.0',
    info: {
        title: 'SwasthyaSetu / HealthNexus Healthcare API',
        version: '2.0.0',
        description: 'Comprehensive Interactive OpenAPI 3.0 Documentation & Sandbox for Swasthya AI-Assisted Rural Healthcare Coordination, 21-State Closed-Loop Referral Engine & Patient EHR Platform.',
        contact: {
            name: 'Swasthya Engineering & MSInS Support',
            url: 'https://swasthya-zeta.vercel.app'
        }
    },
    servers: [
        {
            url: 'http://localhost:8000',
            description: 'Local Development API'
        },
        {
            url: 'https://swasthya-zeta.vercel.app',
            description: 'Production Cloud Deployment'
        }
    ],
    components: {
        securitySchemes: {
            BearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Enter your Bearer token in the format: Bearer <token>'
            }
        },
        schemas: {
            ReferralStateEnum: {
                type: 'string',
                enum: [
                    'TRIAGED',
                    'FACILITY_RECOMMENDED',
                    'FACILITY_SELECTED',
                    'FACILITY_CONFIRMATION_PENDING',
                    'ACCEPTED',
                    'APPOINTMENT_BOOKED',
                    'MISSED_APPOINTMENT',
                    'URGENT_ESCALATION',
                    'FACILITY_ALERTED',
                    'PATIENT_IN_TRANSIT',
                    'PATIENT_REACHED',
                    'DOCTOR_ASSIGNED',
                    'CONSULTATION_COMPLETED',
                    'DIAGNOSTICS_PENDING',
                    'DIAGNOSTICS_COMPLETED',
                    'TREATMENT_COMPLETED',
                    'FOLLOW_UP_PENDING',
                    'FOLLOW_UP_COMPLETED',
                    'REROUTING_REQUIRED',
                    'FAILED_REFERRAL',
                    'CANCELLED'
                ],
                example: 'DOCTOR_ASSIGNED'
            },
            UrgencyTierEnum: {
                type: 'string',
                enum: ['ROUTINE', 'URGENT', 'EMERGENCY'],
                example: 'URGENT'
            },
            UserRoleEnum: {
                type: 'string',
                enum: ['patient', 'health_worker', 'caregiver', 'doctor', 'facility_staff', 'facility_coordinator', 'admin'],
                example: 'patient'
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
                summary: 'System Health Check & Database Probe',
                tags: ['System & Diagnostics'],
                responses: {
                    200: { description: 'System is healthy and database is active with latency metrics' },
                    503: { description: 'Database unreachable or service degraded' }
                }
            }
        },
        '/api/health/ready': {
            get: {
                summary: 'System Readiness Probe (K8s / Render / Cloud)',
                tags: ['System & Diagnostics'],
                responses: {
                    200: { description: 'Service is ready to accept traffic' },
                    503: { description: 'Service not ready' }
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
                                    role: { $ref: '#/components/schemas/UserRoleEnum' }
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
                                    role: { $ref: '#/components/schemas/UserRoleEnum' }
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
        '/api/ai/health': {
            get: {
                summary: 'AI Engine Health & Circuit Breaker Telemetry',
                tags: ['AI Safety & Clinical Decision Support'],
                responses: {
                    200: { description: 'Telemetry regarding AI service health, latency, and circuit breaker state' }
                }
            }
        },
        '/api/ai/triage': {
            post: {
                summary: 'AI Clinical Risk Triage & Clamped Risk Stratification',
                tags: ['AI Safety & Clinical Decision Support'],
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
                    200: { description: 'Returns deterministic risk tier (GREEN/YELLOW/ORANGE/RED), score, and rule floor clamping' }
                }
            }
        },
        '/api/ai/summarize-report': {
            post: {
                summary: 'Lab Report Multimodal Summary (Non-Prescriptive)',
                tags: ['AI Safety & Clinical Decision Support'],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    report_text: { type: 'string', example: 'CBC: Hb 9.2 g/dL, WBC 11,200, Platelets 180k' },
                                    report_type: { type: 'string', example: 'CBC' }
                                },
                                required: ['report_text']
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'Returns educational summary with mandatory zero prescribing authority disclaimer' }
                }
            }
        },
        '/api/facilities': {
            get: {
                summary: 'List Capable Facilities & Operational Loads',
                tags: ['Facilities & Referral Routing'],
                parameters: [
                    { name: 'specialty', in: 'query', schema: { type: 'string', example: 'Cardiology' } },
                    { name: 'emergency_only', in: 'query', schema: { type: 'boolean', example: false } }
                ],
                responses: {
                    200: { description: 'List of matching facilities with ICU/bed availability and load meters' }
                }
            }
        },
        '/api/facility-ops/occupancy': {
            post: {
                summary: 'Update Real-Time Facility Bed/ICU Load',
                tags: ['Facilities & Referral Routing'],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    facility_id: { type: 'string', example: 'fac-dgh-01' },
                                    total_beds: { type: 'number', example: 120 },
                                    occupied_beds: { type: 'number', example: 95 },
                                    icu_total: { type: 'number', example: 15 },
                                    icu_occupied: { type: 'number', example: 12 }
                                },
                                required: ['facility_id']
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'Facility occupancy updated and cached' }
                }
            }
        },
        '/api/referrals': {
            get: {
                summary: 'Get Referrals List with Canonical Tracking State',
                tags: ['21-State Closed-Loop Referral Engine'],
                responses: {
                    200: { description: 'Returns list of referral records with current tracking state' }
                }
            },
            post: {
                summary: 'Create a Closed-Loop Referral',
                tags: ['21-State Closed-Loop Referral Engine'],
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
                                    urgency_tier: { $ref: '#/components/schemas/UrgencyTierEnum' },
                                    clinical_notes: { type: 'string', example: 'Suspected severe pre-eclampsia requiring specialist review' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    201: { description: 'Referral created and state machine initialized (TRIAGED or URGENT_ESCALATION)' }
                }
            }
        },
        '/api/referrals/{id}/status': {
            patch: {
                summary: 'Transition Referral State in 21-State Machine',
                tags: ['21-State Closed-Loop Referral Engine'],
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
                                    new_status: { $ref: '#/components/schemas/ReferralStateEnum' },
                                    remarks: { type: 'string', example: 'Patient checked in at hospital front desk' }
                                },
                                required: ['new_status']
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'State transitioned and SHA-256 audit ledger block chained' }
                }
            }
        },
        '/api/referrals/{id}/assign-doctor': {
            post: {
                summary: 'Assign Internal Facility Doctor to Referral',
                tags: ['21-State Closed-Loop Referral Engine'],
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
                                    doctor_id: { type: 'string', example: 'doc-401' },
                                    doctor_name: { type: 'string', example: 'Dr. Ramesh Kulkarni' }
                                },
                                required: ['doctor_id']
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'Doctor assigned, status moved to DOCTOR_ASSIGNED' }
                }
            }
        },
        '/api/doctor/patients': {
            get: {
                summary: 'List Assigned Doctor Patients & Queue',
                tags: ['Doctor Portal & Clinical Care'],
                responses: {
                    200: { description: 'Queue of assigned patients awaiting consultation or follow-up' }
                }
            }
        },
        '/api/doctor/prescribe': {
            post: {
                summary: 'Issue Digitally Signed Prescription with Guardian AI Safety Check',
                tags: ['Doctor Portal & Clinical Care'],
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
                    200: { description: 'Prescription recorded and Guardian AI interaction analysis performed' }
                }
            }
        },
        '/api/asha/patients': {
            get: {
                summary: 'Get ASHA Catchment Patient Directory',
                tags: ['ASHA Rural Operations & Sync'],
                responses: {
                    200: { description: 'List of rural household members under ASHA tracking' }
                }
            }
        },
        '/api/asha/sync': {
            post: {
                summary: 'Offline ASHA Queue Bi-Directional Batch Sync',
                tags: ['ASHA Rural Operations & Sync'],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    actions: {
                                        type: 'array',
                                        items: { type: 'object' }
                                    },
                                    last_sync_timestamp: { type: 'string', example: '2026-09-07T00:00:00Z' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'Batch actions applied idempotently with conflict resolutions' }
                }
            }
        },
        '/api/caregiver/dependents': {
            get: {
                summary: 'List Authorized Dependents under Caregiver Proxy',
                tags: ['Caregiver & Family Proxy Hub'],
                responses: {
                    200: { description: 'Dependents with scoped permissions and vitals summary' }
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
                    200: { description: 'SOS dispatched to nearest emergency facility and alerts generated' }
                }
            }
        },
        '/api/admin/kpis': {
            get: {
                summary: 'Executive Level KPIs and Referral Closure Metrics',
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
