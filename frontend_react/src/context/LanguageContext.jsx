import React, { createContext, useContext, useState, useEffect } from 'react';

export const LanguageContext = createContext();

export const SUPPORTED_LANGUAGES = [
    { code: 'hi', name: 'हिंदी', englishName: 'Hindi', flag: '🇮🇳', nativeGreeting: 'नमस्ते' },
    { code: 'en', name: 'English', englishName: 'English', flag: '🇬🇧', nativeGreeting: 'Hello' },
    { code: 'mr', name: 'मराठी', englishName: 'Marathi', flag: '🇮🇳', nativeGreeting: 'नमस्कार' }
];

export const translations = {
    en: {
        // App Core & Branding
        appName: 'SwasthyaSetu',
        appTagline: 'Closed-Loop Rural Healthcare Bridge',
        abdmStandard: 'Secured by Supabase PostgreSQL • ABDM FHIR Standards • Multi-Device Sync',
        
        // Navigation & Bottom Bar
        navHome: 'Home',
        navStatus: 'Status',
        navRecords: 'Records',
        navReferrals: 'Referrals',
        navProfile: 'Profile',
        navAshaHub: 'ASHA Hub',
        navFieldVitals: 'Field Vitals',
        navDependents: 'Dependents',
        navDashboard: 'Dashboard',
        navPatients: 'Patients',
        navAIScribe: 'AI Scribe',
        navBedGrid: 'Bed Grid',
        navDirectory: 'Directory',
        navDocRoster: 'Doc Roster',
        navCommandHub: 'Command Hub',
        navBedsLive: 'Beds Live',
        navMedHistory: 'Med History',
        navSupport: 'Support',
        navNotifications: 'Notifications',

        // Actions & Buttons
        signIn: 'Sign In',
        signOut: 'Log Out',
        register: 'New User Register',
        save: 'Save Changes',
        saving: 'Saving...',
        saved: 'Saved Successfully!',
        edit: 'Edit Profile',
        cancel: 'Cancel',
        delete: 'Delete Account',
        confirm: 'Confirm',
        close: 'Close',
        back: 'Back',
        submit: 'Submit',
        upload: 'Upload Document',
        scanQR: 'Scan QR Code',
        viewDetails: 'View Details',
        trackReferral: 'Track Referral',
        bookAppointment: 'Book Appointment',
        sosEmergency: '108 SOS',
        callAmbulance: 'Call 108 Ambulance',
        syncNow: 'Sync Offline Records',
        filter: 'Filter',
        search: 'Search...',
        exploreAllRoles: 'Explore All 6 Personas Grid',
        feedback: 'Feedback',
        refresh: 'Refresh',
        download: 'Download',
        share: 'Share with Doctor',

        // Personas
        rolePatient: 'Citizen / Patient',
        roleAsha: 'ASHA / ANM / Caregiver',
        roleDoctor: 'Doctor (OPD / Specialist)',
        roleFacility: 'Hospital Facility Staff',
        roleAdmin: 'State Health Admin',
        roleCaregiver: 'Caregiver / Family Proxy',
        chooseRole: 'Choose Persona Role:',

        // Profile Page
        profileTitle: 'My Health Profile',
        profileSubtitle: 'ABDM Ayushman Bharat Digital Mission & Unified Health ID',
        tabOverview: 'Overview',
        tabMedical: 'Medical & Vitals',
        tabRoleCredentials: 'Role Credentials',
        tabSettings: 'Settings & Security',
        tabLanguage: 'Language / भाषा',
        
        // Language Switcher Section
        languageSectionTitle: 'Language Preferences (भाषा चुनें)',
        languageSectionDesc: 'Select your preferred language for the entire Swasthya app interface.',
        currentLanguage: 'Current Language',
        selectLanguagePrompt: 'Choose app language:',
        langSwitchedSuccess: 'Language switched to',

        // Personal Information
        personalInfo: 'Personal Information',
        fullName: 'Full Name',
        emailAddress: 'Email Address',
        phoneNumber: 'Phone Number',
        gender: 'Gender',
        genderSelect: 'Select Gender',
        male: 'Male',
        female: 'Female',
        other: 'Other',
        dob: 'Date of Birth',
        bloodGroup: 'Blood Group',
        height: 'Height (cm)',
        weight: 'Weight (kg)',
        city: 'City / Taluka',
        state: 'State',
        pincode: 'PIN Code',
        fullAddress: 'Full Residential Address',
        occupation: 'Occupation',
        maritalStatus: 'Marital Status',

        // ABDM & IDs
        abhaId: 'ABHA Number (Health ID)',
        abhaAddress: 'ABHA Address',
        aadhaarLast4: 'Aadhaar (Last 4 Digits)',
        emergencyContact: 'Emergency Contact Phone',
        emergencyName: 'Emergency Contact Person',
        emergencyRelation: 'Relationship',

        // Medical Details
        allergies: 'Allergies & Drug Reactions',
        noAllergies: 'No known drug allergies reported',
        chronicConditions: 'Chronic Medical Conditions',
        noChronic: 'No chronic diseases recorded',
        currentMeds: 'Ongoing Daily Medications',
        noMeds: 'No regular medications reported',
        addAllergy: 'Add Allergy',
        addCondition: 'Add Condition',
        addMedication: 'Add Medication',
        lifestyleTitle: 'Lifestyle & Daily Habits',
        dietPreference: 'Diet Preference',
        physicalActivity: 'Physical Activity',
        smokingDrinking: 'Smoking / Alcohol Consumption',

        // Home Page
        homeGreeting: 'Namaste',
        homeWelcomeBack: 'Welcome back to your healthcare hub',
        abhaHealthCard: 'ABHA Digital Health Card',
        abhaActive: 'Active & Verified',
        qrCodeScanToAccess: 'Scan QR at any PHC / Hospital for instant OPD check-in',
        vitalSummary: 'Live Health Telemetry',
        heartRate: 'Heart Rate',
        bloodPressure: 'Blood Pressure',
        spO2: 'Oxygen (SpO2)',
        bloodSugar: 'Blood Sugar',
        temperature: 'Temperature',
        respiratoryRate: 'Respiratory Rate',
        recentReferrals: 'Active Closed-Loop Referrals',
        noActiveReferrals: 'No active referrals at the moment.',
        nearbyFacilities: 'Nearby Health Facilities & Live Beds',
        phcShirwal: 'PHC Shirwal Primary Health Centre',
        civilHospital: 'District Civil Hospital Nashik',
        open24x7: 'Open 24x7 • Emergency Ready',
        bedAvailable: 'Beds Available',

        // Quick Actions
        quickTriage: 'Instant AI Triage',
        quickTriageDesc: 'Check symptoms with safe clinical guidance',
        quickReferral: 'Referral Pipeline',
        quickReferralDesc: 'Track hospital transfers in real time',
        quickFacilities: 'Find Nearest Facility',
        quickFacilitiesDesc: 'Locate PHCs, CHCs, & Hospitals with ICU',
        quickConsult: 'Doctor Consultation',
        quickConsultDesc: 'Connect with specialist doctors',
        quickRecords: 'Medical Records',
        quickRecordsDesc: 'EHR records, prescriptions & lab reports',
        quickFamily: 'Family & Dependents',
        quickFamilyDesc: 'Manage health records of elders & children',

        // Triage Assessment
        triageTitle: 'Clinical Triage & Symptom Assessment',
        triageSubtitle: 'Safe, protocol-driven guidance for rural and remote care',
        symptomsQuestion: 'What symptoms is the patient experiencing?',
        symptomsPlaceholder: 'e.g. high fever for 3 days, acute chest pain, shortness of breath...',
        assessButton: 'Run Clinical Triage Assessment',
        triageResult: 'Triage Recommendation',
        riskLevel: 'Clinical Priority Level',
        riskEmergency: 'EMERGENCY / RED FLAG - Immediate Hospital Transfer Required',
        riskUrgent: 'URGENT - Transfer to District Hospital / CHC within 24h',
        riskRoutine: 'ROUTINE - Manage at Primary Health Centre (PHC)',
        vitalSensors: 'Sensor & Field Vitals Input',
        dangerTags: 'Quick Danger Signs & Red Flags',
        normalPreset: 'Normal Baseline',
        hypertensionPreset: 'Hypertension / Alert',
        criticalPreset: 'Critical / Sepsis',

        // Referral Tracker
        referralTrackerTitle: 'Closed-Loop Referral Tracking System',
        referralTrackerSubtitle: 'Complete visibility from village PHC to Tertiary Hospital admission',
        newReferralBtn: '+ Create New Referral',
        referralId: 'Referral Token',
        patientName: 'Patient Name',
        fromFacility: 'Origin Facility',
        toFacility: 'Destination Facility',
        statusStep1: 'Initiated & Assigned',
        statusStep2: 'Patient En Route',
        statusStep3: 'Triage Cleared at Destination',
        statusStep4: 'Bed Reserved & Admitted',
        statusStep5: 'Treatment Completed & Discharged',
        stepTriaged: 'Triage Completed',
        stepFacilityLinked: 'Facility Linked',
        stepSlotBooked: 'Slot Booked',
        stepInTransit: 'Patient In Transit',
        stepArrivalConfirmed: 'Arrival Confirmed',
        stepDoctorAssigned: 'Doctor Assigned',
        stepCareCompleted: 'Care Completed',
        stepLoopClosed: 'Loop Closed & Verified',

        // ASHA Dashboard
        ashaDashboardTitle: 'ASHA / ANM Village Health Dashboard',
        ashaSubtitle: 'Shirwal & Anand Nagar Sector 3 Catchment',
        highRiskMothers: 'High-Risk Mothers',
        dueVaccines: 'Child Immunization Due',
        activeReferralsASHA: 'Active Community Referrals',
        fieldVitalsLogged: 'Vitals Logged Today',
        offlineQueue: 'Offline Records in Device Queue',

        // Doctor Dashboard
        doctorDashboardTitle: 'Doctor Clinical Workspace',
        doctorSubtitle: 'OPD Queue, EHR History & Clinical Scribe',
        opdQueue: "Today's OPD Queue",
        scribeTitle: 'AI Clinical Scribe & Prescription Generator',
        scribeDesc: 'Speak or type symptoms to generate structured prescriptions & diagnosis notes',
        prescribeMedicine: 'Prescribe Medicine',
        addDiagnosis: 'Add Diagnosis Note',
        patientHistory: 'Patient EHR History',

        // Records & Lab OCR
        recordsTitle: 'Digital Health Records & Lab OCR',
        recordsSubtitle: 'ABDM linked prescriptions, blood tests and diagnostic reports',
        tabOcr: 'Lab Report OCR & Diagnostics',
        tabMedicines: 'Medicine Visual Explainer & Dosage',
        tabHistory: 'Saved Health Documents',
        uploadReportPrompt: 'Upload or snap photo of blood test, prescription, or scan',
        analyzeReportBtn: 'Analyze Report with MedGemma AI',
        analyzingReport: 'Processing medical OCR and clinical metrics...',
        summaryTitle: 'Clinical Summary & Key Findings',

        // Facility Dashboard & Beds Live
        facilityDashboardTitle: 'Hospital Facility Bed & Resource Grid',
        facilitySubtitle: 'Real-time telemetry of ICU, Oxygen, and General bed availability',
        generalBeds: 'General Beds',
        icuBeds: 'ICU Beds',
        oxygenBeds: 'Oxygen Beds',
        maternityBeds: 'Maternity Beds',
        bedOccupancy: 'Bed Occupancy',
        available: 'Available',
        total: 'Total',

        // Family Health
        familyTitle: 'Family Health & Proxy Management',
        familySubtitle: 'Manage dependents, elderly parents and children health profiles',
        addFamilyMember: '+ Add Family Member',
        relationship: 'Relationship',

        // Offline & Sync
        offlineMode: 'Offline Mode Active',
        offlineDesc: 'All inputs will save locally and sync automatically when internet is restored.',
        onlineSynced: 'All data synchronized with central ABDM database.',
        
        // Theme & Help
        themeLight: 'Light Mode',
        themeDark: 'Dark Mode',
        switchTheme: 'Toggle App Theme',
        helpBotTitle: 'Swasthya Healthcare Assistant',
        helpBotDesc: 'Ask health questions, medicine dosage or referral guidance in your language'
    },
    hi: {
        // App Core & Branding
        appName: 'स्वास्थ्य सेतु (SwasthyaSetu)',
        appTagline: 'ग्रामीण एवं सुदूर क्षेत्रों के लिए एकीकृत स्वास्थ्य नेटवर्क',
        abdmStandard: 'सुरक्षित आयुष्मान भारत डिजिटल मिशन (ABDM) • FHIR मानक • बहु-उपकरण सिंक',

        // Navigation & Bottom Bar
        navHome: 'होम',
        navStatus: 'स्थिति',
        navRecords: 'दस्तावेज़',
        navReferrals: 'रेफरल ट्रैकर',
        navProfile: 'मेरी प्रोफाइल',
        navAshaHub: 'आशा केंद्र',
        navFieldVitals: 'फील्ड जांच',
        navDependents: 'परिवार सदस्य',
        navDashboard: 'डैशबोर्ड',
        navPatients: 'मरीज़ सूची',
        navAIScribe: 'एआई स्क्राइब',
        navBedGrid: 'बेड उपलब्धता',
        navDirectory: 'अस्पताल सूची',
        navDocRoster: 'डॉक्टर रोस्टर',
        navCommandHub: 'कमांड हब',
        navBedsLive: 'लाइव बेड्स',
        navMedHistory: 'मेडिकल हिस्ट्री',
        navSupport: 'सहायता',
        navNotifications: 'सूचनाएं',

        // Actions & Buttons
        signIn: 'लॉग इन करें',
        signOut: 'लॉग आउट करें',
        register: 'नया खाता बनाएं',
        save: 'बदलाव सहेजें',
        saving: 'सहेजा जा रहा है...',
        saved: 'सफलतापूर्वक सहेजा गया!',
        edit: 'प्रोफाइल संपादित करें',
        cancel: 'रद्द करें',
        delete: 'खाता हटाएं',
        confirm: 'पुष्टि करें',
        close: 'बंद करें',
        back: 'पीछे जाएं',
        submit: 'जमा करें',
        upload: 'दस्तावेज़ अपलोड करें',
        scanQR: 'क्यूआर कोड स्कैन करें',
        viewDetails: 'विवरण देखें',
        trackReferral: 'रेफरल ट्रैक करें',
        bookAppointment: 'अपॉइंटमेंट बुक करें',
        sosEmergency: '108 आपातकालीन एसओएस',
        callAmbulance: '108 एम्बुलेंस को कॉल करें',
        syncNow: 'ऑफ़लाइन डेटा सिंक करें',
        filter: 'फ़िल्टर करें',
        search: 'खोजें...',
        exploreAllRoles: 'सभी 6 भूमिकाओं (Roles) का ग्रिड देखें',
        feedback: 'प्रतिक्रिया दें',
        refresh: 'ताज़ा करें',
        download: 'डाउनलोड करें',
        share: 'डॉक्टर के साथ साझा करें',

        // Personas
        rolePatient: 'नागरिक / मरीज़ (Patient)',
        roleAsha: 'आशा / एएनएम / देखभालकर्ता (ASHA / ANM)',
        roleDoctor: 'चिकित्सक / डॉक्टर (Doctor OPD)',
        roleFacility: 'अस्पताल एवं केंद्र स्टाफ (Hospital Facility)',
        roleAdmin: 'राज्य स्वास्थ्य प्रशासक (Health Admin)',
        roleCaregiver: 'पारिवारिक देखभालकर्ता (Caregiver Proxy)',
        chooseRole: 'अपनी भूमिका चुनें:',

        // Profile Page
        profileTitle: 'मेरा स्वास्थ्य प्रोफ़ाइल',
        profileSubtitle: 'आयुष्मान भारत डिजिटल मिशन (ABDM) एवं आभा (ABHA) हेल्थ आईडी',
        tabOverview: 'सामान्य विवरण',
        tabMedical: 'चिकित्सा एवं जांच',
        tabRoleCredentials: 'पद एवं प्रमाण',
        tabSettings: 'सेटिंग्स व सुरक्षा',
        tabLanguage: 'भाषा (Language)',

        // Language Switcher Section
        languageSectionTitle: 'भाषा प्राथमिकता (Language Settings)',
        languageSectionDesc: 'संपूर्ण स्वास्थ्य सेतु ऐप के लिए अपनी पसंदीदा भाषा चुनें।',
        currentLanguage: 'वर्तमान भाषा',
        selectLanguagePrompt: 'ऐप की भाषा चुनें:',
        langSwitchedSuccess: 'भाषा बदलकर की गई:',

        // Personal Information
        personalInfo: 'व्यक्तिगत जानकारी',
        fullName: 'पूरा नाम',
        emailAddress: 'ईमेल पता',
        phoneNumber: 'मोबाइल नंबर',
        gender: 'लिंग',
        genderSelect: 'लिंग चुनें',
        male: 'पुरुष (Male)',
        female: 'महिला (Female)',
        other: 'अन्य (Other)',
        dob: 'जन्म तिथि',
        bloodGroup: 'रक्त समूह (Blood Group)',
        height: 'ऊंचाई (सेमी)',
        weight: 'वजन (किग्रा)',
        city: 'शहर / तालुका',
        state: 'राज्य',
        pincode: 'पिन कोड',
        fullAddress: 'स्थाई आवासीय पता',
        occupation: 'व्यवसाय',
        maritalStatus: 'वैवाहिक स्थिति',

        // ABDM & IDs
        abhaId: 'आभा संख्या (ABHA Health ID)',
        abhaAddress: 'आभा पता (ABHA Address)',
        aadhaarLast4: 'आधार (अंतिम 4 अंक)',
        emergencyContact: 'आपातकालीन संपर्क फोन',
        emergencyName: 'आपातकालीन संपर्क व्यक्ति',
        emergencyRelation: 'संबंध (Relationship)',

        // Medical Details
        allergies: 'एलर्जी व दवा से प्रतिकूल प्रभाव',
        noAllergies: 'कोई ज्ञात एलर्जी दर्ज नहीं है',
        chronicConditions: 'पुरानी बीमारियां (Chronic Conditions)',
        noChronic: 'कोई पुरानी बीमारी दर्ज नहीं है',
        currentMeds: 'नियमित चलने वाली दवाएं',
        noMeds: 'कोई नियमित दवा दर्ज नहीं है',
        addAllergy: 'एलर्जी जोड़ें',
        addCondition: 'बीमारी जोड़ें',
        addMedication: 'दवा जोड़ें',
        lifestyleTitle: 'जीवनशैली एवं दैनिक आदतें',
        dietPreference: 'खान-पान प्राथमिकता',
        physicalActivity: 'शारीरिक सक्रियता',
        smokingDrinking: 'धूम्रपान / मद्यपान आदतें',

        // Home Page
        homeGreeting: 'नमस्ते',
        homeWelcomeBack: 'स्वास्थ्य सेतु पोर्टल पर आपका स्वागत है',
        abhaHealthCard: 'आभा डिजिटल हेल्थ कार्ड',
        abhaActive: 'सक्रिय एवं सत्यापित',
        qrCodeScanToAccess: 'किसी भी पीएचसी/अस्पताल में तुरंत ओपीडी पर्ची के लिए क्यूआर स्कैन करें',
        vitalSummary: 'लाइव स्वास्थ्य पैरामीटर्स',
        heartRate: 'हृदय गति (Heart Rate)',
        bloodPressure: 'रक्तचाप (Blood Pressure)',
        spO2: 'ऑक्सीजन स्तर (SpO2)',
        bloodSugar: 'ब्लड शुगर (Sugar)',
        temperature: 'शरीर का तापमान',
        respiratoryRate: 'श्वसन दर (Breathing Rate)',
        recentReferrals: 'सक्रिय क्लोज्ड-लूप रेफरल',
        noActiveReferrals: 'वर्तमान में कोई सक्रिय रेफरल नहीं है।',
        nearbyFacilities: 'निकटतम स्वास्थ्य केंद्र एवं लाइव बेड्स',
        phcShirwal: 'प्राथमिक स्वास्थ्य केंद्र (PHC) शिरवल',
        civilHospital: 'जिला सिविल अस्पताल नासिक',
        open24x7: '24x7 खुला • आपातकालीन सेवा उपलब्ध',
        bedAvailable: 'बेड उपलब्ध',

        // Quick Actions
        quickTriage: 'त्वरित एआई जांच (Triage)',
        quickTriageDesc: 'लक्षणों की जांच कर सुरक्षित चिकित्सकीय मार्गदर्शन पाएं',
        quickReferral: 'रेफरल ट्रैकर',
        quickReferralDesc: 'अस्पताल ट्रांसफर को रियल-टाइम में ट्रैक करें',
        quickFacilities: 'निकटतम अस्पताल खोजें',
        quickFacilitiesDesc: 'पीएचसी, सीएचसी और आईसीयू युक्त अस्पताल खोजें',
        quickConsult: 'डॉक्टर से परामर्श',
        quickConsultDesc: 'विशेषज्ञ डॉक्टरों से ऑनलाइन परामर्श लें',
        quickRecords: 'स्वास्थ्य रिकॉर्ड्स',
        quickRecordsDesc: 'पर्चे, लैब टेस्ट रिपोर्ट और डिस्चार्ज समरी',
        quickFamily: 'परिवार व आश्रित',
        quickFamilyDesc: 'बुजुर्गों और बच्चों के स्वास्थ्य रिकॉर्ड प्रबंधित करें',

        // Triage Assessment
        triageTitle: 'क्लिनिकल ट्राइएज एवं लक्षण जांच',
        triageSubtitle: 'ग्रामीण एवं दूरदराज के क्षेत्रों के लिए सुरक्षित मार्गदर्शन',
        symptomsQuestion: 'मरीज़ को क्या लक्षण महसूस हो रहे हैं?',
        symptomsPlaceholder: 'उदा. 3 दिनों से तेज़ बुखार, छाती में तेज़ दर्द, सांस लेने में तकलीफ...',
        assessButton: 'क्लिनिकल जांच शुरू करें',
        triageResult: 'जांच परिणाम एवं सिफारिश',
        riskLevel: 'प्राथमिकता स्तर (Risk Level)',
        riskEmergency: 'आपातकालीन / रेड फ्लैग - तत्काल बड़े अस्पताल रेफर करें',
        riskUrgent: 'अति आवश्यक - 24 घंटे के भीतर जिला अस्पताल/सीएचसी ले जाएं',
        riskRoutine: 'सामान्य - प्राथमिक स्वास्थ्य केंद्र (PHC) पर उपचार संभव',
        vitalSensors: 'सेंसर एवं फील्ड वाइटल्स दर्ज करें',
        dangerTags: 'गंभीर खतरे के मुख्य लक्षण (Red Flags)',
        normalPreset: 'सामान्य बेसलाइन (Normal)',
        hypertensionPreset: 'उच्च रक्तचाप / सतर्कता (Alert)',
        criticalPreset: 'गंभीर / सेप्सिस (Critical)',

        // Referral Tracker
        referralTrackerTitle: 'क्लोज्ड-लूप रेफरल ट्रैकिंग सिस्टम',
        referralTrackerSubtitle: 'गाँव के पीएचसी से लेकर जिला अस्पताल में भर्ती तक पूरी ट्रैकिंग',
        newReferralBtn: '+ नया रेफरल दर्ज करें',
        referralId: 'रेफरल टोकन संख्या',
        patientName: 'मरीज़ का नाम',
        fromFacility: 'मूल स्वास्थ्य केंद्र',
        toFacility: 'गंतव्य अस्पताल',
        statusStep1: 'रेफरल दर्ज व आवंटित',
        statusStep2: 'मरीज़ रास्ते में (En Route)',
        statusStep3: 'गंतव्य अस्पताल में ट्राइएज पास',
        statusStep4: 'बेड आरक्षित एवं मरीज़ भर्ती',
        statusStep5: 'उपचार पूर्ण व डिस्चार्ज',
        stepTriaged: 'ट्राइएज पूर्ण',
        stepFacilityLinked: 'अस्पताल लिंक हुआ',
        stepSlotBooked: 'अपॉइंटमेंट स्लॉट बुक',
        stepInTransit: 'मरीज़ रास्ते में है',
        stepArrivalConfirmed: 'अस्पताल आगमन की पुष्टि',
        stepDoctorAssigned: 'डॉक्टर आवंटित',
        stepCareCompleted: 'उपचार पूर्ण',
        stepLoopClosed: 'रेफरल लूप बंद व सत्यापित',

        // ASHA Dashboard
        ashaDashboardTitle: 'आशा / एएनएम ग्रामीण स्वास्थ्य डैशबोर्ड',
        ashaSubtitle: 'शिरवल एवं आनंद नगर सेक्टर 3 कार्यक्षेत्र',
        highRiskMothers: 'उच्च जोखिम वाली गर्भवती महिलाएं',
        dueVaccines: 'लंबित बाल टीकाकरण',
        activeReferralsASHA: 'सक्रिय ग्रामीण रेफरल',
        fieldVitalsLogged: 'आज दर्ज की गई स्वास्थ्य जांचें',
        offlineQueue: 'डिवाइस में ऑफ़लाइन सहेजे गए रिकॉर्ड',

        // Doctor Dashboard
        doctorDashboardTitle: 'डॉक्टर क्लिनिकल कार्यक्षेत्र',
        doctorSubtitle: 'ओपीडी कतार, ईएचआर रिकॉर्ड्स एवं एआई स्क्राइब',
        opdQueue: 'आज की ओपीडी मरीज़ कतार',
        scribeTitle: 'एआई क्लिनिकल स्क्राइब व डिजिटल पर्चा',
        scribeDesc: 'लक्षण बोलें या लिखें - एआई अपने आप व्यवस्थित पर्चा और डायग्नोसिस तैयार करेगा',
        prescribeMedicine: 'दवा का पर्चा लिखें',
        addDiagnosis: 'डायग्नोसिस नोट जोड़ें',
        patientHistory: 'मरीज़ का मेडिकल इतिहास',

        // Records & Lab OCR
        recordsTitle: 'डिजिटल स्वास्थ्य रिकॉर्ड्स एवं लैब ओसीआर',
        recordsSubtitle: 'एआई द्वारा रक्त परीक्षण, पर्चे और रिपोर्ट की त्वरित व्याख्या',
        tabOcr: 'लैब रिपोर्ट ओसीआर व विश्लेषण',
        tabMedicines: 'दवा दृश्य व्याख्या व खुराक निर्देश',
        tabHistory: 'सहेजे गए मेडिकल दस्तावेज़',
        uploadReportPrompt: 'ब्लड टेस्ट रिपोर्ट, पर्चे या एक्स-रे की फोटो अपलोड करें',
        analyzeReportBtn: 'MedGemma AI से रिपोर्ट का विश्लेषण करें',
        analyzingReport: 'मेडिकल रिपोर्ट का विश्लेषण किया जा रहा है...',
        summaryTitle: 'क्लिनिकल सारांश एवं महत्वपूर्ण निष्कर्ष',

        // Facility Dashboard & Beds Live
        facilityDashboardTitle: 'अस्पताल बेड एवं संसाधन स्थिति',
        facilitySubtitle: 'आईसीयू, ऑक्सीजन और सामान्य बेड्स की लाइव स्थिति',
        generalBeds: 'सामान्य बेड्स',
        icuBeds: 'आईसीयू बेड्स',
        oxygenBeds: 'ऑक्सीजन बेड्स',
        maternityBeds: 'मातृत्व बेड्स',
        bedOccupancy: 'बेड उपयोग दर',
        available: 'उपलब्ध',
        total: 'कुल संख्या',

        // Family Health
        familyTitle: 'पारिवारिक स्वास्थ्य एवं आश्रित प्रबंधन',
        familySubtitle: 'बुजुर्ग माता-पिता और बच्चों के स्वास्थ्य प्रोफाइल प्रबंधित करें',
        addFamilyMember: '+ नया परिवार सदस्य जोड़ें',
        relationship: 'पारिवारिक संबंध',

        // Offline & Sync
        offlineMode: 'ऑफ़लाइन मोड सक्रिय',
        offlineDesc: 'सभी डेटा फोन में सुरक्षित है और इंटरनेट आने पर स्वतः सिंक हो जाएगा।',
        onlineSynced: 'सभी डेटा राष्ट्रीय स्वास्थ्य नेटवर्क (ABDM) से सिंक है।',

        // Theme & Help
        themeLight: 'लाइट थीम',
        themeDark: 'डार्क थीम',
        switchTheme: 'ऐप थीम बदलें',
        helpBotTitle: 'स्वास्थ्य सेतु एआई सहायक',
        helpBotDesc: 'अपनी भाषा में स्वास्थ्य प्रश्न, दवा की खुराक या अस्पताल मार्गदर्शन पूछें'
    },
    mr: {
        // Marathi Translations
        appName: 'स्वास्थ्य सेतू (SwasthyaSetu)',
        appTagline: 'ग्रामीण व दुर्गम भागासाठी एकात्मिक आरोग्य सेतू',
        abdmStandard: 'आयुष्मान भारत डिजिटल मिशन (ABDM) • FHIR मानके • मल्टी-डिव्हाइस सिंक',

        navHome: 'मुख्यपृष्ठ',
        navStatus: 'स्थिती',
        navRecords: 'नोंदी',
        navReferrals: 'रेफरल ट्रॅकर',
        navProfile: 'माझे प्रोफाइल',
        navAshaHub: 'आशा केंद्र',
        navFieldVitals: 'आरोग्य तपासणी',
        navDependents: 'कुटुंब सदस्य',
        navDashboard: 'डॅशबोर्ड',
        navPatients: 'रुग्ण यादी',
        navAIScribe: 'एआय स्क्राइब',
        navBedGrid: 'बेड उपलब्धता',
        navDirectory: 'रुग्णालय सूची',
        navDocRoster: 'डॉक्टर रोस्टर',
        navCommandHub: 'कमांड हब',
        navBedsLive: 'लाइव्ह बेड्स',
        navMedHistory: 'वैद्यकीय इतिहास',
        navSupport: 'मदत',
        navNotifications: 'सूचना',

        signIn: 'लॉग इन करा',
        signOut: 'लॉग आउट करा',
        register: 'नवीन खाते तयार करा',
        save: 'बदल जतन करा',
        saving: 'जतन करत आहे...',
        saved: 'यशस्वीरीत्या जतन केले!',
        edit: 'प्रोफाइल संपादित करा',
        cancel: 'रद्द करा',
        delete: 'खाते हटवा',
        confirm: 'पुष्टी करा',
        close: 'बंद करा',
        back: 'मागे जा',
        submit: 'सबमिट करा',
        upload: 'कागदपत्र अपलोड करा',
        scanQR: 'क्यूआर कोड स्कॅन करा',
        viewDetails: 'तपशील पहा',
        trackReferral: 'रेफरल ट्रॅक करा',
        bookAppointment: 'अपॉइंटमेंट बुक करा',
        sosEmergency: '108 आपत्कालीन SOS',
        callAmbulance: '108 रुग्णवाहिकेला कॉल करा',
        syncNow: 'ऑफलाइन डेटा सिंक करा',
        filter: 'फिल्टर करा',
        search: 'शोधा...',
        exploreAllRoles: 'सर्व 6 भूमिका पहा',
        feedback: 'अभिप्राय द्या',
        refresh: 'ताजे करा',
        download: 'डाउनलोड करा',
        share: 'डॉक्टरांशी शेअर करा',

        rolePatient: 'नागरिक / रुग्ण (Patient)',
        roleAsha: 'आशा / एएनएम (ASHA / ANM)',
        roleDoctor: 'डॉक्टर (Doctor OPD)',
        roleFacility: 'रुग्णालय कर्मचारी (Facility Staff)',
        roleAdmin: 'आरोग्य प्रशासक (Health Admin)',
        roleCaregiver: 'कुटुंब काळजीवाहू (Caregiver)',
        chooseRole: 'आपली भूमिका निवडा:',

        profileTitle: 'माझे आरोग्य प्रोफाइल',
        profileSubtitle: 'आयुष्मान भारत डिजिटल मिशन (ABDM) व आभा (ABHA) हेल्थ आयडी',
        tabOverview: 'सामान्य माहिती',
        tabMedical: 'वैद्यकीय माहिती',
        tabRoleCredentials: 'पद व प्रमाणपत्रे',
        tabSettings: 'सेटिंग्ज व सुरक्षा',
        tabLanguage: 'भाषा (Language)',

        languageSectionTitle: 'भाषा प्राधान्य (Language Settings)',
        languageSectionDesc: 'संपूर्ण स्वास्थ्य सेतू ॲपसाठी आपली पसंतीची भाषा निवडा.',
        currentLanguage: 'सध्याची भाषा',
        selectLanguagePrompt: 'ॲपची भाषा निवडा:',
        langSwitchedSuccess: 'भाषा बदलून करण्यात आली:',

        personalInfo: 'वैयक्तिक माहिती',
        fullName: 'पूर्ण नाव',
        emailAddress: 'ईमेल पत्ता',
        phoneNumber: 'मोबाईल क्रमांक',
        gender: 'लिंग',
        genderSelect: 'लिंग निवडा',
        male: 'पुरुष',
        female: 'स्त्री',
        other: 'इतर',
        dob: 'जन्म तारीख',
        bloodGroup: 'रक्तगट (Blood Group)',
        height: 'उंची (सेमी)',
        weight: 'वजन (किलो)',
        city: 'शहर / तालुका',
        state: 'राज्य',
        pincode: 'पिन कोड',
        fullAddress: 'पूर्ण निवासी पत्ता',

        abhaId: 'आभा क्रमांक (ABHA Health ID)',
        abhaAddress: 'आभा पत्ता (ABHA Address)',
        aadhaarLast4: 'आधार (शेवटचे 4 अंक)',
        emergencyContact: 'आपत्कालीन संपर्क क्रमांक',
        emergencyName: 'आपत्कालीन संपर्क व्यक्ती',
        emergencyRelation: 'नाते (Relationship)',

        homeGreeting: 'नमस्कार',
        homeWelcomeBack: 'स्वास्थ्य सेतू पोर्टलवर आपले स्वागत आहे',
        abhaHealthCard: 'आभा डिजिटल हेल्थ कार्ड',
        abhaActive: 'सक्रिय व सत्यापित',
        qrCodeScanToAccess: 'कोणत्याही प्राथमिक आरोग्य केंद्र / रुग्णालयात ओपीडीसाठी क्यूआर स्कॅन करा',
        vitalSummary: 'थेट आरोग्य पॅरामीटर्स',
        heartRate: 'हृदयाचे ठोके (Heart Rate)',
        bloodPressure: 'रक्तदाब (Blood Pressure)',
        spO2: 'ऑक्सिजन पातळी (SpO2)',
        bloodSugar: 'रक्तातील साखर (Sugar)',
        temperature: 'शरीराचे तापमान',
        respiratoryRate: 'श्वसन दर',
        recentReferrals: 'सक्रिय रेफरल',
        noActiveReferrals: 'सध्या कोणतेही सक्रिय रेफरल नाहीत.',
        nearbyFacilities: 'जवळची आरोग्य केंद्रे व थेट बेड्स',
        phcShirwal: 'प्राथमिक आरोग्य केंद्र शिरवळ',
        civilHospital: 'जिल्हा शासकीय रुग्णालय नाशिक',
        open24x7: '24x7 सुरू • आपत्कालीन सेवा उपलब्ध',
        bedAvailable: 'बेड उपलब्ध',

        stepTriaged: 'ट्राइएज पूर्ण',
        stepFacilityLinked: 'रुग्णालय जोडले',
        stepSlotBooked: 'स्लॉट बुक झाले',
        stepInTransit: 'रुग्ण प्रवासात आहे',
        stepArrivalConfirmed: 'आगमनाची पुष्टी',
        stepDoctorAssigned: 'डॉक्टर नियुक्त',
        stepCareCompleted: 'उपचार पूर्ण',
        stepLoopClosed: 'रेफरल लूप बंद',

        themeLight: 'लाइट थीम',
        themeDark: 'डार्क थीम',
        switchTheme: 'ॲप थीम बदला'
    }
};

