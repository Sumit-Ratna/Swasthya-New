import React, { useEffect, useState } from 'react';
import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { MapPin, Camera as CameraIcon, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';

export default function AppPermissionsModal() {
    const [showPrompt, setShowPrompt] = useState(false);
    const [status, setStatus] = useState({
        location: 'prompt', // 'prompt' | 'granted' | 'denied'
        camera: 'prompt'
    });
    const [requesting, setRequesting] = useState(false);

    useEffect(() => {
        const checkInitialPermissions = async () => {
            const hasRequestedBefore = localStorage.getItem('swasthya_initial_permissions_prompted');
            
            // On native Capacitor, trigger native permission dialogs directly on first app launch
            if (Capacitor.isNativePlatform()) {
                try {
                    const camStatus = await Camera.checkPermissions();
                    const geoStatus = await Geolocation.checkPermissions();
                    
                    const isCamGranted = camStatus.camera === 'granted';
                    const isGeoGranted = geoStatus.location === 'granted';

                    setStatus({
                        camera: isCamGranted ? 'granted' : 'prompt',
                        location: isGeoGranted ? 'granted' : 'prompt'
                    });

                    // If not granted and first time, automatically request native permissions
                    if (!isCamGranted || !isGeoGranted) {
                        if (!hasRequestedBefore) {
                            requestAllPermissions();
                        } else {
                            setShowPrompt(true);
                        }
                    }
                } catch (e) {
                    console.warn('[PERMISSIONS] Native check error:', e);
                }
            } else {
                // On Web / PWA
                if (!hasRequestedBefore) {
                    setShowPrompt(true);
                }
            }
        };

        checkInitialPermissions();
    }, []);

    const requestAllPermissions = async () => {
        setRequesting(true);
        localStorage.setItem('swasthya_initial_permissions_prompted', 'true');
        
        let camGranted = false;
        let locGranted = false;

        // 1. Request Native / Web Location
        try {
            if (Capacitor.isNativePlatform()) {
                const geoRes = await Geolocation.requestPermissions();
                locGranted = geoRes.location === 'granted';
            } else if (navigator.geolocation) {
                await new Promise((resolve) => {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            locGranted = true;
                            resolve(pos);
                        },
                        (err) => {
                            console.warn('[PERMISSIONS] Web Geolocation denied or dismissed:', err.message);
                            resolve(null);
                        },
                        { timeout: 8000, enableHighAccuracy: true }
                    );
                });
            }
        } catch (err) {
            console.warn('[PERMISSIONS] Location request error:', err);
        }

        // 2. Request Native / Web Camera
        try {
            if (Capacitor.isNativePlatform()) {
                const camRes = await Camera.requestPermissions();
                camGranted = camRes.camera === 'granted';
            } else if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                    camGranted = true;
                    // Immediately release camera track
                    stream.getTracks().forEach(track => track.stop());
                } catch (camErr) {
                    console.warn('[PERMISSIONS] Web Camera denied or dismissed:', camErr.message);
                }
            }
        } catch (err) {
            console.warn('[PERMISSIONS] Camera request error:', err);
        }

        setStatus({
            location: locGranted ? 'granted' : 'denied',
            camera: camGranted ? 'granted' : 'denied'
        });

        setRequesting(false);
        // Automatically close prompt after 1.2 seconds if successfully requested
        setTimeout(() => {
            setShowPrompt(false);
        }, 1200);
    };

    const handleDismiss = () => {
        localStorage.setItem('swasthya_initial_permissions_prompted', 'true');
        setShowPrompt(false);
    };

    if (!showPrompt) return null;

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'fadeIn 0.3s ease'
        }}>
            <div style={{
                background: '#ffffff',
                borderRadius: '24px',
                maxWidth: '460px',
                width: '100%',
                padding: '28px 24px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(226, 232, 240, 0.8)',
                textAlign: 'center'
            }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '20px',
                    background: 'linear-gradient(135deg, #0d9488, #059669)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                    boxShadow: '0 10px 20px -5px rgba(13, 148, 136, 0.4)'
                }}>
                    <ShieldCheck size={36} color="#ffffff" />
                </div>

                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>
                    Permissions Required
                </h3>
                <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 20px', lineHeight: 1.5 }}>
                    Swasthya needs Location and Camera access to find nearest health centres and scan lab reports/prescriptions.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px', textAlign: 'left' }}>
                    {/* Location Feature */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        padding: '12px 14px',
                        borderRadius: '14px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0'
                    }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: '#e0f2fe',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <MapPin size={22} color="#0284c7" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1e293b' }}>
                                Location Permission
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                To locate nearby PHCs, CHCs & emergency referral centres
                            </div>
                        </div>
                        {status.location === 'granted' && (
                            <CheckCircle2 size={20} color="#10b981" />
                        )}
                    </div>

                    {/* Camera Feature */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '14px',
                        padding: '12px 14px',
                        borderRadius: '14px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0'
                    }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '10px',
                            background: '#f0fdf4',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <CameraIcon size={22} color="#16a34a" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1e293b' }}>
                                Camera Permission
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                                To scan prescriptions, QR codes & upload medical docs
                            </div>
                        </div>
                        {status.camera === 'granted' && (
                            <CheckCircle2 size={20} color="#10b981" />
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button
                        onClick={requestAllPermissions}
                        disabled={requesting}
                        style={{
                            width: '100%',
                            padding: '14px',
                            borderRadius: '14px',
                            border: 'none',
                            background: 'linear-gradient(135deg, #0d9488, #059669)',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            cursor: requesting ? 'not-allowed' : 'pointer',
                            boxShadow: '0 8px 16px -4px rgba(13, 148, 136, 0.4)',
                            transition: 'transform 0.15s ease'
                        }}
                    >
                        {requesting ? 'Requesting Permissions...' : (
                            <>
                                <span>Allow Location & Camera</span>
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleDismiss}
                        style={{
                            width: '100%',
                            padding: '10px',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'transparent',
                            color: '#64748b',
                            fontWeight: 600,
                            fontSize: '0.88rem',
                            cursor: 'pointer'
                        }}
                    >
                        Maybe Later
                    </button>
                </div>
            </div>
        </div>
    );
}
