import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    MessageSquareHeart, PhoneCall, Volume2, VolumeX, Mic, MicOff, 
    X, Send, ShieldAlert, Sparkles, AlertTriangle, CheckCircle2, 
    HeartPulse, Activity, Stethoscope, RefreshCw, ChevronRight,
    HelpCircle, Flame, Shield, Pill, ArrowUpRight, Zap
} from 'lucide-react';
import { 
    EMERGENCY_PROTOCOLS, 
    VERIFIED_MEDICATIONS, 
    evaluateOfflineQuery 
} from '../services/offlineHealthBotEngine';
import axios from 'axios';

const QUICK_ACTIONS = [
    { label: '🚨 Adult CPR', query: 'How to do adult CPR?', color: '#ef4444', bg: '#fee2e2' },
    { label: '🫁 Choking (Heimlich)', query: 'What to do for choking?', color: '#ea580c', bg: '#ffedd5' },
    { label: '🩸 Severe Bleeding', query: 'How to stop severe bleeding?', color: '#dc2626', bg: '#fef2f2' },
    { label: '❤️ Heart Attack', query: 'Heart attack warning signs and first aid', color: '#b91c1c', bg: '#fee2e2' },
    { label: '🔥 Burn Care', query: 'First aid for boiling water burn', color: '#d97706', bg: '#fef3c7' },
    { label: '🧠 Stroke (FAST)', query: 'Stroke symptoms FAST protocol', color: '#7c3aed', bg: '#f3e8ff' },
    { label: '💧 ORS & Dehydration', query: 'How to prepare ORS for dehydration', color: '#0284c7', bg: '#e0f2fe' },
    { label: '💊 Fever & Paracetamol', query: 'Safe fever dosage for Paracetamol', color: '#0d9488', bg: '#ccfbf1' },
    { label: '🛡️ Antibiotic Safety', query: 'Can I take antibiotics for viral cold?', color: '#475569', bg: '#f1f5f9' }
];