export const LanguageProvider = ({ children }) => {
    const [language, setLanguageState] = useState(() => {
        try {
            return localStorage.getItem('swasthya_lang') || 'hi'; // Default to Hindi
        } catch {
            return 'hi';
        }
    });

    const setLanguage = (newLang) => {
        if (translations[newLang]) {
            setLanguageState(newLang);
            try {
                localStorage.setItem('swasthya_lang', newLang);
            } catch (err) {
                console.warn('Could not save language to localStorage:', err);
            }
        }
    };

    // Translation function with dynamic parameter interpolation and robust fallbacks
    const t = (key, fallback = '') => {
        if (!key) return fallback;
        const currentDict = translations[language] || translations.hi || translations.en;
        if (currentDict && currentDict[key] !== undefined) {
            return currentDict[key];
        }
        // Fallback to Hindi
        if (translations.hi && translations.hi[key] !== undefined) {
            return translations.hi[key];
        }
        // Fallback to English
        if (translations.en && translations.en[key] !== undefined) {
            return translations.en[key];
        }
        return fallback || key;
    };

    useEffect(() => {
        document.documentElement.setAttribute('lang', language);
    }, [language]);

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t, supportedLanguages: SUPPORTED_LANGUAGES }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        return {
            language: 'hi',
            setLanguage: () => {},
            t: (k, f = '') => f || k,
            supportedLanguages: SUPPORTED_LANGUAGES
        };
    }
    return context;
};
