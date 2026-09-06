import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Copy } from 'lucide-react';
// import QRCode from 'react-qr-code'; // Library not installed, using API fallback

const DoctorQR = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const copyToClipboard = () => {
        navigator.clipboard.writeText(user.doctor_qr_id);
        alert('Doctor ID copied to clipboard!');
    };

    return (
        <div style={{ padding: '20px', minHeight: '100vh', background: '#F2F2F7', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
                <button
                    onClick={() => navigate('/doctor/dashboard')}
                    style={{ background: 'white', border: 'none', padding: '10px', borderRadius: '12px', marginRight: '16px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
                >
                    <ArrowLeft size={24} color="#007AFF" />
                </button>
                <h1 style={{ fontSize: '24px', margin: 0 }}>My QR Code</h1>
            </div>

            <div className="card" style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px',
                textAlign: 'center',
                maxWidth: '400px',
                margin: '0 auto',
                width: '100%'
            }}>
                <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: '#E1F0FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '24px',
                    fontSize: '32px',
                    fontWeight: 'bold',
                    color: '#007AFF'
                }}>
                    {user?.name?.[0] || 'D'}
                </div>

                <h2 style={{ marginBottom: '8px' }}>{user?.name || 'Doctor'}</h2>
                <p style={{ color: '#8E8E93', marginBottom: '32px' }}>{user?.specialization || 'General Physician'}</p>

                {/* QR Code Container */}
                <div style={{
                    background: 'white',
                    padding: '20px',
                    borderRadius: '24px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    marginBottom: '32px'
                }}>
                    <div style={{ height: "200px", margin: "0 auto", maxWidth: "200px", width: "100%" }}>
                        {/* Fallback if library missing using simple API or just text */}
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${user?.doctor_qr_id || 'ERROR'}`}
                            alt="Doctor QR"
                            style={{ width: '100%', height: '100%' }}
                        />
                    </div>
                </div>

                <div style={{ background: '#F2F2F7', padding: '16px 24px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '1px' }}>
                        {user?.doctor_qr_id || 'NO-ID-GENERATED'}
                    </span>
                    <button onClick={copyToClipboard} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                        <Copy size={20} color="#007AFF" />
                    </button>
                </div>

                <p style={{ fontSize: '14px', color: '#8E8E93', maxWidth: '260px', lineHeight: '1.5' }}>
                    Ask patients to scan this code using the Swasthya app to link with you.
                </p>
            </div>
        </div>
    );
};

export default DoctorQR;