const OfflineHealthHelpBot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            sender: 'bot',
            text: 'Namaste! I am your **Offline First-Aid & Health AI Assistant**.\n\nI deliver immediate, verified emergency protocols with **0ms latency** (works completely in Airplane Mode without internet).',
            type: 'WELCOME',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [language, setLanguage] = useState('en'); // 'en' | 'hi'
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const messagesEndRef = useRef(null);
    const recognitionRef = useRef(null);

    // Monitor Online/Offline Status
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    // Initialize Speech Recognition if supported
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setInput(transcript);
                setIsListening(false);
                handleSendMessage(transcript);
            };

            recognition.onerror = () => setIsListening(false);
            recognition.onend = () => setIsListening(false);
            recognitionRef.current = recognition;
        }
    }, [language]);

    // Speech Synthesizer for Hands-free First Aid Audio
    const speakText = (text) => {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();

        if (isSpeaking) {
            setIsSpeaking(false);
            return;
        }

        const cleanText = text
            .replace(/[*_#`🚨⚠️❤️💧🩸🫁🔥🧠💊🛡️]/g, '')
            .replace(/\n+/g, '. ');

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
        utterance.rate = 0.95; // Slightly slower for emergency comprehension

        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
    };

    const stopSpeaking = () => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        setIsSpeaking(false);
    };

    const toggleSpeechInput = () => {
        if (!recognitionRef.current) {
            alert('Speech Recognition is not supported in your current browser. Please type your query.');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch (e) {
                console.error(e);
            }
        }
    };

    const handleSendMessage = async (textToSend) => {
        const queryText = (textToSend || input).trim();
        if (!queryText) return;

        // Add user message
        const userMsg = {
            sender: 'user',
            text: queryText,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMsg]);
        setInput('');

        // 1. First-pass: Evaluate 100% Offline Clinical Engine (0ms Latency)
        const offlineResult = evaluateOfflineQuery(queryText);

        if (offlineResult && offlineResult.type === 'EMERGENCY_PROTOCOL') {
            // Immediate Deterministic Emergency Precedence (bypasses remote APIs)
            const botMsg = {
                sender: 'bot',
                text: offlineResult.message,
                type: 'EMERGENCY_PROTOCOL',
                protocol: offlineResult.protocol,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, botMsg]);
            return;
        }

        if (offlineResult && offlineResult.type === 'MEDICATION_GUIDANCE') {
            const botMsg = {
                sender: 'bot',
                text: offlineResult.message,
                type: 'MEDICATION_GUIDANCE',
                medication: offlineResult.medication,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, botMsg]);
            return;
        }

        // 2. If online, optionally enrich with backend AI Decision Support
        if (isOnline) {
            try {
                const token = localStorage.getItem('accessToken');
                const authHeader = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
                
                // Call safe AI triage endpoint
                const res = await axios.post('/api/ai/triage', {
                    symptoms: queryText
                }, authHeader);

                if (res.data && res.data.triage) {
                    const t = res.data.triage;
                    const aiMessage = `🤖 **Clinical Triage Assessment:**\n` +
                                     `• **Risk Tier:** **${t.risk_tier}** (Score: ${t.priority_score}/100)\n` +
                                     `• **Clinical Urgency:** ${t.recommended_urgency || 'ROUTINE'}\n` +
                                     `• **Recommended Facility:** ${t.suggested_facility_tier || 'PHC / District Hospital'}\n\n` +
                                     `📝 **Explanation:** ${t.reasoning || t.explanation || 'Consult a doctor for complete diagnosis.'}\n\n` +
                                     `⚠️ *Disclaimer: Decision support only. Zero autonomous prescribing authority.*`;

                    setMessages(prev => [...prev, {
                        sender: 'bot',
                        text: aiMessage,
                        type: 'AI_TRIAGE',
                        timestamp: new Date()
                    }]);
                    return;
                }
            } catch (err) {
                console.warn('[BOT] Backend AI fallback to local engine:', err.message);
            }
        }

        // 3. Fallback to Local Knowledge Base
        const fallbackMsg = {
            sender: 'bot',
            text: offlineResult ? offlineResult.message : 'I can provide immediate first-aid instructions for CPR, Choking, Bleeding, Burns, Seizures, and safe WHO medication dosages. How can I assist you?',
            type: 'GENERAL',
            timestamp: new Date()
        };
        setMessages(prev => [...prev, fallbackMsg]);
    };

    return (
        <>
            {/* 1. Floating Pulse Trigger Button on Homepage */}
            <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999 }}>
                <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setIsOpen(true)}
                    style={{
                        padding: '14px 20px',
                        borderRadius: '30px',
                        background: 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)',
                        color: 'white',
                        border: 'none',
                        boxShadow: '0 8px 24px rgba(13, 148, 136, 0.4), 0 0 0 0 rgba(13, 148, 136, 0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '14px',
                        letterSpacing: '0.3px'
                    }}
                >
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <HeartPulse size={22} color="#ffffff" />
                        <span style={{
                            position: 'absolute',
                            top: '-3px',
                            right: '-3px',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#22c55e',
                            boxShadow: '0 0 8px #22c55e'
                        }} />
                    </div>
                    <span>Offline First-Aid AI</span>
                    <span style={{
                        background: 'rgba(255,255,255,0.2)',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 800
                    }}>
                        0ms
                    </span>
                </motion.button>
            </div>

            {/* 2. Interactive First-Aid & Health Assistant Modal Drawer */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 40 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 40 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        style={{
                            position: 'fixed',
                            bottom: '24px',
                            right: '24px',
                            width: '92vw',
                            maxWidth: '460px',
                            height: '82vh',
                            maxHeight: '680px',
                            background: '#ffffff',
                            borderRadius: '24px',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.08)',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            zIndex: 10000,
                            fontFamily: 'system-ui, -apple-system, sans-serif'
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            background: 'linear-gradient(135deg, #0f766e 0%, #0369a1 100%)',
                            color: 'white',
                            padding: '16px 20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backdropFilter: 'blur(10px)'
                                }}>
                                    <HeartPulse size={24} color="#ffffff" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '15px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span>Swasthya First-Aid Bot</span>
                                        <span style={{
                                            fontSize: '10px',
                                            background: '#22c55e',
                                            color: 'white',
                                            padding: '1px 6px',
                                            borderRadius: '6px',
                                            fontWeight: 800
                                        }}>
                                            OFFLINE READY
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '2px' }}>
                                        24 Emergency Protocols • WHO Medicines
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {/* Language Toggle */}
                                <button
                                    onClick={() => setLanguage(l => l === 'en' ? 'hi' : 'en')}
                                    title="Toggle English / Hindi"
                                    style={{
                                        background: 'rgba(255,255,255,0.2)',
                                        border: 'none',
                                        color: 'white',
                                        padding: '5px 10px',
                                        borderRadius: '8px',
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        cursor: 'pointer'
                                    }}
                                >
                                    {language === 'en' ? 'हिन्दी' : 'ENG'}
                                </button>

                                {/* Close Button */}
                                <button
                                    onClick={() => { stopSpeaking(); setIsOpen(false); }}
                                    style={{
                                        background: 'rgba(255,255,255,0.2)',
                                        border: 'none',
                                        color: 'white',
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Emergency Quick Dialer Bar */}
                        <div style={{
                            background: '#fee2e2',
                            borderBottom: '1px solid #fecaca',
                            padding: '8px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '12px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b91c1c', fontWeight: 700 }}>
                                <ShieldAlert size={16} />
                                <span>Emergency Numbers:</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <a 
                                    href="tel:108"
                                    style={{
                                        background: '#dc2626',
                                        color: 'white',
                                        padding: '3px 8px',
                                        borderRadius: '6px',
                                        textDecoration: 'none',
                                        fontWeight: 800,
                                        fontSize: '11px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    <PhoneCall size={12} /> 108 (Ambulance)
                                </a>
                                <a 
                                    href="tel:112"
                                    style={{
                                        background: '#475569',
                                        color: 'white',
                                        padding: '3px 8px',
                                        borderRadius: '6px',
                                        textDecoration: 'none',
                                        fontWeight: 800,
                                        fontSize: '11px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    112 (National)
                                </a>
                            </div>
                        </div>

                        {/* Quick Action Chips Carousel */}
                        <div style={{
                            padding: '10px 14px',
                            background: '#f8fafc',
                            borderBottom: '1px solid #e2e8f0',
                            overflowX: 'auto',
                            display: 'flex',
                            gap: '6px',
                            whiteSpace: 'nowrap'
                        }}>
                            {QUICK_ACTIONS.map((action, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSendMessage(action.query)}
                                    style={{
                                        padding: '5px 10px',
                                        borderRadius: '12px',
                                        background: action.bg,
                                        color: action.color,
                                        border: `1px solid ${action.color}30`,
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        flexShrink: 0
                                    }}
                                >
                                    {action.label}
                                </button>
                            ))}
                        </div>

                        {/* Messages Area */}
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '16px',
                            background: '#f8fafc',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}>
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start'
                                    }}
                                >
                                    <div style={{
                                        maxWidth: '88%',
                                        padding: '12px 16px',
                                        borderRadius: msg.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                        background: msg.sender === 'user' ? '#0d9488' : '#ffffff',
                                        color: msg.sender === 'user' ? '#ffffff' : '#1e293b',
                                        boxShadow: msg.sender === 'user' ? '0 4px 12px rgba(13, 148, 136, 0.25)' : '0 2px 8px rgba(0,0,0,0.06)',
                                        border: msg.sender === 'user' ? 'none' : '1px solid #e2e8f0',
                                        fontSize: '13px',
                                        lineHeight: '1.5',
                                        whiteSpace: 'pre-wrap'
                                    }}>
                                        {/* Render Protocol Card if Emergency */}
                                        {msg.protocol ? (
                                            <div>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    marginBottom: '10px',
                                                    borderBottom: '1px solid #fee2e2',
                                                    paddingBottom: '8px'
                                                }}>
                                                    <span style={{
                                                        background: '#ef4444',
                                                        color: 'white',
                                                        padding: '3px 8px',
                                                        borderRadius: '6px',
                                                        fontSize: '10px',
                                                        fontWeight: 800
                                                    }}>
                                                        EMERGENCY PROTOCOL
                                                    </span>
                                                    <button
                                                        onClick={() => speakText(msg.text)}
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: '#0d9488',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            fontSize: '11px',
                                                            fontWeight: 700
                                                        }}
                                                    >
                                                        {isSpeaking ? <VolumeX size={16} color="#ef4444" /> : <Volume2 size={16} />}
                                                        <span>{isSpeaking ? 'Stop Voice' : 'Read Aloud'}</span>
                                                    </button>
                                                </div>

                                                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 800, color: '#991b1b' }}>
                                                    {language === 'hi' ? msg.protocol.hindiTitle : msg.protocol.title}
                                                </h4>

                                                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '8px 10px', borderRadius: '8px', fontSize: '12px', color: '#991b1b', marginBottom: '10px' }}>
                                                    <strong>1. Scene Safety:</strong> {msg.protocol.sceneSafety}
                                                </div>

                                                <div style={{ fontWeight: 700, fontSize: '12px', marginBottom: '6px', color: '#0f172a' }}>
                                                    2. Step-by-Step Action:
                                                </div>
                                                <ol style={{ margin: '0 0 10px 0', paddingLeft: '18px', fontSize: '12px', color: '#334155' }}>
                                                    {(language === 'hi' ? msg.protocol.hindiSteps : msg.protocol.steps).map((st, sIdx) => (
                                                        <li key={sIdx} style={{ marginBottom: '6px' }}>{st}</li>
                                                    ))}
                                                </ol>

                                                {msg.protocol.doNotDo && (
                                                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '8px 10px', borderRadius: '8px', fontSize: '11px', color: '#92400e', marginBottom: '10px' }}>
                                                        <strong>⚠️ DO NOT DO:</strong>
                                                        <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px' }}>
                                                            {msg.protocol.doNotDo.map((d, dIdx) => <li key={dIdx}>{d}</li>)}
                                                        </ul>
                                                    </div>
                                                )}

                                                <a
                                                    href={`tel:${msg.protocol.emergencyNumber}`}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '8px',
                                                        padding: '10px',
                                                        background: '#dc2626',
                                                        color: 'white',
                                                        borderRadius: '10px',
                                                        textDecoration: 'none',
                                                        fontWeight: 800,
                                                        fontSize: '13px',
                                                        boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
                                                    }}
                                                >
                                                    <PhoneCall size={16} />
                                                    <span>Call Emergency Ambulance ({msg.protocol.emergencyNumber})</span>
                                                </a>
                                            </div>
                                        ) : (
                                            <div>
                                                {msg.text}
                                            </div>
                                        )}
                                    </div>
                                    <span style={{ fontSize: '10px', color: '#94a3b8', marginTop: '3px', padding: '0 4px' }}>
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <form
                            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                            style={{
                                padding: '12px 16px',
                                background: '#ffffff',
                                borderTop: '1px solid #e2e8f0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            {/* Speech-to-Text Button */}
                            <button
                                type="button"
                                onClick={toggleSpeechInput}
                                title={isListening ? 'Listening...' : 'Speak Question'}
                                style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '10px',
                                    border: '1px solid #e2e8f0',
                                    background: isListening ? '#fee2e2' : '#f8fafc',
                                    color: isListening ? '#ef4444' : '#64748b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    flexShrink: 0
                                }}
                            >
                                {isListening ? <MicOff size={18} color="#ef4444" /> : <Mic size={18} />}
                            </button>

                            {/* Text Input Field */}
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={isListening ? 'Listening to voice...' : 'Ask about CPR, bleeding, burns, fever...'}
                                style={{
                                    flex: 1,
                                    padding: '10px 14px',
                                    borderRadius: '12px',
                                    border: '1.5px solid #cbd5e1',
                                    fontSize: '13px',
                                    outline: 'none',
                                    color: '#0f172a'
                                }}
                            />

                            {/* Send Button */}
                            <button
                                type="submit"
                                disabled={!input.trim()}
                                style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '12px',
                                    background: input.trim() ? 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)' : '#e2e8f0',
                                    color: input.trim() ? 'white' : '#94a3b8',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: input.trim() ? 'pointer' : 'not-allowed',
                                    flexShrink: 0
                                }}
                            >
                                <Send size={16} />
                            </button>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default OfflineHealthHelpBot;
