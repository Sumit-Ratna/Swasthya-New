import React, { useContext } from 'react';
import { Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { App as CapApp } from '@capacitor/app';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Navbar from './components/Navbar';
import DoctorNavbar from './components/DoctorNavbar';

// Patient Pages
import Home from './pages/Home';
import CareTeam from './pages/CareTeam';
import ScanQR from './pages/ScanQR';
import Records from './pages/Records';
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

// Auth Pages
import RoleSelection from './pages/RoleSelection';
import Login from './pages/Login';
import DoctorLogin from './pages/DoctorLogin';
import Signup from './pages/Signup';

// Doctor Pages
import DoctorDashboard from './pages/DoctorDashboard';
import DoctorPatients from './pages/DoctorPatients';
import PatientHistory from './pages/PatientHistory';
import PrescribeMedicine from './pages/PrescribeMedicine';
import AddDiagnosis from './pages/AddDiagnosis';

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

  const publicRoutes = ['/', '/login', '/login/patient', '/login/doctor', '/signup', '/admin', '/referrals', '/facilities', '/triage'];
  if (!user && !publicRoutes.includes(location.pathname)) {
    console.log("Redirecting to / from", location.pathname);
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <div style={{ paddingBottom: hideNavRoutes.includes(location.pathname) ? '0' : '80px' }}>
        <Routes>
          {/* Landing / Auth Routes (Login opens first) */}
          <Route path="/" element={!user ? <Login /> : (user.role === 'doctor' ? <Navigate to="/doctor/dashboard" /> : <Navigate to="/home" />)} />
          <Route path="/roles" element={<RoleSelection />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/home" />} />
          <Route path="/login/patient" element={!user ? <Login /> : <Navigate to="/home" />} />
          <Route path="/login/doctor" element={!user ? <DoctorLogin /> : <Navigate to="/doctor/dashboard" />} />

          {/* Shared Healthcare & Swasthya Routes */}
          <Route path="/referrals" element={<ReferralTracker />} />
          <Route path="/facilities" element={<FacilityFinder />} />
          <Route path="/triage" element={<TriageAssessment />} />
          <Route path="/admin" element={<AdminDashboard />} />

          {/* Patient Routes */}
          {user?.role === 'patient' && (
            <>
              <Route path="/learn-medicine" element={<LearnMedicines />} />
              <Route path="/learn-medicines" element={<LearnMedicines />} />
              <Route path="/profile-setup" element={<ProfileSetup />} />
              <Route path="/status" element={<Status />} />
              <Route path="/records" element={<Records />} />
              <Route path="/services" element={<Services />} />
              <Route path="/support" element={<Support />} />
              <Route path="/home" element={<Home />} />
              <Route path="/care-team" element={<CareTeam />} />
              <Route path="/scan" element={<ScanQR />} />
              <Route path="/consultation/:date/:doctorId" element={<ConsultationDetails />} />
              <Route path="/family" element={<FamilyHealth />} />
              <Route path="/family/:memberId" element={<FamilyMemberDetails />} />
              <Route path="/notifications" element={<Notifications />} />
            </>
          )}

          {/* Shared Profile */}
          {user && (
            <Route path="/profile" element={<Profile />} />
          )}

          {/* Doctor Routes */}
          {user?.role === 'doctor' && (
            <>
              <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
              <Route path="/doctor/patients" element={<DoctorPatients />} />
              <Route path="/doctor/patient/:patient_id" element={<PatientHistory />} />
              <Route path="/doctor/prescribe" element={<PrescribeMedicine />} />
              <Route path="/doctor/diagnosis" element={<AddDiagnosis />} />
            </>
          )}

          {/* Catch all */}
          <Route path="*" element={<Navigate to={user ? (user.role === 'doctor' ? '/doctor/dashboard' : '/home') : '/'} />} />
        </Routes>
      </div>

      {/* Show Navbar only for logged-in users and not on certain routes */}
      {user && !hideNavRoutes.includes(location.pathname) && (
        user.role === 'doctor' ? <DoctorNavbar /> : <Navbar />
      )}
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
