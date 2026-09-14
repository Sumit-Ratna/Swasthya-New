import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play, Pause, RotateCcw, Volume2, VolumeX,
    Pill, Syringe, Heart, Brain, Activity, Shield, Check, AlertTriangle,
    Stethoscope, Thermometer, User, SkipForward, SkipBack, X, Sparkles, Clock
} from 'lucide-react';

const iconMap = {
    tablet: Pill,
    injection: Syringe,
    lungs: Activity,
    heart: Heart,
    brain: Brain,
    stomach: User,
    blood_vessel: Activity,
    liver: Activity,
    kidney: Activity,
    shield: Shield,
    check: Check,
    warning: AlertTriangle,
    default: Stethoscope
};

const MedicalExplainerVideo = ({ storyboard = [], onClose, medicineName = '' }) => {
    const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [sceneProgress, setSceneProgress] = useState(0);
    const speechRef = useRef(null);
    const progressTimerRef = useRef(null);

    // Ensure we have a valid storyboard array
    const scenes = Array.isArray(storyboard) && storyboard.length > 0 ? storyboard : [
        {
            scene_number: 1,
            title: medicineName ? `Overview: ${medicineName}` : "Medicine Clinical Guide",
            narration: "Swasthya provides real-time animated dosage guidelines, precautions, and verified clinical schedules.",
            visual_description: "Clinical medicine verification animation.",
            main_icon: "tablet",
            duration_seconds: 6
        }
    ];

    const currentScene = scenes[currentSceneIndex] || scenes[0];
    const Icon = iconMap[currentScene?.main_icon] || iconMap.default;
    const sceneDurationSec = currentScene?.duration_seconds || 6;
    const sceneDurationMs = sceneDurationSec * 1000;

    // Speech synthesis helper
    const speakNarration = (text) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;
        try {
            window.speechSynthesis.cancel();
            if (isMuted || !text) return;

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.92;
            utterance.pitch = 1.0;
            utterance.lang = 'en-US';

            utterance.onend = () => {
                // Speech ended naturally
            };
            utterance.onerror = (e) => {
                console.warn('[TTS Notice]', e?.error || 'Speech unavailable');
            };

            speechRef.current = utterance;
            window.speechSynthesis.speak(utterance);
        } catch (err) {
            console.warn('[SpeechSynthesis Exception]', err);
        }
    };

    // Auto-progress timer (Guaranteed playback on all Android WebViews)
    useEffect(() => {
        if (!isPlaying) {
            if (progressTimerRef.current) clearInterval(progressTimerRef.current);
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.pause();
            }
            return;
        }

        // Trigger speech when scene starts
        speakNarration(currentScene.narration);

        setSceneProgress(0);
        const startTime = Date.now();
        const intervalMs = 50;

        if (progressTimerRef.current) clearInterval(progressTimerRef.current);

        progressTimerRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const pct = Math.min(100, (elapsed / sceneDurationMs) * 100);
            setSceneProgress(pct);

            if (elapsed >= sceneDurationMs) {
                clearInterval(progressTimerRef.current);
                handleNextScene();
            }
        }, intervalMs);

        return () => {
            if (progressTimerRef.current) clearInterval(progressTimerRef.current);
        };
    }, [currentSceneIndex, isPlaying, isMuted]);

    // Clean up on component unmount
    useEffect(() => {
        return () => {
            if (progressTimerRef.current) clearInterval(progressTimerRef.current);
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                try {
                    window.speechSynthesis.cancel();
                } catch (e) {
                    // Ignore cancel error on unmount
                }
            }
        };
    }, []);

    const handleNextScene = () => {
        if (currentSceneIndex < scenes.length - 1) {
            setCurrentSceneIndex(prev => prev + 1);
            setSceneProgress(0);
        } else {
            // Video finished
            setIsPlaying(false);
            setSceneProgress(100);
        }
    };

    const handlePrevScene = () => {
        if (currentSceneIndex > 0) {
            setCurrentSceneIndex(prev => prev - 1);
            setSceneProgress(0);
        }
    };

    const togglePlay = () => {
        if (isPlaying) {
            setIsPlaying(false);
        } else {
            if (currentSceneIndex >= scenes.length - 1 && sceneProgress >= 100) {
                setCurrentSceneIndex(0);
                setSceneProgress(0);
            }
            setIsPlaying(true);
            if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            }
        }
    };

    const toggleMute = () => {
        const nextMuted = !isMuted;
        setIsMuted(nextMuted);
        if (nextMuted) {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        } else {
            speakNarration(currentScene.narration);
        }
    };

    const handleJumpToScene = (idx) => {
        setCurrentSceneIndex(idx);
        setSceneProgress(0);
        setIsPlaying(true);
    };

    const handleRestart = () => {
        setCurrentSceneIndex(0);
        setSceneProgress(0);
        setIsPlaying(true);
    };

    return (
        <div 
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(10, 15, 30, 0.96)',
                backdropFilter: 'blur(16px)',
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '14px',
                fontFamily: 'Inter, system-ui, sans-serif'
            }}
        >
            <div 
                style={{
                    width: '100%',
                    maxWidth: '560px',
                    maxHeight: '94vh',
                    background: 'linear-gradient(165deg, #1e1b4b 0%, #0f172a 60%, #020617 100%)',
                    borderRadius: '24px',
                    border: '1px solid rgba(139, 92, 246, 0.35)',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(124, 58, 237, 0.25)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    color: 'white'
                }}
            >
                {/* Video Top Bar */}
                <div style={{
                    padding: '16px 18px 10px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            background: 'rgba(239, 68, 68, 0.2)',
                            color: '#f87171',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            padding: '3px 8px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '0.5px'
                        }}>
                            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: isPlaying ? '#ef4444' : '#94a3b8', animation: isPlaying ? 'pulse 1.5s infinite' : 'none' }} />
                            {isPlaying ? 'PLAYING VIDEO' : 'PAUSED'}
                        </span>
                        <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>
                            Scene {currentSceneIndex + 1} of {scenes.length}
                        </span>
                    </div>

                    <button
                        onClick={() => {
                            if (typeof window !== 'undefined' && window.speechSynthesis) {
                                window.speechSynthesis.cancel();
                            }
                            if (onClose) onClose();
                        }}
                        style={{
                            background: 'rgba(255, 255, 255, 0.12)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Animated Storyboard Stage */}
                <div style={{
                    flex: 1,
                    minHeight: '340px',
                    padding: '24px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    position: 'relative',
                    overflowY: 'auto'
                }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentSceneIndex}
                            initial={{ opacity: 0, scale: 0.92, y: 15 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -15 }}
                            transition={{ duration: 0.45, ease: 'easeOut' }}
                            style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                        >
                            {/* Animated Medical Visual Orb */}
                            <motion.div
                                animate={{
                                    scale: isPlaying ? [1, 1.06, 1] : 1,
                                    boxShadow: isPlaying 
                                        ? ['0 0 25px rgba(124, 58, 237, 0.4)', '0 0 45px rgba(59, 130, 246, 0.6)', '0 0 25px rgba(124, 58, 237, 0.4)']
                                        : '0 0 20px rgba(124, 58, 237, 0.2)'
                                }}
                                transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
                                style={{
                                    width: '100px',
                                    height: '100px',
                                    borderRadius: '50%',
                                    background: 'radial-gradient(circle at 35% 35%, #8b5cf6 0%, #3b82f6 50%, #1e1b4b 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '18px',
                                    position: 'relative'
                                }}
                            >
                                <Icon size={46} color="#ffffff" />
                                {isPlaying && (
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
                                        style={{
                                            position: 'absolute',
                                            top: -6,
                                            left: -6,
                                            right: -6,
                                            bottom: -6,
                                            borderRadius: '50%',
                                            border: '2px dashed rgba(167, 139, 250, 0.5)'
                                        }}
                                    />
                                )}
                            </motion.div>

                            {/* Scene Step & Title */}
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: 'rgba(124, 58, 237, 0.2)',
                                color: '#c4b5fd',
                                padding: '4px 12px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.8px',
                                marginBottom: '10px'
                            }}>
                                <Sparkles size={13} />
                                Step {currentSceneIndex + 1}: {currentScene.title}
                            </div>

                            {/* Main Narration / Subtitle Text */}
                            <p style={{
                                fontSize: '16.5px',
                                lineHeight: '1.55',
                                color: '#f8fafc',
                                fontWeight: 500,
                                margin: '0 0 14px 0',
                                maxWidth: '92%'
                            }}>
                                "{currentScene.narration}"
                            </p>

                            {/* Visual Animation Cue Card */}
                            {currentScene.visual_description && (
                                <div style={{
                                    background: 'rgba(15, 23, 42, 0.65)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderRadius: '12px',
                                    padding: '8px 14px',
                                    fontSize: '12px',
                                    color: '#94a3b8',
                                    maxWidth: '90%'
                                }}>
                                    <strong style={{ color: '#60a5fa' }}>Visual Cue: </strong>
                                    {currentScene.visual_description}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Multi-Scene Progress Bars */}
                <div style={{ padding: '0 18px', display: 'flex', gap: '6px', marginBottom: '8px' }}>
                    {scenes.map((_, idx) => {
                        let fillWidth = '0%';
                        if (idx < currentSceneIndex) fillWidth = '100%';
                        else if (idx === currentSceneIndex) fillWidth = `${sceneProgress}%`;

                        return (
                            <div
                                key={idx}
                                onClick={() => handleJumpToScene(idx)}
                                style={{
                                    flex: 1,
                                    height: '5px',
                                    background: 'rgba(255, 255, 255, 0.15)',
                                    borderRadius: '3px',
                                    overflow: 'hidden',
                                    cursor: 'pointer'
                                }}
                            >
                                <div
                                    style={{
                                        height: '100%',
                                        width: fillWidth,
                                        background: 'linear-gradient(90deg, #8b5cf6, #3b82f6)',
                                        borderRadius: '3px',
                                        transition: idx === currentSceneIndex ? 'width 0.05s linear' : 'width 0.2s ease'
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>

                {/* Video Controls Bar */}
                <div style={{
                    padding: '14px 18px 18px 18px',
                    background: 'rgba(2, 6, 23, 0.85)',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    {/* Left: Prev / Next */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={handlePrevScene}
                            disabled={currentSceneIndex === 0}
                            style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '8px 10px',
                                color: currentSceneIndex === 0 ? '#475569' : 'white',
                                cursor: currentSceneIndex === 0 ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            title="Previous Scene"
                        >
                            <SkipBack size={18} />
                        </button>

                        <button
                            onClick={togglePlay}
                            style={{
                                background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                                border: 'none',
                                borderRadius: '12px',
                                padding: '10px 18px',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontWeight: 700,
                                fontSize: '13.5px',
                                boxShadow: '0 4px 15px rgba(124, 58, 237, 0.4)'
                            }}
                        >
                            {isPlaying ? (
                                <>
                                    <Pause size={17} />
                                    <span>Pause</span>
                                </>
                            ) : (
                                <>
                                    <Play size={17} style={{ fill: 'white' }} />
                                    <span>{currentSceneIndex >= scenes.length - 1 && sceneProgress >= 100 ? 'Replay' : 'Play'}</span>
                                </>
                            )}
                        </button>

                        <button
                            onClick={handleNextScene}
                            disabled={currentSceneIndex >= scenes.length - 1}
                            style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '8px 10px',
                                color: currentSceneIndex >= scenes.length - 1 ? '#475569' : 'white',
                                cursor: currentSceneIndex >= scenes.length - 1 ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            title="Next Scene"
                        >
                            <SkipForward size={18} />
                        </button>
                    </div>

                    {/* Right: Audio / Restart */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={toggleMute}
                            style={{
                                background: isMuted ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                border: isMuted ? '1px solid rgba(239, 68, 68, 0.4)' : 'none',
                                borderRadius: '10px',
                                padding: '8px 10px',
                                color: isMuted ? '#f87171' : 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            title={isMuted ? "Unmute Voice" : "Mute Voice"}
                        >
                            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                        </button>

                        <button
                            onClick={handleRestart}
                            style={{
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: 'none',
                                borderRadius: '10px',
                                padding: '8px 10px',
                                color: 'white',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            title="Restart from Scene 1"
                        >
                            <RotateCcw size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MedicalExplainerVideo;
