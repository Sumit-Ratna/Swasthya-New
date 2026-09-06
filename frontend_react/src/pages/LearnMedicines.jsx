
import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Search, PlayCircle, Loader, AlertCircle, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MedicalExplainerVideo from '../components/MedicalExplainerVideo';

const LearnMedicines = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [storyboard, setStoryboard] = useState(null);
    const [showVideo, setShowVideo] = useState(false);
    const [prescribedMedicines, setPrescribedMedicines] = useState([]);

    React.useEffect(() => {
        if (user) fetchPrescriptions();
    }, [user]);

    const fetchPrescriptions = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await axios.get(`/api/documents/patient/${user.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const meds = new Set();
            res.data.forEach(doc => {
                if (doc.type === 'prescription' && doc.extracted_data && doc.extracted_data.medicines) {
                    doc.extracted_data.medicines.forEach(m => {
                        const name = m.split(' ')[0]; // Extract just the name if there's dosage
                        meds.add(name);
                    });
                }
            });
            setPrescribedMedicines(Array.from(meds));
        } catch (err) {
            console.error(err);
        }
    };

    const handleSearch = async () => {
        if (!searchTerm.trim()) return;

        setLoading(true);
        setError(null);
        setStoryboard(null);

        try {
            // We reuse the same endpoint but pass a generic context since there is no report
            const res = await axios.post('/api/ai/explainer', {
                medicine_name: searchTerm,
                patient_id: user?.id || 'guest',
                report_context: JSON.stringify({
                    summary_text: `Patient wants to learn about ${searchTerm}. General educational context.`
                })
            });

            console.log("Storyboard received:", res.data.storyboard);
            setStoryboard(res.data.storyboard);
            setShowVideo(true);
        } catch (err) {
            console.error("Explainer error", err);
            const msg = err.response?.data?.error || err.message || "Failed to generate video.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const popularMedicines = [
        "Paracetamol", "Amoxicillin", "Ibuprofen", "Metformin", "Amlodipine", "Omeprazole"
    ];

    return (
        <div style={{ padding: '20px', paddingBottom: '100px', minHeight: '100vh', background: '#F2F2F7' }}>
            <header style={{ marginBottom: '24px', display: 'flex', alignItems: 'center' }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{ background: 'none', border: 'none', padding: 0, marginRight: '16px', cursor: 'pointer' }}
                >
                    <ArrowLeft size={24} color="#007AFF" />
                </button>
                <div>
                    <h1 className="animate-enter" style={{ margin: 0, fontSize: '28px' }}>Medicine Library</h1>
                    <p className="animate-enter" style={{ margin: '4px 0 0', color: '#8E8E93', fontSize: '14px' }}>
                        Search and watch animated explainers
                    </p>
                </div>
            </header>

            {/* Search Box */}
            <div className="card" style={{ marginBottom: '24px', padding: '16px' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search size={20} color="#8E8E93" style={{ position: 'absolute', left: '12px' }} />
                    <input
                        type="text"
                        placeholder="Enter medicine name (e.g., Aspirin)"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        style={{
                            width: '100%',
                            padding: '12px 12px 12px 40px',
                            borderRadius: '12px',
                            border: '1px solid #E5E5EA',
                            fontSize: '16px',
                            outline: 'none',
                            background: '#F2F2F7'
                        }}
                    />
                </div>
                <button
                    className="btn-primary"
                    onClick={handleSearch}
                    disabled={loading || !searchTerm}
                    style={{ marginTop: '16px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    {loading ? (
                        <>
                            <Loader className="spin" size={20} style={{ marginRight: '8px' }} />
                            Generating Animation...
                        </>
                    ) : (
                        <>
                            <PlayCircle size={20} style={{ marginRight: '8px' }} />
                            Watch Explainer
                        </>
                    )}
                </button>
            </div>

            {/* Error Message */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card"
                    style={{ border: '1px solid #FF2D55', backgroundColor: '#FFF0F5', marginBottom: '24px', color: '#FF2D55', display: 'flex', alignItems: 'center' }}
                >
                    <AlertCircle size={20} style={{ marginRight: '10px' }} />
                    <span>{error}</span>
                </motion.div>
            )}

            {/* Suggestions */}
            <div>
                <h3 style={{ margin: '0 0 12px', fontSize: '18px' }}>Your Prescribed Medicines</h3>
                {prescribedMedicines.length === 0 ? (
                    <p style={{ color: '#8E8E93', fontSize: '14px' }}>No prescribed medicines found. Search for any medicine above.</p>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                        {prescribedMedicines.map((med, idx) => (
                            <motion.button
                                key={idx}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                    setSearchTerm(med);
                                }}
                                style={{
                                    background: '#E8FCE8',
                                    border: '1px solid #34C759',
                                    borderRadius: '12px',
                                    padding: '16px',
                                    fontSize: '15px',
                                    fontWeight: 600,
                                    color: '#1C1C1E',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                    cursor: 'pointer',
                                    textAlign: 'left'
                                }}
                            >
                                {med}
                            </motion.button>
                        ))}
                    </div>
                )}

                <h3 style={{ margin: '0 0 12px', fontSize: '18px' }}>Popular Medicines</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
                    {popularMedicines.map((med, idx) => (
                        <motion.button
                            key={idx}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                setSearchTerm(med);
                            }}
                            style={{
                                background: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                padding: '16px',
                                fontSize: '15px',
                                fontWeight: 600,
                                color: '#1C1C1E',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                cursor: 'pointer',
                                textAlign: 'left'
                            }}
                        >
                            {med}
                        </motion.button>
                    ))}
                </div>
            </div>

            {/* Video Modal */}
            {showVideo && storyboard && (
                <MedicalExplainerVideo
                    storyboard={storyboard}
                    onClose={() => setShowVideo(false)}
                />
            )}
        </div>
    );
};

export default LearnMedicines;
