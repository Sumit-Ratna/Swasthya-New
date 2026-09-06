import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { User, ArrowRight } from 'lucide-react';

const ProfileSetup = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        gender: '',
        dob: '',
        blood_group: '',
        height: '',
        weight: '',
        address_city: '',
        address_state: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/profile/update', {
                section: 'personal',
                data: formData
            });
            alert('Profile created successfully!');
            navigate('/home');
        } catch (err) {
            console.error(err);
            alert('Profile setup failed. You can update it later from Profile tab.');
            navigate('/home');
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '480px', margin: '0 auto' }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ width: '80px', height: '80px', background: '#007AFF', borderRadius: '50%', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={40} color="white" />
                    </div>
                    <h1>Complete Your Profile</h1>
                    <p style={{ color: '#8E8E93' }}>Help us serve you better</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="card">
                        <h3 style={{ marginTop: 0 }}>Personal Details</h3>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#8E8E93', display: 'block', marginBottom: '4px' }}>FULL NAME *</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                style={{ width: '100%', padding: '12px', border: '1px solid #E5E5EA', borderRadius: '8px', fontSize: '16px' }}
                                placeholder="Enter your name"
                            />
                        </div>

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 600, color: '#8E8E93', display: 'block', marginBottom: '4px' }}>EMAIL</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                style={{ width: '100%', padding: '12px', border: '1px solid #E5E5EA', borderRadius: '8px', fontSize: '16px' }}
                                placeholder="your@email.com"
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 600, color: '#8E8E93', display: 'block', marginBottom: '4px' }}>GENDER</label>
                                <select
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleChange}
                                    style={{ width: '100%', padding: '12px', border: '1px solid #E5E5EA', borderRadius: '8px', fontSize: '16px' }}
                                >
                                    <option value="">Select</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 600, color: '#8E8E93', display: 'block', marginBottom: '4px' }}>DATE OF BIRTH</label>
                                <input
                                    type="date"
                                    name="dob"
                                    value={formData.dob}
                                    onChange={handleChange}
                                    style={{ width: '100%', padding: '12px', border: '1px solid #E5E5EA', borderRadius: '8px', fontSize: '16px' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 600, color: '#8E8E93', display: 'block', marginBottom: '4px' }}>BLOOD GROUP</label>
                                <select
                                    name="blood_group"
                                    value={formData.blood_group}
                                    onChange={handleChange}
                                    style={{ width: '100%', padding: '12px', border: '1px solid #E5E5EA', borderRadius: '8px', fontSize: '16px' }}
                                >
                                    <option value="">Select</option>
                                    <option value="A+">A+</option>
                                    <option value="A-">A-</option>
                                    <option value="B+">B+</option>
                                    <option value="B-">B-</option>
                                    <option value="O+">O+</option>
                                    <option value="O-">O-</option>
                                    <option value="AB+">AB+</option>
                                    <option value="AB-">AB-</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 600, color: '#8E8E93', display: 'block', marginBottom: '4px' }}>HEIGHT (cm)</label>
                                <input
                                    type="number"
                                    name="height"
                                    value={formData.height}
                                    onChange={handleChange}
                                    style={{ width: '100%', padding: '12px', border: '1px solid #E5E5EA', borderRadius: '8px', fontSize: '16px' }}
                                    placeholder="170"
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 600, color: '#8E8E93', display: 'block', marginBottom: '4px' }}>WEIGHT (kg)</label>
                                <input
                                    type="number"
                                    name="weight"
                                    value={formData.weight}
                                    onChange={handleChange}
                                    style={{ width: '100%', padding: '12px', border: '1px solid #E5E5EA', borderRadius: '8px', fontSize: '16px' }}
                                    placeholder="70"
                                />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 600, color: '#8E8E93', display: 'block', marginBottom: '4px' }}>CITY</label>
                                <input
                                    type="text"
                                    name="address_city"
                                    value={formData.address_city}
                                    onChange={handleChange}
                                    style={{ width: '100%', padding: '12px', border: '1px solid #E5E5EA', borderRadius: '8px', fontSize: '16px' }}
                                    placeholder="Mumbai"
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 600, color: '#8E8E93', display: 'block', marginBottom: '4px' }}>STATE</label>
                                <input
                                    type="text"
                                    name="address_state"
                                    value={formData.address_state}
                                    onChange={handleChange}
                                    style={{ width: '100%', padding: '12px', border: '1px solid #E5E5EA', borderRadius: '8px', fontSize: '16px' }}
                                    placeholder="Maharashtra"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn-primary"
                        style={{ marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                        Continue <ArrowRight size={20} style={{ marginLeft: '8px' }} />
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        style={{ width: '100%', marginTop: '12px', padding: '14px', background: 'none', border: 'none', color: '#8E8E93', fontSize: '16px' }}
                    >
                        Skip for now
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

export default ProfileSetup;
