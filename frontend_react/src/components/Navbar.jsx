import React, { useContext } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
    Home, Activity, FileText, LayoutGrid, User, 
    HeartPulse, Stethoscope, Building2, Users, Shield, 
    GitBranch, Pill, Layers, Lock
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import '../index.css';

const Navbar = () => {
    const { user } = useContext(AuthContext);
    const location = useLocation();
    const role = (user?.role || 'patient').toLowerCase();

    const navStyle = {
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: '520px',
        backgroundColor: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--glass-border)',
        display: 'flex',
        justifyContent: 'space-around',
        padding: '10px 0 20px',
        zIndex: 1000,
        boxShadow: '0 -4px 20px rgba(0,0,0,0.05)'
    };

    const linkStyle = ({ isActive }) => ({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textDecoration: 'none',
        color: isActive ? 'var(--primary-color)' : 'var(--text-secondary)',
        fontSize: '10px',
        fontWeight: isActive ? 700 : 500,
        transition: 'all 0.2s ease',
        minWidth: '54px'
    });

    // Configure role-specific nav items
    let navItems = [];

    if (role === 'health_worker' || role === 'asha' || role === 'anm' || role === 'caregiver') {
        navItems = [
            { path: '/asha', label: 'ASHA Hub', icon: HeartPulse },
            { path: '/triage', label: 'Field Vitals', icon: Activity },
            { 
                path: '/referrals', 
                label: 'Referrals', 
                icon: GitBranch,
                highlight: true 
            },
            { path: '/family', label: 'Dependents', icon: Users },
            { path: '/profile', label: 'Profile', icon: User }
        ];
    } else if (role === 'doctor') {
        navItems = [
            { path: '/doctor/dashboard', label: 'OPD Queue', icon: Stethoscope },
            { path: '/doctor/patients', label: 'Patients', icon: Users },
            { 
                path: '/doctor/prescribe', 
                label: 'Prescribe', 
                icon: FileText,
                highlight: true 
            },
            { path: '/facility-dashboard', label: 'Bed Grid', icon: Building2 },
            { path: '/profile', label: 'Profile', icon: User }
        ];
    } else if (role === 'facility_staff' || role === 'facility_coordinator' || role === 'facility') {
        navItems = [
            { path: '/facility-dashboard', label: 'Bed Grid', icon: Building2 },
            { path: '/referrals', label: 'Inbound #TK', icon: GitBranch },
            { 
                path: '/facilities', 
                label: 'Directory', 
                icon: Layers,
                highlight: true 
            },
            { path: '/care-team', label: 'Doc Roster', icon: Users },
            { path: '/profile', label: 'Profile', icon: User }
        ];
    } else if (role === 'admin') {
        navItems = [
            { path: '/admin', label: 'Command Hub', icon: Shield },
            { path: '/facilities', label: 'Beds Live', icon: Building2 },
            { 
                path: '/referrals', 
                label: 'Referral KPIs', 
                icon: GitBranch,
                highlight: true 
            },
            { path: '/records', label: 'Med History', icon: Lock },
            { path: '/profile', label: 'Profile', icon: User }
        ];
    } else {
        // Default Citizen / Patient
        navItems = [
            { path: '/home', label: 'Home', icon: Home },
            { path: '/status', label: 'Status', icon: Activity },
            { 
                path: '/records', 
                label: 'Records', 
                icon: FileText,
                highlight: true 
            },
            { path: '/referrals', label: 'Referrals', icon: GitBranch },
            { path: '/profile', label: 'Profile', icon: User }
        ];
    }

    return (
        <nav style={navStyle}>
            {navItems.map((item, idx) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path !== '/home' && item.path !== '/' && location.pathname.startsWith(item.path));

                if (item.highlight) {
                    return (
                        <NavLink key={idx} to={item.path} style={linkStyle}>
                            <div style={{
                                backgroundColor: 'var(--primary-color)',
                                borderRadius: '50%',
                                padding: '10px',
                                marginTop: '-26px',
                                boxShadow: '0 8px 16px rgba(13, 148, 136, 0.35)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Icon size={22} strokeWidth={2.5} />
                            </div>
                            <span style={{ marginTop: '4px' }}>{item.label}</span>
                        </NavLink>
                    );
                }

                return (
                    <NavLink key={idx} to={item.path} style={linkStyle}>
                        <Icon size={22} strokeWidth={isActive ? 2.5 : 2} style={{ marginBottom: 4 }} />
                        <span>{item.label}</span>
                    </NavLink>
                );
            })}
        </nav>
    );
};

export default Navbar;
