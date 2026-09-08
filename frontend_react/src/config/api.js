import axios from 'axios';
import { Capacitor } from '@capacitor/core';

// Detect whether running in native mobile APK or web browser
const isNative = Capacitor.isNativePlatform();
const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

// Developer Machine LAN IP for physical device over local Wi-Fi
export const DEV_LAN_IP = '10.10.158.164';
export const LOCAL_API_URL = isNative ? `http://127.0.0.1:8000` : 'http://localhost:8000';

// In production cloud deployment, relative API requests seamlessly target origin.
// In native mobile app (Capacitor), default to local backend via adb reverse / LAN.
const getFallbackApiUrl = () => {
    if (isNative) return 'http://127.0.0.1:8000';
    if (typeof window !== 'undefined' && !isLocalhost) return '';
    return 'http://localhost:8000';
};

// Configurable API Base URL via environment or fallback
export const API_BASE_URL = import.meta.env.VITE_API_URL !== undefined 
    ? import.meta.env.VITE_API_URL 
    : getFallbackApiUrl();

// Configure Axios defaults
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.headers.common['Bypass-Tunnel-Reminder'] = 'true';
axios.defaults.headers.common['ngrok-skip-browser-warning'] = 'true';

// Request Interceptor: Attach diagnostic logging & token
axios.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token && !config.headers['Authorization']) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        console.log(`[API CALL -> BACKEND] ${config.method?.toUpperCase()} ${config.baseURL || ''}${config.url}`);
        return config;
    },
    (error) => {
        console.error('[API REQUEST ERROR]', error);
        return Promise.reject(error);
    }
);

// Response Interceptor: Log errors with clear diagnostic info
axios.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        const method = error.config?.method?.toUpperCase() || 'REQUEST';
        const url = `${error.config?.baseURL || ''}${error.config?.url || ''}`;
        const status = error.response?.status || 'NETWORK_FAILED';
        console.warn(`[API ERROR ${status}] ${method} ${url}:`, error.response?.data?.error || error.message);
        return Promise.reject(error);
    }
);

// Helper to build full asset/media URL
export const getMediaUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE_URL}${cleanPath}`;
};

export default axios;
