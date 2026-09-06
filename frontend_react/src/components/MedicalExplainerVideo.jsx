import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Play, Pause, RotateCcw, Volume2, VolumeX,
    Pill, Syringe, Heart, Brain, Activity, Shield, Check, AlertTriangle,
    Stethoscope, Thermometer, User, ArrowRight
} from 'lucide-react';

const iconMap = {
    tablet: Pill,
    injection: Syringe,
    lungs: Activity, // Fallback
    heart: Heart,
    brain: Brain,
    stomach: User, // Approximate
    blood_vessel: Activity,
    liver: Activity,
    kidney: Activity,
    shield: Shield,
    check: Check,
    warning: AlertTriangle,
    default: Stethoscope
};

const MedicalExplainerVideo = ({ storyboard, onClose }) => {
    const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const speechRef = useRef(null);

    const currentScene = storyboard[currentSceneIndex];
    const Icon = iconMap[currentScene?.main_icon] || iconMap.default;

    useEffect(() => {
        if (isPlaying && currentScene) {
            handleSpeak(currentScene.narration);
            // No timeout here; handled by speech onend event
        } else if (!isPlaying) {
            window.speechSynthesis.pause();
        }
    }, [currentSceneIndex, isPlaying]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            window.speechSynthesis.cancel();
        };
    }, []);

    const handleSpeak = (text, muted = isMuted) => {
        if (speechRef.current) {
            window.speechSynthesis.cancel();
        }

        // If muted or no text, fallback to timer
        if (muted || !text) {
            const timerMs = (currentScene?.duration_seconds || 5) * 1000;
            const timer = setTimeout(() => {
                if (isPlaying) nextScene();
            }, timerMs);
            // Store timer ID if needed for cleanup, though checking isPlaying helps
            return;
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1.0;

        utterance.onend = () => {
            if (isPlaying) {
                nextScene();
            }
        };

        speechRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    };

    const nextScene = () => {
        if (currentSceneIndex < storyboard.length - 1) {
            setCurrentSceneIndex(prev => prev + 1);
        } else {
            setIsPlaying(false); // End of video
        }
    };

    const prevScene = () => {
        if (currentSceneIndex > 0) {
            setCurrentSceneIndex(prev => prev - 1);
        }
    };

    const handleSeek = (e) => {
        const progressBar = e.currentTarget;
        const rect = progressBar.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const width = rect.width;
        const percentage = offsetX / width;

        const newIndex = Math.min(
            Math.max(0, Math.floor(percentage * storyboard.length)),
            storyboard.length - 1
        );

        setCurrentSceneIndex(newIndex);
        window.speechSynthesis.cancel(); // Stop current speech when seeking
    };

    const togglePlay = () => {
        if (isPlaying) {
            setIsPlaying(false);
            window.speechSynthesis.pause(); // Pause speech
        } else {
            setIsPlaying(true);
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume(); // Resume if paused
            } else {
                // If stopped or finished, restart current scene speech
                handleSpeak(currentScene?.narration);
            }

            // Restart if at end
            if (currentSceneIndex === storyboard.length - 1) {
                setCurrentSceneIndex(0);
            }
        }
    };

    const toggleMute = () => {
        const newMutedState = !isMuted;
        setIsMuted(newMutedState);

        if (newMutedState) {
            window.speechSynthesis.cancel();
        } else {
            // Restart speech if unmuted while playing
            if (isPlaying) {
                handleSpeak(currentScene?.narration, false);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.95)', color: 'white', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

            <div style={{ width: '90%', maxWidth: '800px', aspectRatio: '16/9', background: '#1C1C1E', borderRadius: '24px', overflow: 'hidden', position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>

                {/* Scene Content */}
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={currentSceneIndex}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.8, ease: "easeInOut" }}
                        style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center' }}
                    >
                        <div style={{
                            fontSize: '18px',
                            textTransform: 'uppercase',
                            letterSpacing: '2px',
                            color: '#0A84FF',
                            marginBottom: '20px'
                        }}>
                            Scene {currentSceneIndex + 1}: {currentScene.title}
                        </div>

                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            style={{
                                background: 'linear-gradient(135deg, #323232 0%, #1c1c1e 100%)',
                                width: '150px',
                                height: '150px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: '30px',
                                boxShadow: '0 10px 30px rgba(10, 132, 255, 0.3)'
                            }}
                        >
                            <Icon size={80} color="#0A84FF" />
                        </motion.div>

                        <h2 style={{ fontSize: '32px', marginBottom: '16px', fontWeight: 600 }}>
                            {currentScene.title}
                        </h2>

                        <p style={{ fontSize: '20px', lineHeight: '1.6', color: '#E5E5EA', maxWidth: '80%' }}>
                            {currentScene.narration}
                        </p>

                        {/* Visual Cues (Simulated Animation) */}
                        <div style={{ marginTop: '20px', fontSize: '14px', color: '#636366', fontStyle: 'italic' }}>
                            (Visual: {currentScene.visual_description})
                        </div>

                    </motion.div>
                </AnimatePresence>

                {/* Controls Overlay */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '24px', background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button onClick={togglePlay} style={{ background: 'white', border: 'none', borderRadius: '50%', width: '48px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            {isPlaying ? <Pause size={24} color="black" /> : <Play size={24} color="black" style={{ marginLeft: '4px' }} />}
                        </button>

                        <button onClick={toggleMute} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </button>

                        <button onClick={() => { setCurrentSceneIndex(0); setIsPlaying(true); }} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                            <RotateCcw size={20} />
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div
                        onClick={handleSeek}
                        style={{
                            flex: 1,
                            margin: '0 24px',
                            height: '8px', // Thicker for easier clicking
                            background: 'rgba(255,255,255,0.2)',
                            borderRadius: '4px',
                            position: 'relative',
                            cursor: 'pointer'
                        }}
                    >
                        <motion.div
                            style={{
                                height: '100%',
                                background: '#0A84FF',
                                borderRadius: '4px',
                                width: `${((currentSceneIndex + 1) / storyboard.length) * 100}%`
                            }}
                            layout
                        />
                    </div>

                    <div style={{ color: '#8E8E93', fontSize: '14px', fontWeight: 600 }}>
                        {currentSceneIndex + 1} / {storyboard.length}
                    </div>

                </div>

                <button
                    onClick={() => {
                        window.speechSynthesis.cancel();
                        onClose();
                    }}
                    style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', color: 'white', cursor: 'pointer', fontSize: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    &times;
                </button>
            </div>

        </div>
    );
};

export default MedicalExplainerVideo;
