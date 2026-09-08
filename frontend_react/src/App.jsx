import React, { useContext } from 'react';
import { Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import Navbar from './components/Navbar';
import DoctorNavbar from './components/DoctorNavbar';

// Patient Pages
import Home from './pages/Home';
import CareTeam from './pages/CareTeam';
import ScanQR from './pages/ScanQR';
import Records from './pages/Records';
import MedicalHistory from './pages/MedicalHistory';
import Profile from './pages/Profile';
import ProfileSetup from './pages/ProfileSetup';
import Services from './pages/Services';
import Support from './pages/Support';
import Status from './pages/Status';
import LearnMedicines from './pages/LearnMedicines';
import ConsultationDetails from './pages/ConsultationDetails';
import FamilyHealth from './pages/FamilyHealth';
import FamilyMemberDetails from './pages/FamilyMemberDetails';
import Notifications from './pages/Notifications';

// Swasthya Core Healthcare Features
import ReferralTracker from './pages/ReferralTracker';
import FacilityFinder from './pages/FacilityFinder';
import TriageAssessment from './pages/TriageAssessment';
import AdminDashboard from './pages/AdminDashboard';
import AshaDashboard from './pages/AshaDashboard';
import CaregiverDashboard from './pages/CaregiverDashboard';
import FacilityDashboard from './pages/FacilityDashboard';

// Auth Pages
import RoleSelection from './pages/RoleSelection';
import Login from './pages/Login';
import DoctorLogin from './pages/DoctorLogin';
import Signup from './pages/Signup';
import TermsAndConditions from './pages/TermsAndConditions';

// Doctor Pages
import DoctorDashboard from './pages/DoctorDashboard';
import DoctorPatients from './pages/DoctorPatients';
import PatientHistory from './pages/PatientHistory';
import PrescribeMedicine from './pages/PrescribeMedicine';
import AddDiagnosis from './pages/AddDiagnosis';
import DoctorAIScribe from './pages/DoctorAIScribe';
import DoctorQR from './pages/DoctorQR';
import AppPermissionsModal from './components/AppPermissionsModal';

const MainApp = () => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    let lastTimeBackPress = 0;
    const timePeriodToExit = 2000;

    const handleBackButton = () => {
      const path = window.location.pathname;
      if (path !== '/home' && path !== '/doctor/dashboard' && path !== '/') {
        navigate('/home');
      } else {
        if (new Date().getTime() - lastTimeBackPress < timePeriodToExit) {
          CapApp.exitApp();
        } else {
          lastTimeBackPress = new Date().getTime();
        }
      }
    };

    const backButtonListener = CapApp.addListener('backButton', handleBackButton);
    return () => {
      backButtonListener.then(listener => listener.remove());
    };
  }, [navigate]);

  React.useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const hideNavRoutes = ['/scan', '/login/patient', '/login/doctor', '/'];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Loading Swasthya...
      </div>
    );
  }

  const getRoleHome = (role) => {
    const r = (role || 'patient').toLowerCase();
    if (r === 'doctor') return '/doctor/dashboard';
    if (r === 'health_worker' || r === 'asha' || r === 'anm' || r === 'caregiver') return '/asha';
    if (r === 'facility_staff' || r === 'facility_coordinator' || r === 'facility') return '/facility-dashboard';
    if (r === 'admin') return '/admin';
    return '/home';
  };

  const publicRoutes = [
    '/', '/home', '/login', '/login/patient', '/login/doctor', '/signup', 
    '/admin', '/referrals', '/facilities', '/triage',
    '/asha', '/caregiver', '/facility-dashboard', '/roles',
    '/services', '/records', '/medical-history', '/history', '/status', '/care-team', '/family', '/learn-medicine', '/learn-medicines',
    '/terms', '/consent'
  ];
  if (!user && !publicRoutes.includes(location.pathname)) {
    console.log("Redirecting to / from", location.pathname);
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <div style={{ paddingBottom: hideNavRoutes.includes(location.pathname) ? '0' : '80px' }}>
        <Routes>
          {/* Landing / Auth Routes with Role-Specific Default Redirects */}
          <Route path="/" element={!user ? <Login /> : <Navigate to={getRoleHome(user.role)} replace />} />
          <Route path="/home" element={
            user && (user.role?.toLowerCase() === 'health_worker' || user.role?.toLowerCase() === 'asha' || user.role?.toLowerCase() === 'anm' || user.role?.toLowerCase() === 'caregiver')
              ? <Navigate to="/asha" replace />
              : (user && user.role?.toLowerCase() === 'doctor'
                  ? <Navigate to="/doctor/dashboard" replace />
                  : (user && (user.role?.toLowerCase() === 'facility_staff' || user.role?.toLowerCase() === 'facility_coordinator' || user.role?.toLowerCase() === 'facility')
                      ? <Navigate to="/facility-dashboard" replace />
                      : (user && user.role?.toLowerCase() === 'admin'
                          ? <Navigate to="/admin" replace />
                          : <Home />)))
          } />
          <Route path="/roles" element={<RoleSelection />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={!user ? <Login /> : <Navigate to={getRoleHome(user.role)} replace />} />
          <Route path="/login/patient" element={!user ? <Login /> : <Navigate to="/home" replace />} />
          <Route path="/login/doctor" element={!user ? <DoctorLogin /> : <Navigate to="/doctor/dashboard" replace />} />
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/consent" element={<TermsAndConditions />} />

          {/* Dedicated Healthcare Dashboards */}
          <Route path="/asha" element={<AshaDashboard />} />
          <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
          <Route path="/facility-dashboard" element={<FacilityDashboard />} />
          <Route path="/caregiver" element={<Navigate to="/asha" replace />} />
          <Route path="/admin" element={<AdminDashboard />} />

          {/* Shared Healthcare & Swasthya Core Modules */}
          <Route path="/referrals" element={<ReferralTracker />} />
          <Route path="/facilities" element={<FacilityFinder />} />
          <Route path="/triage" element={<TriageAssessment />} />
          <Route path="/services" element={<Services />} />
          <Route path="/records" element={<Records />} />
          <Route path="/medical-history" element={<MedicalHistory />} />
          <Route path="/history" element={<MedicalHistory />} />
          <Route path="/status" element={<Status />} />
          <Route path="/care-team" element={<CareTeam />} />
          <Route path="/family" element={<FamilyHealth />} />
          <Route path="/family/:memberId" element={<FamilyMemberDetails />} />
          <Route path="/learn-medicine" element={<Records defaultTab="medicines" />} />
          <Route path="/learn-medicines" element={<Records defaultTab="medicines" />} />
          <Route path="/support" element={<Support />} />
          <Route path="/profile-setup" element={<ProfileSetup />} />
          <Route path="/scan" element={<ScanQR />} />
          <Route path="/consultation/:date/:doctorId" element={<ConsultationDetails />} />
          <Route path="/notifications" element={<Notifications />} />

          {/* Profile Route */}
          <Route path="/profile" element={<Profile />} />

          {/* Doctor Sub-Routes */}
          <Route path="/doctor/patients" element={<DoctorPatients />} />
          <Route path="/doctor/patient/:patient_id" element={<PatientHistory />} />
          <Route path="/doctor/prescribe" element={<PrescribeMedicine />} />
          <Route path="/doctor/diagnosis" element={<AddDiagnosis />} />
          <Route path="/doctor/scribe" element={<DoctorAIScribe />} />
          <Route path="/doctor/qr" element={<DoctorQR />} />

          {/* Catch all */}
          <Route path="*" element={<Navigate to={user ? getRoleHome(user.role) : '/login'} replace />} />
        </Routes>
      </div>

      {/* Show Role-Aware Navbar on all main pages */}
      {!hideNavRoutes.includes(location.pathname) && (
        <Navbar />
      )}

      {/* Immediate App Launch Permission Request (Location & Camera) */}
      <AppPermissionsModal />
    </>
  );
};

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
