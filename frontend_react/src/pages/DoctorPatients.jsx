import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { motion } from 'framer-motion';
import axios from 'axios';
import { User, Search, Phone, Droplet, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DoctorPatients = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [patients, setPatients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.role !== 'doctor') {
            navigate('/');
            return;
        }
        fetchPatients();
    }, [user]);

    const fetchPatients = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await axios.get('/api/connect/doctor/patients', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPatients(res.data);
        } catch (err) {
            console.error('Error fetching patients:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredPatients = patients.filter(p =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.phone?.includes(searchTerm)
    );

    if (loading) {
        return <div style={{ padding: '20px', textAlign: 'center' }}>Loading patients...</div>;
    }

    return (
        <div style={{ padding: '20px' }}>
            <header style={{ marginBottom: '24px' }}>
                <h1 className="animate-enter">My Patients</h1>
                <p className="animate-enter" style={{ animationDelay: '0.1s', color: '#8E8E93' }}>
                    Manage and view patient records
                </p>
            </header>

            {/* Search */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', padding: '12px' }}>
                    <Search size={20} color="#8E8E93" style={{ marginRight: '10px' }} />
                    <input
                        type="text"
                        placeholder="Search by name or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ border: 'none', width: '100%', fontSize: '16px', outline: 'none' }}
                    />
                </div>
            </div>

            {/* Patients List */}
            {filteredPatients.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#8E8E93' }}>
                    <User size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                    <p>{searchTerm ? 'No patients found' : 'No patients linked yet'}</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                    {filteredPatients.map((patient, index) => (
                        <motion.div
                            key={patient.id}
                            className="card"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => navigate(`/doctor/patient/${patient.id}`)}
                            style={{ cursor: 'pointer', padding: '16px' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'start', marginBottom: '12px' }}>
                                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#E1F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px', fontSize: '24px', fontWeight: 'bold', color: '#007AFF' }}>
                                    {patient.name?.[0]?.toUpperCase() || 'P'}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: '18px', marginBottom: '4px' }}>
                                        {patient.name || 'Unknown Patient'}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8E8E93', fontSize: '14px', marginBottom: '8px' }}>
                                        <Phone size={14} />
                                        <span>
                                            {patient.phone ? (patient.phone.startsWith('+') ? patient.phone : `+91 ${patient.phone}`) : ''}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {patient.gender && (
                                            <span style={{ background: '#F2F2F7', padding: '4px 8px', borderRadius: '6px', fontSize: '12px' }}>
                                                {patient.gender}
                                            </span>
                                        )}
                                        {patient.blood_group && (
                                            <span style={{ background: '#FFF0F5', color: '#FF2D55', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', display: 'flex', alignItems: 'center' }}>
                                                <Droplet size={12} style={{ marginRight: '4px' }} />
                                                {patient.blood_group}
                                            </span>
                                        )}
                                        {patient.dob && (
                                            <span style={{ background: '#F2F2F7', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', display: 'flex', alignItems: 'center' }}>
                                                <Calendar size={12} style={{ marginRight: '4px' }} />
                                                {new Date(patient.dob).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div style={{ padding: '8px 16px', background: '#007AFF', color: 'white', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                                    View
                                </div>
                            </div>

                            {/* Medical History Preview */}
                            {patient.medical_history?.allergies?.length > 0 && (
                                <div style={{ paddingTop: '12px', borderTop: '1px solid #F2F2F7' }}>
                                    <div style={{ fontSize: '12px', color: '#8E8E93', marginBottom: '6px' }}>Allergies:</div>
                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                        {patient.medical_history.allergies.map(allergy => (
                                            <span key={allergy} style={{ background: '#FFF0F5', color: '#FF2D55', padding: '3px 8px', borderRadius: '4px', fontSize: '11px' }}>
                                                {allergy}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default DoctorPatients;
