import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    MessageSquareHeart, PhoneCall, Volume2, VolumeX, Mic, MicOff, 
    X, Send, ShieldAlert, Sparkles, AlertTriangle, CheckCircle2, 
    HeartPulse, Activity, Stethoscope, RefreshCw, ChevronRight,
    HelpCircle, Flame, Shield, Pill, ArrowUpRight, Zap, Download,
    Cpu, HardDrive, Trash2, Check, Settings, Globe, Wifi, WifiOff,
    Radio, Link, Sliders
} from 'lucide-react';
import { 
    EMERGENCY_PROTOCOLS, 
    VERIFIED_MEDICATIONS, 
    evaluateOfflineQuery 
} from '../services/offlineHealthBotEngine';
import gemmaEngine from '../services/gemmaOfflineEngine';
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

const DEFAULT_N8N_URL = 'https://saadkhan104.app.n8n.cloud/webhook/78c07e24-c57c-4e71-8f21-ed98b5d3c73a';
const STORAGE_N8N_URL = 'swasthya_n8n_webhook_url';
const STORAGE_AI_MODE = 'swasthya_ai_mode'; // 'online' | 'offline'

const OfflineHealthHelpBot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            sender: 'bot',
            text: 'Namaste! I am your **Swasthya AI Health & Emergency Assistant**.\n\n• **Online Mode**: Connected to **n8n AI Agent Webhook**.\n• **Offline Mode**: 100% On-Device **Gemma LiteRT** & 24 Emergency Protocol Engine (Airplane Mode ready).',
            type: 'WELCOME',
            timestamp: new Date()
        }
    ]);
    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [language, setLanguage] = useState('en'); // 'en' | 'hi'
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    
    // User Mode Toggle: 'online' (n8n webhook) vs 'offline' (on-device Gemma LiteRT)
    const [aiMode, setAiMode] = useState(localStorage.getItem(STORAGE_AI_MODE) || (navigator.onLine ? 'online' : 'offline'));
    const [customN8nUrl, setCustomN8nUrl] = useState(localStorage.getItem(STORAGE_N8N_URL) || DEFAULT_N8N_URL);
    const [tempN8nUrl, setTempN8nUrl] = useState(customN8nUrl);
    const [isSending, setIsSending] = useState(false);

    // Gemma LiteRT Model Download & Persistent Status State
    const [gemmaState, setGemmaState] = useState(gemmaEngine.getStatus());
    const [showSettingsModal, setShowSettingsModal] = useState(false);

    const messagesEndRef = useRef(null);
    const recognitionRef = useRef(null);

    // Subscribe to Gemma 3n E2B Engine State
    useEffect(() => {
        const unsubscribe = gemmaEngine.subscribe((state) => {
            setGemmaState(state);
        });
        return () => unsubscribe();
    }, []);

    // Monitor Network Connectivity & adjust mode automatically if offline
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
        };
        const handleOffline = () => {
            setIsOnline(false);
            setAiMode('offline'); // Auto-switch to Gemma on network loss
        };
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Trigger Gemma 3n E2B model download
    const handleDownloadGemma = async () => {
        try {
            await gemmaEngine.startModelDownload();
        } catch (e) {
            console.error('[Gemma 3n E2B] Download error:', e);
        }
    };

    // Toggle Mode
    const handleToggleMode = (newMode) => {
        setAiMode(newMode);
        localStorage.setItem(STORAGE_AI_MODE, newMode);
    };

    // Save Custom n8n Webhook URL
    const handleSaveN8nUrl = () => {
        const urlToSave = tempN8nUrl.trim() || DEFAULT_N8N_URL;
        setCustomN8nUrl(urlToSave);
        localStorage.setItem(STORAGE_N8N_URL, urlToSave);
        alert('n8n Webhook URL saved successfully!');
    };

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
            .replace(/[*_#`🚨⚠️❤️💧🩸🫁🔥🧠💊🛡️✨🌐]/g, '')
            .replace(/\n+/g, '. ');

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
        utterance.rate = 0.95;

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
        if (!queryText || isSending) return;

        // Add user message
        const userMsg = {
            sender: 'user',
            text: queryText,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsSending(true);

        // =========================================================================
        // 1. IMMEDIATE HARDCODED EMERGENCY PROTOCOLS (0ms ZERO-LATENCY GUARANTEE)
        // CPR, Severe Bleeding, Choking, Stroke, Heart Attack, Burns, Electric Shock, etc.
        // Major acute health risks MUST bypass network calls and display immediately.
        // =========================================================================
        const offlineResult = evaluateOfflineQuery(queryText);

        if (offlineResult && offlineResult.type === 'EMERGENCY_PROTOCOL') {
            const botMsg = {
                sender: 'bot',
                text: offlineResult.message,
                type: 'EMERGENCY_PROTOCOL',
                protocol: offlineResult.protocol,
                engine: '⚡ Instant Emergency Protocol (0ms Latency)',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, botMsg]);
            setIsSending(false);
            return;
        }

        // =========================================================================
        // 2. ONLINE MODE: DISPATCH TO N8N AI AGENT WEBHOOK (90s TIMEOUT)
        // =========================================================================
        if (aiMode === 'online' && isOnline) {
            try {
                const token = localStorage.getItem('accessToken');
                const authHeader = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
                const webhookToHit = customN8nUrl || DEFAULT_N8N_URL;

                const res = await axios.post('/api/ai/n8n-webhook', {
                    query: queryText,
                    message: queryText,
                    language: language,
                    customWebhookUrl: webhookToHit
                }, { ...authHeader, timeout: 90000 });

                if (res.data && res.data.reply) {
                    const botMsg = {
                        sender: 'bot',
                        text: res.data.reply,
                        type: 'N8N_WEBHOOK',
                        engine: res.data.source === 'n8n_webhook' ? '🌐 n8n AI Workflow Agent' : '🤖 Cloud AI Triage',
                        timestamp: new Date()
                    };
                    setMessages(prev => [...prev, botMsg]);
                    setIsSending(false);
                    return;
                }
            } catch (err) {
                console.warn('[ONLINE] n8n webhook via backend proxy error, trying direct webhook POST (90s timeout):', err.message);
                try {
                    const directRes = await axios.post(customN8nUrl || DEFAULT_N8N_URL, {
                        query: queryText,
                        message: queryText,
                        language: language,
                        timestamp: new Date().toISOString()
                    }, { headers: { 'Content-Type': 'application/json' }, timeout: 90000 });

                    const output = directRes.data;
                    let replyText = typeof output === 'string' ? output : (output.reply || output.output || output.text || output.message || JSON.stringify(output));
                    if (Array.isArray(output) && output[0]) {
                        const item = output[0];
                        replyText = typeof item === 'string' ? item : (item.output || item.reply || item.text || item.message || JSON.stringify(item));
                    }

                    const botMsg = {
                        sender: 'bot',
                        text: replyText,
                        type: 'N8N_WEBHOOK',
                        engine: '🌐 n8n AI Agent Workflow (Direct)',
                        timestamp: new Date()
                    };
                    setMessages(prev => [...prev, botMsg]);
                    setIsSending(false);
                    return;
                } catch (directErr) {
                    console.warn('[ONLINE] Direct n8n webhook call failed, falling back to local Gemma 1.5 Lite:', directErr.message);
                }
            }
        }

        // =========================================================================
        // 3. OFFLINE MODE: ON-DEVICE GEMMA 1.5 LITE INT4 + FORMULARY REASONING
        // =========================================================================
        if (offlineResult && offlineResult.type === 'MEDICATION_GUIDANCE') {
            const botMsg = {
                sender: 'bot',
                text: offlineResult.message,
                type: 'MEDICATION_GUIDANCE',
                medication: offlineResult.medication,
                engine: '⚡ Gemma 1.5 Lite (Formulary Safety)',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, botMsg]);
            setIsSending(false);
            return;
        }

        // On-Device Gemma LiteRT Neural Core Dynamic Reasoning
        const gemmaResult = await gemmaEngine.generateInference(queryText, null, language);
        const dynamicReply = gemmaResult.reply || (offlineResult ? offlineResult.message : 'Evaluation complete.');

        const botMsg = {
            sender: 'bot',
            text: dynamicReply,
            type: 'LOCAL_GEMMA',
            engine: '⚡ On-Device Gemma LiteRT (Offline)',
            timestamp: new Date()
        };
        setMessages(prev => [...prev, botMsg]);
        setIsSending(false);
    };

    return (
        <>
            {/* 1. Compact, Draggable Floating Pulse Trigger Button */}
            <motion.div
                drag
                dragMomentum={false}
                dragElastic={0.15}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                whileDrag={{ scale: 1.12, cursor: 'grabbing', zIndex: 10001 }}
                onClick={() => setIsOpen(true)}
                title="Swasthya AI Assistant • Drag to move, Click to open"
                style={{
                    position: 'fixed',
                    bottom: '80px',
                    right: '20px',
                    zIndex: 9999,
                    cursor: 'grab',
                    touchAction: 'none',
                    userSelect: 'none'
                }}
            >
                <div
                    style={{
                        height: '44px',
                        padding: '0 12px 0 10px',
                        borderRadius: '24px',
                        background: aiMode === 'online' 
                            ? 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)' 
                            : 'linear-gradient(135deg, #0d9488 0%, #16a34a 100%)',
                        color: 'white',
                        border: '1.5px solid rgba(255, 255, 255, 0.4)',
                        boxShadow: '0 8px 24px rgba(13, 148, 136, 0.45), 0 2px 6px rgba(0, 0, 0, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '7px',
                        backdropFilter: 'blur(8px)',
                        transition: 'box-shadow 0.2s ease'
                    }}
                >
                    {/* Glowing Pulse Heartbeat Icon */}
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <HeartPulse size={20} color="#ffffff" />
                        <span style={{
                            position: 'absolute',
                            top: '-2px',
                            right: '-2px',
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            background: aiMode === 'online' ? '#38bdf8' : '#22c55e',
                            boxShadow: `0 0 8px ${aiMode === 'online' ? '#38bdf8' : '#22c55e'}`
                        }} />
                    </div>

                    {/* Compact Label & Badge */}
                    <span style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        letterSpacing: '0.2px',
                        whiteSpace: 'nowrap'
                    }}>
                        AI
                    </span>

                    <span style={{
                        background: 'rgba(255,255,255,0.22)',
                        padding: '2px 6px',
                        borderRadius: '8px',
                        fontSize: '10px',
                        fontWeight: 800,
                        letterSpacing: '0.3px',
                        lineHeight: 1
                    }}>
                        {aiMode === 'online' ? 'n8n' : 'INT4'}
                    </span>
                </div>
            </motion.div>

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
                            background: aiMode === 'online'
                                ? 'linear-gradient(135deg, #0369a1 0%, #0f766e 100%)'
                                : 'linear-gradient(135deg, #0f766e 0%, #15803d 100%)',
                            color: 'white',
                            padding: '14px 18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '10px',
                                    background: 'rgba(255,255,255,0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backdropFilter: 'blur(10px)'
                                }}>
                                    <HeartPulse size={22} color="#ffffff" />
                                </div>
                                <div>
                                    <div style={{ fontSize: '14px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span>Swasthya AI Assistant</span>
                                    </div>
                                    <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '1px' }}>
                                        {aiMode === 'online' ? '🌐 n8n AI Workflow Mode' : '⚡ On-Device Gemma LiteRT Mode'}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {/* Settings & Webhook Config Button */}
                                <button
                                    onClick={() => setShowSettingsModal(true)}
                                    title="AI Settings & n8n Config"
                                    style={{
                                        background: 'rgba(255,255,255,0.2)',
                                        border: 'none',
                                        color: 'white',
                                        padding: '5px 8px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    <Settings size={14} />
                                </button>

                                {/* Language Toggle */}
                                <button
                                    onClick={() => setLanguage(l => l === 'en' ? 'hi' : 'en')}
                                    title="Toggle English / Hindi"
                                    style={{
                                        background: 'rgba(255,255,255,0.2)',
                                        border: 'none',
                                        color: 'white',
                                        padding: '5px 8px',
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
                                        width: '30px',
                                        height: '30px',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Mode Switcher Bar (Online n8n vs Offline Gemma 3n E2B) */}
                        <div style={{
                            background: '#f8fafc',
                            padding: '8px 14px',
                            borderBottom: '1px solid #e2e8f0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px'
                        }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>
                                AI Engine:
                            </span>
                            <div style={{ display: 'flex', background: '#e2e8f0', padding: '2px', borderRadius: '10px' }}>
                                <button
                                    onClick={() => handleToggleMode('online')}
                                    style={{
                                        border: 'none',
                                        padding: '4px 10px',
                                        borderRadius: '8px',
                                        background: aiMode === 'online' ? '#0284c7' : 'transparent',
                                        color: aiMode === 'online' ? 'white' : '#64748b',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <Globe size={12} />
                                    <span>Online (n8n)</span>
                                </button>
                                <button
                                    onClick={() => handleToggleMode('offline')}
                                    style={{
                                        border: 'none',
                                        padding: '4px 10px',
                                        borderRadius: '8px',
                                        background: aiMode === 'offline' ? '#0d9488' : 'transparent',
                                        color: aiMode === 'offline' ? 'white' : '#64748b',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <Cpu size={12} />
                                    <span>Offline (Gemma LiteRT)</span>
                                </button>
                            </div>
                        </div>

                        {/* FIRST-TIME SETUP DIALOG: One-Time Offline Gemma 3n E2B Download */}
                        {gemmaState.status !== 'READY' && (
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'rgba(15, 23, 42, 0.88)',
                                backdropFilter: 'blur(8px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '20px',
                                zIndex: 10050
                            }}>
                                <div style={{
                                    background: 'white',
                                    borderRadius: '20px',
                                    padding: '24px 20px',
                                    maxWidth: '340px',
                                    width: '100%',
                                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
                                    textAlign: 'center'
                                }}>
                                    <div style={{
                                        width: '54px',
                                        height: '54px',
                                        borderRadius: '16px',
                                        background: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)',
                                        color: 'white',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto 14px',
                                        boxShadow: '0 8px 16px rgba(13, 148, 136, 0.3)'
                                    }}>
                                        <Cpu size={26} />
                                    </div>

                                    <h3 style={{ margin: '0 0 8px', fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
                                        Offline AI Model
                                    </h3>
                                    <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#475569', lineHeight: 1.5 }}>
                                        Download the offline AI model to use Health Assistance without an internet connection.
                                    </p>

                                    <div style={{
                                        background: '#f8fafc',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '10px',
                                        padding: '9px 12px',
                                        fontSize: '11px',
                                        color: '#64748b',
                                        marginBottom: '16px'
                                    }}>
                                        💾 Requires <strong>~48 MB</strong> device storage before downloading.
                                    </div>

                                    {gemmaState.status === 'DOWNLOADING' ? (
                                        <div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#0284c7', marginBottom: '6px' }}>
                                                <span>Downloading {gemmaState.currentFile || 'Gemma 3n E2B'}...</span>
                                                <span>{gemmaState.progress}%</span>
                                            </div>
                                            <div style={{ width: '100%', height: '8px', background: '#e0f2fe', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' }}>
                                                <div style={{
                                                    width: `${gemmaState.progress}%`,
                                                    height: '100%',
                                                    background: 'linear-gradient(90deg, #0284c7 0%, #0d9488 100%)',
                                                    transition: 'width 0.2s ease'
                                                }} />
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b' }}>
                                                <span>{gemmaState.loadedFormatted || '0 MB'} / {gemmaState.size}</span>
                                                <span>{gemmaState.speedMBs ? `${gemmaState.speedMBs} MB/s` : 'Connecting...'}</span>
                                            </div>
                                        </div>
                                    ) : gemmaState.status === 'FAILED' ? (
                                        <div>
                                            <div style={{ color: '#dc2626', fontSize: '11px', fontWeight: 700, marginBottom: '12px' }}>
                                                Offline model download failed. Please try again.
                                            </div>
                                            <button
                                                onClick={handleDownloadGemma}
                                                style={{
                                                    width: '100%',
                                                    padding: '11px',
                                                    borderRadius: '10px',
                                                    background: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)',
                                                    color: 'white',
                                                    border: 'none',
                                                    fontSize: '12px',
                                                    fontWeight: 800,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px'
                                                }}
                                            >
                                                <RefreshCw size={14} />
                                                <span>Retry Download</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={handleDownloadGemma}
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                borderRadius: '12px',
                                                background: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)',
                                                color: 'white',
                                                border: 'none',
                                                fontSize: '13px',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px'
                                            }}
                                        >
                                            <Download size={16} />
                                            <span>Download Offline Model</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Emergency Quick Dialer Bar */}
                        <div style={{
                            background: '#fee2e2',
                            borderBottom: '1px solid #fecaca',
                            padding: '6px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: '11px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#b91c1c', fontWeight: 700 }}>
                                <ShieldAlert size={14} />
                                <span>Emergency:</span>
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <a 
                                    href="tel:108"
                                    style={{
                                        background: '#dc2626',
                                        color: 'white',
                                        padding: '2px 7px',
                                        borderRadius: '5px',
                                        textDecoration: 'none',
                                        fontWeight: 800,
                                        fontSize: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px'
                                    }}
                                >
                                    <PhoneCall size={10} /> 108
                                </a>
                                <a 
                                    href="tel:112"
                                    style={{
                                        background: '#475569',
                                        color: 'white',
                                        padding: '2px 7px',
                                        borderRadius: '5px',
                                        textDecoration: 'none',
                                        fontWeight: 800,
                                        fontSize: '10px'
                                    }}
                                >
                                    112
                                </a>
                            </div>
                        </div>

                        {/* Quick Action Chips Carousel */}
                        <div style={{
                            padding: '8px 12px',
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
                                        padding: '4px 8px',
                                        borderRadius: '10px',
                                        background: action.bg,
                                        color: action.color,
                                        border: `1px solid ${action.color}30`,
                                        fontSize: '10px',
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
                            padding: '14px',
                            background: '#f8fafc',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px'
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
                                        maxWidth: '90%',
                                        padding: '10px 14px',
                                        borderRadius: msg.sender === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
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
                                                    marginBottom: '8px',
                                                    borderBottom: '1px solid #fee2e2',
                                                    paddingBottom: '6px'
                                                }}>
                                                    <span style={{
                                                        background: '#ef4444',
                                                        color: 'white',
                                                        padding: '2px 6px',
                                                        borderRadius: '5px',
                                                        fontSize: '9px',
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
                                                        {isSpeaking ? <VolumeX size={14} color="#ef4444" /> : <Volume2 size={14} />}
                                                        <span>{isSpeaking ? 'Stop' : 'Read'}</span>
                                                    </button>
                                                </div>

                                                <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 800, color: '#991b1b' }}>
                                                    {language === 'hi' ? msg.protocol.hindiTitle : msg.protocol.title}
                                                </h4>

                                                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '6px 8px', borderRadius: '6px', fontSize: '11px', color: '#991b1b', marginBottom: '8px' }}>
                                                    <strong>1. Scene Safety:</strong> {msg.protocol.sceneSafety}
                                                </div>

                                                <div style={{ fontWeight: 700, fontSize: '11px', marginBottom: '4px', color: '#0f172a' }}>
                                                    2. Step-by-Step Action:
                                                </div>
                                                <ol style={{ margin: '0 0 8px 0', paddingLeft: '16px', fontSize: '12px', color: '#334155' }}>
                                                    {(language === 'hi' ? msg.protocol.hindiSteps : msg.protocol.steps).map((st, sIdx) => (
                                                        <li key={sIdx} style={{ marginBottom: '4px' }}>{st}</li>
                                                    ))}
                                                </ol>

                                                {msg.protocol.doNotDo && (
                                                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '6px 8px', borderRadius: '6px', fontSize: '10px', color: '#92400e', marginBottom: '8px' }}>
                                                        <strong>⚠️ DO NOT DO:</strong>
                                                        <ul style={{ margin: '2px 0 0 0', paddingLeft: '14px' }}>
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
                                                        gap: '6px',
                                                        padding: '8px',
                                                        background: '#dc2626',
                                                        color: 'white',
                                                        borderRadius: '8px',
                                                        textDecoration: 'none',
                                                        fontWeight: 800,
                                                        fontSize: '12px'
                                                    }}
                                                >
                                                    <PhoneCall size={14} />
                                                    <span>Call Ambulance ({msg.protocol.emergencyNumber})</span>
                                                </a>
                                            </div>
                                        ) : (
                                            <div>
                                                {msg.text}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', padding: '0 4px' }}>
                                        {msg.engine && (
                                            <span style={{ fontSize: '9px', color: '#0d9488', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                {msg.engine}
                                            </span>
                                        )}
                                        <span style={{ fontSize: '9px', color: '#94a3b8' }}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {isSending && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '11px', padding: '4px' }}>
                                    <RefreshCw size={12} className="spin" />
                                    <span>{aiMode === 'online' ? 'Querying n8n AI Agent...' : 'Gemma 1.5 Lite On-Device Processing...'}</span>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <form
                            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                            style={{
                                padding: '10px 14px',
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
                                    width: '36px',
                                    height: '36px',
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
                                {isListening ? <MicOff size={16} color="#ef4444" /> : <Mic size={16} />}
                            </button>

                            {/* Text Input Field */}
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={isListening ? 'Listening to voice...' : (aiMode === 'online' ? 'Ask n8n AI Webhook agent...' : 'Ask offline Gemma 1.5 (CPR, bleeding, burns)...')}
                                style={{
                                    flex: 1,
                                    padding: '9px 12px',
                                    borderRadius: '10px',
                                    border: '1.5px solid #cbd5e1',
                                    fontSize: '12px',
                                    outline: 'none',
                                    color: '#0f172a'
                                }}
                            />

                            {/* Send Button */}
                            <button
                                type="submit"
                                disabled={!input.trim() || isSending}
                                style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    background: input.trim() && !isSending ? 'linear-gradient(135deg, #0d9488 0%, #0284c7 100%)' : '#e2e8f0',
                                    color: input.trim() && !isSending ? 'white' : '#94a3b8',
                                    border: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: input.trim() && !isSending ? 'pointer' : 'not-allowed',
                                    flexShrink: 0
                                }}
                            >
                                <Send size={15} />
                            </button>
                        </form>

                        {/* Settings & n8n Webhook Configuration Modal */}
                        {showSettingsModal && (
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'rgba(0,0,0,0.6)',
                                backdropFilter: 'blur(4px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '16px',
                                zIndex: 11000
                            }}>
                                <div style={{
                                    background: 'white',
                                    borderRadius: '18px',
                                    padding: '18px',
                                    width: '100%',
                                    maxWidth: '380px',
                                    boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Sliders size={18} color="#0284c7" />
                                            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                                                AI Engine Settings
                                            </h3>
                                        </div>
                                        <button
                                            onClick={() => setShowSettingsModal(false)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                                        >
                                            <X size={16} color="#64748b" />
                                        </button>
                                    </div>

                                    {/* n8n Webhook Configuration Section */}
                                    <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', padding: '10px', marginBottom: '12px', fontSize: '11px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 800, color: '#0369a1', marginBottom: '6px' }}>
                                            <Globe size={13} />
                                            <span>n8n Webhook URL (Online Mode):</span>
                                        </div>
                                        <input
                                            type="url"
                                            value={tempN8nUrl}
                                            onChange={(e) => setTempN8nUrl(e.target.value)}
                                            placeholder="https://your-n8n.app/webhook/health-bot"
                                            style={{
                                                width: '100%',
                                                padding: '7px 10px',
                                                borderRadius: '6px',
                                                border: '1px solid #93c5fd',
                                                fontSize: '11px',
                                                marginBottom: '6px',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                        <button
                                            onClick={handleSaveN8nUrl}
                                            style={{
                                                background: '#0284c7',
                                                color: 'white',
                                                border: 'none',
                                                padding: '5px 10px',
                                                borderRadius: '6px',
                                                fontSize: '10px',
                                                fontWeight: 800,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Save Webhook URL
                                        </button>
                                    </div>

                                    {/* Gemma LiteRT On-Device Info */}
                                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', marginBottom: '12px', fontSize: '11px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ color: '#64748b' }}>Offline Model:</span>
                                            <strong style={{ color: '#0f172a' }}>Gemma LiteRT</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ color: '#64748b' }}>Target Size:</span>
                                            <strong style={{ color: '#0f172a' }}>48 MB (Mobile Fast)</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ color: '#64748b' }}>Installation Status:</span>
                                            <span style={{
                                                background: gemmaState.status === 'READY' ? '#dcfce7' : '#fee2e2',
                                                color: gemmaState.status === 'READY' ? '#15803d' : '#b91c1c',
                                                padding: '1px 5px',
                                                borderRadius: '4px',
                                                fontWeight: 800,
                                                fontSize: '10px'
                                            }}>
                                                {gemmaState.status === 'READY' ? 'INSTALLED & READY' : 'NOT INSTALLED'}
                                            </span>
                                        </div>
                                    </div>

                                    {gemmaState.status === 'READY' ? (
                                        <button
                                            onClick={() => { gemmaEngine.deleteModel(); }}
                                            style={{
                                                width: '100%',
                                                padding: '8px',
                                                borderRadius: '8px',
                                                border: '1px solid #fecaca',
                                                background: '#fef2f2',
                                                color: '#dc2626',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '5px'
                                            }}
                                        >
                                            <Trash2 size={13} /> Reinstall / Clear Gemma LiteRT Cache
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleDownloadGemma}
                                            disabled={gemmaState.isDownloading}
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                borderRadius: '8px',
                                                background: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)',
                                                color: 'white',
                                                border: 'none',
                                                fontSize: '11px',
                                                fontWeight: 800,
                                                cursor: gemmaState.isDownloading ? 'not-allowed' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            <Download size={14} />
                                            <span>{gemmaState.isDownloading ? `Downloading (${gemmaState.progress}%)...` : 'Download Gemma LiteRT (48 MB)'}</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default OfflineHealthHelpBot;
