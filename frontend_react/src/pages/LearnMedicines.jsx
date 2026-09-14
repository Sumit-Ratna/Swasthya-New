
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

    const generateLocalStoryboard = (medicineName) => {
        const medLower = (medicineName || '').toLowerCase();
        let desc = "essential therapeutic medication";
        let icon = "tablet";
        let dosageNote = "Follow the exact timing, strength, and schedule advised by your healthcare provider.";

        if (medLower.includes('paracetamol') || medLower.includes('crocin') || medLower.includes('dolo') || medLower.includes('calpol')) {
            desc = "antipyretic and analgesic medicine used to lower fever and alleviate body pain";
            dosageNote = "Take after food with water. Maintain a minimum 4 to 6 hour gap between doses.";
        } else if (medLower.includes('amoxicillin') || medLower.includes('azithromycin') || medLower.includes('cipro') || medLower.includes('augmentin') || medLower.includes('antibiotic')) {
            desc = "broad-spectrum antibiotic prescribed to treat and eliminate bacterial infections";
            dosageNote = "Take at evenly spaced intervals and finish the entire prescribed course without skipping.";
        } else if (medLower.includes('metformin') || medLower.includes('glim') || medLower.includes('insulin')) {
            desc = "antidiabetic medication designed to maintain healthy, balanced blood glucose levels";
            icon = "blood_vessel";
            dosageNote = "Take with or immediately after meals to avoid stomach upset.";
        } else if (medLower.includes('amlodipine') || medLower.includes('telmisartan') || medLower.includes('atenolol') || medLower.includes('losartan')) {
            desc = "cardiovascular medication to manage and stabilize arterial blood pressure";
            icon = "heart";
            dosageNote = "Take once daily at the same time every day. Do not discontinue abruptly.";
        } else if (medLower.includes('omeprazole') || medLower.includes('pantoprazole') || medLower.includes('rabeprazole')) {
            desc = "gastro-protective acid reducer for acidity, reflux, and gastric healing";
            icon = "stomach";
            dosageNote = "Take on an empty stomach in the morning 30 minutes before breakfast.";
        } else if (medLower.includes('cetirizine') || medLower.includes('levocet') || medLower.includes('allegra') || medLower.includes('montair')) {
            desc = "antihistamine to relieve allergic symptoms, sneezing, and skin itching";
            dosageNote = "Preferably take at bedtime as it may induce mild relaxation or drowsiness.";
        } else if (medLower.includes('ibuprofen') || medLower.includes('combiflam') || medLower.includes('diclofenac')) {
            desc = "anti-inflammatory pain reliever to reduce swelling, inflammation, and joint pain";
            dosageNote = "Always take with food or milk to protect your stomach lining.";
        }

        return [
            {
                scene_number: 1,
                title: `Overview: ${medicineName}`,
                narration: `${medicineName} is an ${desc}. It acts directly inside your body to relieve symptoms and promote recovery.`,
                visual_description: `Animated overview of ${medicineName} entering the system and targeting active symptoms.`,
                animation_type: "fade_in",
                main_icon: icon,
                duration_seconds: 6
            },
            {
                scene_number: 2,
                title: "Dosage & Usage Schedule",
                narration: `${dosageNote} Always swallow whole with a full glass of clean water.`,
                visual_description: "Step-by-step dosage clock animation showing water intake and daily timing guide.",
                animation_type: "slide_right",
                main_icon: "shield",
                duration_seconds: 6
            },
            {
                scene_number: 3,
                title: "Safety & Precautions",
                narration: "Store in a cool, dry place below 25°C away from direct sunlight. Consult your doctor if pregnant or managing chronic conditions.",
                visual_description: "Medical safety seal animation highlighting proper storage and hydration.",
                animation_type: "pulse",
                main_icon: "shield",
                duration_seconds: 6
            },
            {
                scene_number: 4,
                title: "Clinical Safety Advisory",
                narration: "This visual dosage guide is for educational reference. Follow your consulting physician's exact prescription directives.",
                visual_description: "Ayushman Bharat certified medical verification seal and consultation advisory.",
                animation_type: "zoom_in",
                main_icon: "check",
                duration_seconds: 5
            }
        ];
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

            if (res.data?.storyboard && Array.isArray(res.data.storyboard) && res.data.storyboard.length > 0) {
                setStoryboard(res.data.storyboard);
                setShowVideo(true);
            } else {
                setStoryboard(generateLocalStoryboard(searchTerm));
                setShowVideo(true);
            }
        } catch (err) {
            console.warn("Explainer notice, using clinical storyboard:", err);
            setStoryboard(generateLocalStoryboard(searchTerm));
            setShowVideo(true);
            setError(null);
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
                    medicineName={searchTerm}
                    onClose={() => setShowVideo(false)}
                />
            )}
        </div>
    );
};

export default LearnMedicines;
