import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, UserCircle } from 'lucide-react';

const DoctorNavbar = () => {
    const { logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        { path: '/doctor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/doctor/patients', label: 'Patients', icon: Users },
        { path: '/profile', label: 'Profile', icon: UserCircle },
    ];

    return (
        <nav style={{
            position: 'fixed',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '100%',
            maxWidth: '480px',
            backgroundColor: 'var(--glass-bg)',
            backdropFilter: 'blur(20px)',
            borderTop: '1px solid var(--glass-border)',
            display: 'flex',
            justifyContent: 'space-around',
            padding: '12px 0 24px',
            zIndex: 1000,
            boxShadow: '0 -4px 20px rgba(0,0,0,0.03)'
        }}>
            {navItems.map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');

                return (
                    <button
                        key={item.path}
                        onClick={() => navigate(item.path)}
                        style={{
                            background: 'none',
                            border: 'none',
                            padding: '0',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            cursor: 'pointer',
                            color: isActive ? 'var(--primary-color)' : 'var(--text-secondary)',
                            fontSize: '10px',
                            fontWeight: 500,
                            transition: 'all 0.2s'
                        }}
                    >
                        <Icon size={24} strokeWidth={2.5} style={{ marginBottom: 4 }} />
                        <span>
                            {item.label}
                        </span>
                    </button>
                );
            })}

            {/* Logout Button */}
            {/* Logout button removed - moved to Profile page */}
        </nav>
    );
};

export default DoctorNavbar;
