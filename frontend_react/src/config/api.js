import axios from 'axios';
import { Capacitor } from '@capacitor/core';

// Detect whether running in native mobile APK or web browser
const isNative = Capacitor.isNativePlatform();
const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

// Primary API endpoint (works for web and Android via adb reverse tcp:8000 tcp:8000)
export const LOCAL_API_URL = 'http://localhost:8000';
export const API_BASE_URL = import.meta.env.VITE_API_URL || LOCAL_API_URL;

// Configure Axios defaults
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.headers.common['Bypass-Tunnel-Reminder'] = 'true';
axios.defaults.headers.common['ngrok-skip-browser-warning'] = 'true';

// Helper to build full asset/media URL
export const getMediaUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE_URL}${cleanPath}`;
};

export default axios;
