import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Records from './Records';
import { ArrowLeft, User, Activity } from 'lucide-react';

const FamilyMemberDetails = () => {
    const { memberId } = useParams();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [member, setMember] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (user && memberId) {
            fetchMemberDetails();
        }
    }, [user, memberId]);

    const fetchMemberDetails = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await axios.get(`/api/family/${memberId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Result structure from familyController: { member: { ... }, documents: [], appointments: [], relation: string }
            setMember({ ...res.data.member, relation: res.data.relation });
            setLoading(false);
        } catch (err) {
            console.error("Fetch member error:", err);
            setError("Failed to load family member details.");
            setLoading(false);
        }
    };

    if (loading) return <div style={{ padding: '20px', textAlign: 'center' }}>Loading member...</div>;
    if (error) return <div style={{ padding: '20px', color: 'red' }}>{error}</div>;

    return (
        <div style={{ padding: '20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                <button
                    onClick={() => navigate('/family')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '16px', display: 'flex' }}
                >
                    <ArrowLeft size={24} color="#333" />
                </button>

                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '50%',
                            background: '#FF9500', color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                        }}>
                            {member?.name?.[0] || 'U'}
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '20px' }}>{member?.name}</h2>
                            <div style={{ fontSize: '12px', color: '#8E8E93' }}>{member?.relation || 'Family Member'}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reusing Records Component for this member */}
            <div style={{ background: '#F2F2F7', margin: '-20px', padding: '20px', minHeight: 'calc(100vh - 80px)' }}>
                <div style={{ background: 'white', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                    <h3 style={{ margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Activity size={20} color="#007AFF" />
                        Medical Records for {member?.name}
                    </h3>
                    <Records viewingPatientId={memberId} />
                </div>
            </div>
        </div>
    );
};

export default FamilyMemberDetails;
