import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Activity, FileText, LayoutGrid, User } from 'lucide-react';
import '../index.css';

const Navbar = () => {
    const navStyle = {
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
    };

    const linkStyle = ({ isActive }) => ({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textDecoration: 'none',
        color: isActive ? 'var(--primary-color)' : 'var(--text-secondary)',
        fontSize: '10px',
        fontWeight: 500,
        transition: 'color 0.2s'
    });

    return (
        <nav style={navStyle}>
            <NavLink to="/home" style={linkStyle}>
                <Home size={24} strokeWidth={2.5} style={{ marginBottom: 4 }} />
                <span>Home</span>
            </NavLink>
            <NavLink to="/status" style={linkStyle}>
                <Activity size={24} strokeWidth={2.5} style={{ marginBottom: 4 }} />
                <span>Status</span>
            </NavLink>
            <NavLink to="/records" style={linkStyle}>
                <div style={{
                    backgroundColor: 'var(--primary-color)',
                    borderRadius: '50%',
                    padding: '12px',
                    marginTop: '-30px',
                    boxShadow: '0 8px 16px rgba(13, 148, 136, 0.3)',
                    color: 'white'
                }}>
                    <FileText size={24} strokeWidth={2.5} />
                </div>
                <span style={{ marginTop: '4px' }}>Records</span>
            </NavLink>
            <NavLink to="/services" style={linkStyle}>
                <LayoutGrid size={24} strokeWidth={2.5} style={{ marginBottom: 4 }} />
                <span>Services</span>
            </NavLink>
            <NavLink to="/profile" style={linkStyle}>
                <User size={24} strokeWidth={2.5} style={{ marginBottom: 4 }} />
                <span>Profile</span>
            </NavLink>
        </nav>
    );
};

export default Navbar;
