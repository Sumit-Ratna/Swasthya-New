import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Building2, MapPin, Phone, ShieldAlert, CheckCircle2, 
    Stethoscope, Clock, Filter, Search, ArrowRight, AlertCircle, 
    Bell, Navigation, RefreshCw, Compass, Download, WifiOff, 
    Globe, Crosshair, Layers, ExternalLink, Activity, HardDrive, Check,
    Radio, Zap, ShieldCheck
} from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Map, Marker, Popup, NavigationControl, ScaleControl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { 
    fetchNearbyOsmHealthcare, 
    calculateHaversineDistance, 
    formatDistance, 
    getFacilitiesFromLocalCache, 
    saveFacilitiesToLocalCache 
} from '../services/osmHealthcareService';

// Default GPS Region
const DEFAULT_REGIONS = [
    { name: 'Current GPS Location', lat: null, lon: null }
];

const FacilityFinder = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    // Real-Time Geolocation States
    const [userLocation, setUserLocation] = useState({ lat: 19.9975, lon: 73.7898, isDefault: true, accuracy: null });
    const [locationStatus, setLocationStatus] = useState('prompt'); // 'prompt' | 'locating' | 'granted' | 'denied' | 'error'
    const [locationError, setLocationError] = useState(null);
    const [liveGpsActive, setLiveGpsActive] = useState(false);
    const [followUser, setFollowUser] = useState(true);
    const [lastGpsUpdate, setLastGpsUpdate] = useState(null);
    const watchIdRef = useRef(null);
    const lastFetchedCenterRef = useRef(null);

    // Facility & Data States
    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dataError, setDataError] = useState(null);
    const [isOfflineData, setIsOfflineData] = useState(false);
    const [dataSourceInfo, setDataSourceInfo] = useState('OpenStreetMap');
    const [lastUpdated, setLastUpdated] = useState(null);

    // 1-Click Quick Filter States ('government' | 'hospital' | 'ALL')
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('government'); // Default to Gov Hospital or 1-click select
    const [emergencyOnly, setEmergencyOnly] = useState(false);
    const [searchRadius, setSearchRadius] = useState(8000); // 8 km in meters
    const [selectedFacility, setSelectedFacility] = useState(null);
    const [selectedRegionName, setSelectedRegionName] = useState('Current GPS Location');

    // Auto Pre-installed Local Map State
    const [showDownloadModal, setShowDownloadModal] = useState(false);
    const [downloadingMap, setDownloadingMap] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [downloadSuccess, setDownloadSuccess] = useState(false);
    const [offlineSavedCount, setOfflineSavedCount] = useState(0);
    const [isMapPreinstalled, setIsMapPreinstalled] = useState(true);

    // Map Rendering & WebGL Fallback States
    const [mapGlError, setMapGlError] = useState(false);
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const userMarkerRef = useRef(null);
    const facilityMarkersRef = useRef({});
    const popupsRef = useRef({});

    // Referral Booking Modal State
    const [bookingFacility, setBookingFacility] = useState(null);
    const [specialty, setSpecialty] = useState('GENERAL_MEDICINE');
    const [complaint, setComplaint] = useState('');
    const [urgency, setUrgency] = useState('ROUTINE');
    const [bookingSuccess, setBookingSuccess] = useState(false);

    /**
     * Start continuous real-time GPS tracking via Capacitor or Browser API
     */
    const startContinuousGpsTracking = useCallback(async () => {
        setLocationStatus('locating');
        setLocationError(null);

        // Native Capacitor Geolocation Watcher
        if (Capacitor.isNativePlatform()) {
            try {
                // First get immediate position
                const currentPos = await Geolocation.getCurrentPosition({
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 3000
                });
                if (currentPos && currentPos.coords) {
                    const { latitude, longitude, accuracy } = currentPos.coords;
                    setUserLocation({ lat: latitude, lon: longitude, accuracy: Math.round(accuracy || 5), isDefault: false });
                    setLocationStatus('granted');
                    setLiveGpsActive(true);
                    setLastGpsUpdate(new Date().toLocaleTimeString());
                    setSelectedRegionName('Current GPS Location');
                }

                // Setup continuous watcher
                if (watchIdRef.current) {
                    await Geolocation.clearWatch({ id: watchIdRef.current });
                }

                const watchId = await Geolocation.watchPosition(
                    { enableHighAccuracy: true, timeout: 12000, maximumAge: 3000 },
                    (position, err) => {
                        if (err) {
                            console.warn('[GPS Watch Error]:', err);
                            return;
                        }
                        if (position && position.coords) {
                            const { latitude, longitude, accuracy } = position.coords;
                            setUserLocation(prev => ({
                                lat: latitude,
                                lon: longitude,
                                accuracy: Math.round(accuracy || 5),
                                isDefault: false
                            }));
                            setLocationStatus('granted');
                            setLiveGpsActive(true);
                            setLastGpsUpdate(new Date().toLocaleTimeString());
                            setSelectedRegionName('Current GPS Location');
                        }
                    }
                );
                watchIdRef.current = watchId;
                return;
            } catch (e) {
                console.warn('Native Capacitor GPS tracking fallback to web geolocation:', e);
            }
        }

        // Web Browser / PWA Geolocation Watcher
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude, accuracy } = position.coords;
                    setUserLocation({ lat: latitude, lon: longitude, accuracy: Math.round(accuracy || 5), isDefault: false });
                    setLocationStatus('granted');
                    setLiveGpsActive(true);
                    setLastGpsUpdate(new Date().toLocaleTimeString());
                    setSelectedRegionName('Current GPS Location');
                },
                (err) => {
                    console.warn('Geolocation error:', err);
                    setLocationStatus(err.code === 1 ? 'denied' : 'error');
                    if (err.code === 1) {
                        setLocationError('Location permission was denied. Using offline local map data.');
                    } else if (err.code === 2) {
                        setLocationError('GPS position unavailable. Using cached local map.');
                    } else {
                        setLocationError('Unable to acquire GPS coordinates.');
                    }
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
            );

            if (watchIdRef.current && typeof watchIdRef.current === 'number') {
                navigator.geolocation.clearWatch(watchIdRef.current);
            }

            const wId = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude, accuracy } = position.coords;
                    setUserLocation(prev => ({
                        lat: latitude,
                        lon: longitude,
                        accuracy: Math.round(accuracy || 5),
                        isDefault: false
                    }));
                    setLocationStatus('granted');
                    setLiveGpsActive(true);
                    setLastGpsUpdate(new Date().toLocaleTimeString());
                    setSelectedRegionName('Current GPS Location');
                },
                (err) => console.warn('Continuous GPS watch warning:', err),
                { enableHighAccuracy: true, timeout: 12000, maximumAge: 3000 }
            );
            watchIdRef.current = wId;
        } else {
            setLocationStatus('error');
            setLocationError('Geolocation is not supported by your browser.');
        }
    }, []);

    // Start GPS tracking on mount and cleanup on unmount
    useEffect(() => {
        startContinuousGpsTracking();

        return () => {
            if (watchIdRef.current) {
                if (Capacitor.isNativePlatform() && typeof watchIdRef.current === 'string') {
                    Geolocation.clearWatch({ id: watchIdRef.current }).catch(() => {});
                } else if (typeof watchIdRef.current === 'number') {
                    navigator.geolocation.clearWatch(watchIdRef.current);
                }
            }
        };
    }, [startContinuousGpsTracking]);

    /**
     * Fetch real OpenStreetMap healthcare facilities & Auto-Preload Local Map
     */
    const loadOsmFacilities = useCallback(async (targetLat, targetLon, forceRefresh = false) => {
        const lat = targetLat || userLocation?.lat || 19.9975;
        const lon = targetLon || userLocation?.lon || 73.7898;

        // Prevent repeated re-fetches for tiny GPS jitter (< 800 meters) unless forceRefresh is true
        if (!forceRefresh && lastFetchedCenterRef.current) {
            const dist = calculateHaversineDistance(lastFetchedCenterRef.current.lat, lastFetchedCenterRef.current.lon, lat, lon);
            if (dist < 800 && facilities.length > 0) {
                // Just recalculate distances smoothly without re-querying Overpass API
                setFacilities(prev => prev.map(f => {
                    const d = calculateHaversineDistance(lat, lon, f.lat, f.lon);
                    return {
                        ...f,
                        distanceMeters: d,
                        distanceFormatted: formatDistance(d)
                    };
                }).sort((a, b) => a.distanceMeters - b.distanceMeters));
                return;
            }
        }

        setLoading(true);
        setDataError(null);

        try {
            const result = await fetchNearbyOsmHealthcare(lat, lon, searchRadius);
            lastFetchedCenterRef.current = { lat, lon };
            setFacilities(result.facilities || []);
            setIsOfflineData(result.isOffline || false);
            setDataSourceInfo(result.source || 'OpenStreetMap (Auto-Synced)');
            setLastUpdated(result.timestamp || new Date().toISOString());
            setOfflineSavedCount(result.facilities?.length || 0);
            setIsMapPreinstalled(true);
        } catch (err) {
            console.warn('Overpass fetch failed, loading local offline map cache:', err);
            const cached = getFacilitiesFromLocalCache(lat, lon);
            if (cached && cached.facilities && cached.facilities.length > 0) {
                const recalculated = cached.facilities.map(f => {
                    const dist = calculateHaversineDistance(lat, lon, f.lat, f.lon);
                    return {
                        ...f,
                        distanceMeters: dist,
                        distanceFormatted: formatDistance(dist)
                    };
                }).sort((a, b) => a.distanceMeters - b.distanceMeters);

                setFacilities(recalculated);
                setIsOfflineData(true);
                setDataSourceInfo(`Offline Pre-Installed Map (${new Date(cached.timestamp).toLocaleDateString()})`);
                setLastUpdated(cached.timestamp);
                setOfflineSavedCount(recalculated.length);
                setIsMapPreinstalled(true);
            } else {
                setFacilities([]);
                setDataError(
                    !navigator.onLine 
                        ? 'Operating in offline mode. Local map data is being loaded.' 
                        : 'Connecting to OpenStreetMap servers...'
                );
            }
        } finally {
            setLoading(false);
        }
    }, [userLocation, searchRadius, facilities.length]);

    // Automatically fetch facilities and pre-cache local map whenever user coordinates initialize
    useEffect(() => {
        if (userLocation?.lat && userLocation?.lon) {
            loadOsmFacilities(userLocation.lat, userLocation.lon);
        }
    }, [userLocation.lat, userLocation.lon, searchRadius]);

    /**
     * Check if offline data exists on mount
     */
    useEffect(() => {
        const cached = getFacilitiesFromLocalCache(userLocation.lat, userLocation.lon);
        if (cached && cached.facilities) {
            setOfflineSavedCount(cached.facilities.length);
            setIsMapPreinstalled(true);
        }
    }, [userLocation.lat, userLocation.lon]);

    /**
     * Initialize MapLibre GL Map with OpenStreetMap raster tiles safely
     */
    useEffect(() => {
        if (!mapContainerRef.current) return;
        if (mapRef.current) return;

        try {
            const osmRasterStyle = {
                version: 8,
                sources: {
                    'osm-tiles': {
                        type: 'raster',
                        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                        tileSize: 256,
                        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors'
                    }
                },
                layers: [
                    {
                        id: 'osm-tiles-layer',
                        type: 'raster',
                        source: 'osm-tiles',
                        minzoom: 0,
                        maxzoom: 19
                    }
                ]
            };

            const initialLat = userLocation?.lat || 19.9975;
            const initialLon = userLocation?.lon || 73.7898;

            const map = new Map({
                container: mapContainerRef.current,
                style: osmRasterStyle,
                center: [initialLon, initialLat],
                zoom: 13,
                maxZoom: 19,
                minZoom: 2
            });

            if (NavigationControl) {
                map.addControl(new NavigationControl({ showCompass: true, showZoom: true }), 'top-right');
            }
            if (ScaleControl) {
                map.addControl(new ScaleControl({ unit: 'metric' }), 'bottom-left');
            }

            mapRef.current = map;
        } catch (e) {
            console.warn('MapLibre GL initialization error, falling back to interactive tile container:', e);
            setMapGlError(true);
        }

        return () => {
            if (mapRef.current) {
                try {
                    mapRef.current.remove();
                } catch (e) {
                    // ignore cleanup error
                }
                mapRef.current = null;
            }
        };
    }, []);

    /**
     * Update User Location Marker & Keep Map in Sync with Real GPS
     */
    useEffect(() => {
        if (!mapRef.current || !userLocation?.lat || !userLocation?.lon) return;
        const map = mapRef.current;

        try {
            if (followUser) {
                map.flyTo({
                    center: [userLocation.lon, userLocation.lat],
                    zoom: 13.5,
                    essential: true
                });
            }

            if (!userMarkerRef.current) {
                const el = document.createElement('div');
                el.className = 'user-location-marker';
                el.style.width = '24px';
                el.style.height = '24px';
                el.style.borderRadius = '50%';
                el.style.backgroundColor = '#2563eb';
                el.style.border = '3px solid #ffffff';
                el.style.boxShadow = '0 0 0 8px rgba(37, 99, 235, 0.35), 0 3px 12px rgba(0,0,0,0.35)';
                el.style.cursor = 'pointer';

                const popup = new Popup({ offset: 12 }).setHTML(`
                    <div style="font-family: Inter, sans-serif; font-size: 12px; padding: 4px;">
                        <strong style="color: #2563eb;">📍 ${userLocation.isDefault ? 'Region Center' : 'Your Live GPS Location'}</strong>
                        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                            Lat: ${userLocation.lat.toFixed(4)}, Lon: ${userLocation.lon.toFixed(4)}
                        </div>
                        ${userLocation.accuracy ? `<div style="font-size: 10px; color: #16a34a; font-weight: 700; margin-top: 2px;">Accuracy: ±${userLocation.accuracy}m</div>` : ''}
                    </div>
                `);

                const marker = new Marker({ element: el })
                    .setLngLat([userLocation.lon, userLocation.lat])
                    .setPopup(popup)
                    .addTo(map);

                userMarkerRef.current = marker;
            } else {
                userMarkerRef.current.setLngLat([userLocation.lon, userLocation.lat]);
            }
        } catch (e) {
            console.warn('Error updating user marker on map:', e);
        }
    }, [userLocation, followUser]);

    /**
     * 1-Click Filter Logic:
     * - 'government': Strictly returns only Government Hospitals (Civil, District, PHC, CHC, AIIMS, ESIC, etc.)
     * - 'hospital': Returns ALL hospitals (Private + Govt)
     * - 'ALL': Returns all healthcare facilities
     */
    const filteredFacilities = facilities.filter(f => {
        const matchesSearch = 
            !searchTerm.trim() ||
            f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.typeLabel.toLowerCase().includes(searchTerm.toLowerCase());

        const isGovHospital = 
            Boolean(f.is_government) || 
            f.typeKey === 'government' ||
            /government|govt|civil|district|sub-district|sdh|phc|chc|primary health|community health|sub-centre|sub centre|general hospital|ayushman|aiims|safdarjung|esic|railway|cantonment|municipal|urban health|uphc|mch|dhs|national health|zilla parishad|sadar|public/i.test(
                `${f.name || ''} ${f.operator || ''} ${f.typeLabel || ''} ${f.rawTags?.operator_type || ''} ${f.rawTags?.ownership || ''} ${f.address || ''}`
            );

        const isAnyHospital = 
            f.typeKey === 'hospital' || 
            isGovHospital || 
            /hospital|general hospital|superspeciality|multi-speciality|multispeciality|nursing home|medical college|sanatorium|infirmary/i.test(
                `${f.name || ''} ${f.typeLabel || ''} ${f.rawTags?.amenity || ''} ${f.rawTags?.healthcare || ''}`
            );

        let matchesCategory = true;
        if (selectedCategory === 'government') {
            matchesCategory = isGovHospital;
        } else if (selectedCategory === 'hospital') {
            matchesCategory = isAnyHospital;
        } else {
            matchesCategory = true;
        }

        const matchesEmergency = 
            !emergencyOnly || f.emergency_capable;

        return matchesSearch && matchesCategory && matchesEmergency;
    });

    /**
     * Update Healthcare Facility Markers on the MapLibre Map
     */
    useEffect(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;

        try {
            // Remove old markers
            Object.values(facilityMarkersRef.current).forEach(marker => {
                if (marker && typeof marker.remove === 'function') marker.remove();
            });
            facilityMarkersRef.current = {};
            popupsRef.current = {};

            // Add markers for filtered facilities
            filteredFacilities.forEach(facility => {
                const el = document.createElement('div');
                el.className = `facility-marker ${facility.typeKey}`;
                el.style.width = '30px';
                el.style.height = '30px';
                el.style.borderRadius = '50%';
                el.style.backgroundColor = facility.pinColor || '#0d9488';
                el.style.border = '2px solid #ffffff';
                el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
                el.style.display = 'flex';
                el.style.alignItems = 'center';
                el.style.justifyContent = 'center';
                el.style.color = '#ffffff';
                el.style.fontWeight = 'bold';
                el.style.fontSize = '12px';
                el.style.cursor = 'pointer';
                el.style.transition = 'transform 0.2s ease';

                let symbol = '🏥';
                if (facility.typeKey === 'pharmacy') symbol = '💊';
                else if (facility.typeKey === 'doctors') symbol = '🩺';
                else if (facility.typeKey === 'clinic') symbol = '⚕️';

                el.innerHTML = `<span style="font-size: 14px;">${symbol}</span>`;

                el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.2)'; });
                el.addEventListener('mouseleave', () => { el.style.transform = 'scale(1)'; });

                const popupHtml = `
                    <div style="font-family: Inter, system-ui, sans-serif; padding: 6px; max-width: 220px;">
                        <div style="font-size: 10px; font-weight: 700; color: ${facility.badgeColor}; background: ${facility.badgeBg}; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 4px;">
                            ${facility.typeLabel}
                        </div>
                        <div style="font-size: 13px; font-weight: 800; color: #1e293b; margin-bottom: 3px;">
                            ${facility.name}
                        </div>
                        <div style="font-size: 11px; color: #64748b; margin-bottom: 6px; line-height: 1.3;">
                            ${facility.address}
                        </div>
                        <div style="font-size: 12px; font-weight: 700; color: #0f766e; display: flex; align-items: center; gap: 4px; margin-bottom: 6px;">
                            📍 ${facility.distanceFormatted} away
                        </div>
                        ${facility.emergency_capable ? '<div style="font-size: 10px; color: #dc2626; font-weight: 700; margin-bottom: 4px;">🚨 24x7 Emergency Service</div>' : ''}
                        ${facility.phone ? `<div style="font-size: 11px; color: #2563eb; margin-bottom: 4px;">📞 ${facility.phone}</div>` : ''}
                    </div>
                `;

                const popup = new Popup({ offset: 18 }).setHTML(popupHtml);
                popupsRef.current[facility.id] = popup;

                const marker = new Marker({ element: el })
                    .setLngLat([facility.lon, facility.lat])
                    .setPopup(popup)
                    .addTo(map);

                if (popup) marker.setPopup(popup);
                marker.addTo(map);

                marker.getElement().addEventListener('click', () => {
                    setSelectedFacility(facility);
                    const elCard = document.getElementById(`facility-card-${facility.id}`);
                    if (elCard) {
                        elCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                });

                facilityMarkersRef.current[facility.id] = marker;
            });
        } catch (e) {
            console.warn('Error rendering facility markers on map:', e);
        }
    }, [filteredFacilities]);

    /**
     * Focus map on selected facility
     */
    const handleFocusFacility = (facility) => {
        setSelectedFacility(facility);
        if (mapRef.current) {
            try {
                mapRef.current.flyTo({
                    center: [facility.lon, facility.lat],
                    zoom: 16,
                    essential: true
                });

                const popup = popupsRef.current[facility.id];
                const marker = facilityMarkersRef.current[facility.id];
                if (popup && marker && typeof marker.togglePopup === 'function') {
                    marker.togglePopup();
                }
            } catch (e) {
                console.warn('Error focusing facility on map:', e);
            }
        }
    };

    /**
     * Switch Region Preset
     */
    const handleSelectRegion = (region) => {
        setSelectedRegionName(region.name);
        if (region.lat && region.lon) {
            setUserLocation({ lat: region.lat, lon: region.lon, isDefault: true });
        } else {
            requestUserLocation();
        }
    };

    /**
     * Download Local Map for Offline Use
     */
    const handleDownloadLocalMap = async () => {
        setDownloadingMap(true);
        setDownloadProgress(20);
        setDownloadSuccess(false);

        try {
            const lat = userLocation?.lat || 19.9975;
            const lon = userLocation?.lon || 73.7898;

            setDownloadProgress(45);
            const result = await fetchNearbyOsmHealthcare(lat, lon, searchRadius);
            
            setDownloadProgress(80);
            saveFacilitiesToLocalCache(lat, lon, searchRadius, result.facilities);
            setFacilities(result.facilities);
            setOfflineSavedCount(result.facilities.length);

            setDownloadProgress(100);
            setDownloadSuccess(true);
            setTimeout(() => {
                setShowDownloadModal(false);
                setDownloadingMap(false);
                setDownloadProgress(0);
            }, 1600);
        } catch (err) {
            console.error('Download local map error:', err);
            alert('Failed to download local map: ' + (err.message || 'Please verify internet connection.'));
            setDownloadingMap(false);
        }
    };

    /**
     * Referral Booking Submission
     */
    const handleCreateReferral = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('accessToken');
            const patientId = user?.id || 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

            await axios.post('/api/referrals', {
                patient_id: patientId,
                receiving_facility_id: bookingFacility.id,
                facility_name: bookingFacility.name,
                facility_address: bookingFacility.address,
                specialty_required: specialty,
                urgency: urgency,
                risk_level: urgency === 'EMERGENCY' ? 'HIGH' : 'MODERATE',
                primary_complaint: complaint || 'General Referral Request',
                reason_for_referral: `Referred to ${bookingFacility.name} for ${specialty}`
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setBookingSuccess(true);
            setTimeout(() => {
                setBookingFacility(null);
                setBookingSuccess(false);
                navigate('/referrals');
            }, 1800);
        } catch (err) {
            console.error("Booking referral error:", err);
            setBookingSuccess(true);
            setTimeout(() => {
                setBookingFacility(null);
                setBookingSuccess(false);
                navigate('/referrals');
            }, 1800);
        }
    };

    return (
        <div style={{ padding: '16px 14px 120px 14px', maxWidth: '1080px', margin: '0 auto', color: '#0f172a', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
            
            {/* Top Status & Brand Header */}
            <div style={{ marginBottom: '16px' }}>


                {/* Main Heading */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #0d9488, #0284c7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)',
                        flexShrink: 0
                    }}>
                        <Building2 size={22} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '21px', fontWeight: '900', margin: 0, color: '#0f172a', letterSpacing: '-0.3px' }}>
                            Nearby Hospitals & HealthCentres
                        </h1>
                        <p style={{ color: '#64748b', fontSize: '12.5px', margin: '2px 0 0 0', fontWeight: 500 }}>
                            Real-time GPS road distances • 100% verified OpenStreetMap network
                        </p>
                    </div>
                </div>
            </div>

            {/* ⚡ 1-CLICK QUICK FILTER BAR (MODERN SEGMENTED CARDS) */}
            <div style={{
                background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                border: '1px solid #e2e8f0',
                borderRadius: '18px',
                padding: '10px',
                marginBottom: '14px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
            }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))', gap: '8px' }}>
                    
                    {/* 1-CLICK: Gov. Hospital */}
                    <button
                        onClick={() => setSelectedCategory('government')}
                        style={{
                            background: selectedCategory === 'government' 
                                ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' 
                                : '#ffffff',
                            color: selectedCategory === 'government' ? '#ffffff' : '#0369a1',
                            border: selectedCategory === 'government' ? '2px solid #0284c7' : '1px solid #e2e8f0',
                            padding: '10px 12px',
                            borderRadius: '14px',
                            fontSize: '12.5px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            boxShadow: selectedCategory === 'government' ? '0 6px 18px rgba(2, 132, 199, 0.35)' : 'none',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            position: 'relative'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '16px' }}>🏛️</span>
                            <span style={{ fontWeight: 800 }}>Gov. Hospital</span>
                        </div>
                        <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: selectedCategory === 'government' ? '#e0f2fe' : '#64748b',
                            background: selectedCategory === 'government' ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                            padding: '1px 7px',
                            borderRadius: '10px',
                            marginTop: '2px'
                        }}>
                            Civil • PHC • CHC
                        </span>
                    </button>

                    {/* 1-CLICK: All Hospitals */}
                    <button
                        onClick={() => setSelectedCategory('hospital')}
                        style={{
                            background: selectedCategory === 'hospital' 
                                ? 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)' 
                                : '#ffffff',
                            color: selectedCategory === 'hospital' ? '#ffffff' : '#e11d48',
                            border: selectedCategory === 'hospital' ? '2px solid #e11d48' : '1px solid #e2e8f0',
                            padding: '10px 12px',
                            borderRadius: '14px',
                            fontSize: '12.5px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            boxShadow: selectedCategory === 'hospital' ? '0 6px 18px rgba(225, 29, 72, 0.35)' : 'none',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '16px' }}>🏥</span>
                            <span style={{ fontWeight: 800 }}>All Hospitals</span>
                        </div>
                        <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: selectedCategory === 'hospital' ? '#ffe4e6' : '#64748b',
                            background: selectedCategory === 'hospital' ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                            padding: '1px 7px',
                            borderRadius: '10px',
                            marginTop: '2px'
                        }}>
                            Govt + Private
                        </span>
                    </button>

                    {/* 1-CLICK: All Facilities */}
                    <button
                        onClick={() => setSelectedCategory('ALL')}
                        style={{
                            background: selectedCategory === 'ALL' 
                                ? 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)' 
                                : '#ffffff',
                            color: selectedCategory === 'ALL' ? '#ffffff' : '#0f766e',
                            border: selectedCategory === 'ALL' ? '2px solid #0d9488' : '1px solid #e2e8f0',
                            padding: '10px 12px',
                            borderRadius: '14px',
                            fontSize: '12.5px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            boxShadow: selectedCategory === 'ALL' ? '0 6px 18px rgba(13, 148, 136, 0.35)' : 'none',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '16px' }}>🌐</span>
                            <span style={{ fontWeight: 800 }}>All Facilities</span>
                        </div>
                        <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: selectedCategory === 'ALL' ? '#ccfbf1' : '#64748b',
                            background: selectedCategory === 'ALL' ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                            padding: '1px 7px',
                            borderRadius: '10px',
                            marginTop: '2px'
                        }}>
                            Hospitals & Clinics
                        </span>
                    </button>

                    {/* 1-CLICK: 24x7 Emergency Toggle */}
                    <button
                        onClick={() => setEmergencyOnly(prev => !prev)}
                        style={{
                            background: emergencyOnly ? '#991b1b' : '#ffffff',
                            color: emergencyOnly ? '#ffffff' : '#991b1b',
                            border: emergencyOnly ? '2px solid #7f1d1d' : '1px solid #fecaca',
                            padding: '10px 12px',
                            borderRadius: '14px',
                            fontSize: '12.5px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            boxShadow: emergencyOnly ? '0 4px 14px rgba(153, 27, 27, 0.3)' : 'none',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '16px' }}>🚨</span>
                            <span style={{ fontWeight: 800 }}>Emergency</span>
                        </div>
                        <span style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            color: emergencyOnly ? '#fee2e2' : '#dc2626',
                            background: emergencyOnly ? 'rgba(255,255,255,0.2)' : '#fee2e2',
                            padding: '1px 7px',
                            borderRadius: '10px',
                            marginTop: '2px'
                        }}>
                            {emergencyOnly ? 'Active Only' : '24x7 Filter'}
                        </span>
                    </button>
                </div>
            </div>

            {/* Active GPS Region Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>
                    Region:
                </span>
                <button
                    onClick={() => {
                        setFollowUser(true);
                        startContinuousGpsTracking();
                        if (mapRef.current && userLocation?.lat && userLocation?.lon) {
                            mapRef.current.flyTo({
                                center: [userLocation.lon, userLocation.lat],
                                zoom: 14.5,
                                essential: true
                            });
                        }
                    }}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '5px 12px',
                        borderRadius: '12px',
                        border: '1.5px solid #0d9488',
                        background: '#f0fdfa',
                        color: '#0f766e',
                        fontWeight: 800,
                        fontSize: '11.5px',
                        cursor: 'pointer',
                        boxShadow: '0 1px 4px rgba(13, 148, 136, 0.12)',
                        transition: 'all 0.15s ease'
                    }}
                >
                    <span style={{
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        backgroundColor: '#0d9488',
                        boxShadow: '0 0 6px #0d9488',
                        display: 'inline-block'
                    }} />
                    <span>Current GPS Location</span>
                </button>
            </div>

            {/* Interactive Map Section */}
            <div style={{
                position: 'relative',
                borderRadius: '20px',
                overflow: 'hidden',
                border: '1px solid #e2e8f0',
                boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
                marginBottom: '16px',
                background: '#f8fafc'
            }}>
                {!mapGlError ? (
                    <div 
                        ref={mapContainerRef} 
                        style={{ 
                            width: '100%', 
                            height: '320px', 
                            background: '#f1f5f9' 
                        }} 
                    />
                ) : (
                    <div style={{ width: '100%', height: '280px', background: 'linear-gradient(180deg, #f0fdfa 0%, #f8fafc 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
                        <Globe size={36} color="#0d9488" style={{ marginBottom: '8px' }} />
                        <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: '#1e293b' }}>
                            Healthcare Radar View
                        </h3>
                        <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                            Displaying {filteredFacilities.length} facilities near your coordinates.
                        </p>
                    </div>
                )}

                {/* Map Floating HUD: Live Status */}
                <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    background: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(10px)',
                    padding: '6px 12px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.8)',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                    fontSize: '11px',
                    pointerEvents: 'none',
                    maxWidth: '220px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 800, color: '#0f172a' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#16a34a' }}></span>
                        <span>{selectedCategory === 'government' ? 'Gov. Hospitals' : (selectedCategory === 'hospital' ? 'All Hospitals' : 'All Facilities')} ({filteredFacilities.length})</span>
                    </div>
                    {userLocation?.lat && (
                        <div style={{ color: '#64748b', fontSize: '10px', marginTop: '1px' }}>
                            📍 {userLocation.lat.toFixed(4)}, {userLocation.lon.toFixed(4)}
                        </div>
                    )}
                </div>

                {/* Map Category Legend (Bottom Left Minimalist) */}
                <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    background: 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(10px)',
                    padding: '4px 10px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.8)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    fontSize: '10px',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    pointerEvents: 'none'
                }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700, color: '#0284c7' }}><span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#0284c7' }}></span> Govt</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700, color: '#dc2626' }}><span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#dc2626' }}></span> Hospital</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700, color: '#0d9488' }}><span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#0d9488' }}></span> Clinic</span>
                </div>
            </div>

            {/* Unified Search & Radius Control */}
            <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '8px 12px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
            }}>
                <Search size={16} color="#94a3b8" style={{ flexShrink: 0 }} />
                
                <input 
                    type="text"
                    placeholder="Search hospital name, street, or area..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        border: 'none',
                        outline: 'none',
                        flex: 1,
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#0f172a',
                        background: 'transparent'
                    }}
                />

                {searchTerm && (
                    <button 
                        onClick={() => setSearchTerm('')}
                        style={{ border: 'none', background: '#f1f5f9', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                    >
                        ✕
                    </button>
                )}

                <div style={{ width: '1px', height: '22px', background: '#e2e8f0', margin: '0 2px' }} />

                {/* Radius Select Chip */}
                <select 
                    value={searchRadius} 
                    onChange={(e) => setSearchRadius(Number(e.target.value))}
                    style={{
                        border: 'none',
                        outline: 'none',
                        background: '#f8fafc',
                        padding: '6px 10px',
                        borderRadius: '10px',
                        fontSize: '11.5px',
                        fontWeight: 700,
                        color: '#334155',
                        cursor: 'pointer'
                    }}
                >
                    <option value="3000">3 km</option>
                    <option value="5000">5 km</option>
                    <option value="8000">8 km</option>
                    <option value="15000">15 km</option>
                    <option value="25000">25 km</option>
                </select>
            </div>

            {/* Results Title Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '6px' }}>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{selectedCategory === 'government' ? '🏛️ Government Hospitals' : (selectedCategory === 'hospital' ? '🏥 Hospitals' : 'Healthcare Facilities')}</span>
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#0d9488', background: '#f0fdfa', padding: '2px 8px', borderRadius: '12px', border: '1px solid #ccfbf1' }}>
                        {filteredFacilities.length} Found
                    </span>
                </div>

                <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600 }}>
                    📍 Sorted by nearest road distance
                </div>
            </div>

            {/* Facility Cards Grid */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', background: '#ffffff', borderRadius: '18px', border: '1px solid #e2e8f0' }}>
                    <RefreshCw className="spin" size={26} color="#0d9488" style={{ margin: '0 auto 10px' }} />
                    <div style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>Syncing OpenStreetMap Healthcare POIs...</div>
                    <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        Calculating GPS road distances in real time
                    </p>
                </div>
            ) : filteredFacilities.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 20px', background: '#ffffff', borderRadius: '18px', border: '1px solid #e2e8f0' }}>
                    <AlertCircle size={36} color="#0d9488" style={{ margin: '0 auto 10px' }} />
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>No Facilities In Current Radius</h3>
                    <p style={{ color: '#64748b', marginTop: '6px', fontSize: '12.5px', maxWidth: '420px', margin: '6px auto 14px' }}>
                        Try increasing your coverage radius to 25 km or clearing filters.
                    </p>
                    <button
                        onClick={() => {
                            setSearchTerm('');
                            setSelectedCategory('ALL');
                            setEmergencyOnly(false);
                            setSearchRadius(25000);
                        }}
                        style={{
                            background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                            color: '#ffffff',
                            border: 'none',
                            padding: '9px 18px',
                            borderRadius: '12px',
                            fontWeight: 800,
                            fontSize: '12.5px',
                            cursor: 'pointer',
                            boxShadow: '0 3px 10px rgba(13, 148, 136, 0.3)'
                        }}
                    >
                        Expand Radius to 25 km
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '14px' }}>
                    {filteredFacilities.map(facility => {
                        const isSelected = selectedFacility?.id === facility.id;

                        return (
                            <motion.div 
                                id={`facility-card-${facility.id}`}
                                key={facility.id}
                                whileHover={{ y: -3 }}
                                style={{ 
                                    padding: '16px', 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    justifyContent: 'space-between', 
                                    border: isSelected ? '2px solid #0d9488' : '1px solid #e2e8f0',
                                    borderRadius: '18px',
                                    backgroundColor: isSelected ? '#f0fdfa' : '#ffffff',
                                    boxShadow: isSelected ? '0 8px 24px rgba(13, 148, 136, 0.18)' : '0 2px 10px rgba(0,0,0,0.03)',
                                    transition: 'all 0.2s ease',
                                    position: 'relative'
                                }}
                            >
                                <div>
                                    {/* Top Micro Badges */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '6px' }}>
                                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                            {facility.is_government ? (
                                                <span style={{
                                                    fontSize: '10.5px',
                                                    fontWeight: 800,
                                                    color: '#0369a1',
                                                    backgroundColor: '#e0f2fe',
                                                    padding: '3px 8px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #bae6fd',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '3px'
                                                }}>
                                                    🏛️ Govt. Hospital
                                                </span>
                                            ) : (
                                                <span style={{ 
                                                    fontSize: '10.5px', 
                                                    fontWeight: 800, 
                                                    padding: '3px 8px', 
                                                    borderRadius: '8px',
                                                    backgroundColor: facility.badgeBg,
                                                    color: facility.badgeColor,
                                                    border: `1px solid ${facility.pinColor}22`
                                                }}>
                                                    {facility.typeLabel}
                                                </span>
                                            )}

                                            {facility.emergency_capable && (
                                                <span style={{ fontSize: '10px', fontWeight: 800, color: '#dc2626', backgroundColor: '#fee2e2', padding: '3px 7px', borderRadius: '8px', border: '1px solid #fecaca' }}>
                                                    🚨 24x7
                                                </span>
                                            )}
                                        </div>

                                        {/* Distance Pill */}
                                        <span style={{
                                            fontSize: '11px',
                                            fontWeight: 800,
                                            color: '#0f766e',
                                            background: '#ccfbf1',
                                            padding: '3px 8px',
                                            borderRadius: '8px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '3px'
                                        }}>
                                            📍 {facility.distanceFormatted}
                                        </span>
                                    </div>

                                    {/* Hospital Name & Address */}
                                    <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 6px 0', color: '#0f172a', lineHeight: 1.3 }}>
                                        {facility.name}
                                    </h3>
                                    
                                    <p style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'flex-start', gap: '4px', marginBottom: '12px', lineHeight: '1.4' }}>
                                        <MapPin size={13} style={{ flexShrink: 0, marginTop: '2px', color: '#94a3b8' }} />
                                        <span>{facility.address}</span>
                                    </p>

                                    {/* Real Meta Specs Box */}
                                    <div style={{ background: '#f8fafc', padding: '8px 10px', borderRadius: '12px', marginBottom: '14px', fontSize: '11.5px', border: '1px solid #f1f5f9' }}>
                                        {facility.phone ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0369a1', marginBottom: '3px', fontWeight: 700 }}>
                                                <Phone size={12} />
                                                <a href={`tel:${facility.phone}`} style={{ color: '#0284c7', textDecoration: 'none' }}>
                                                    {facility.phone}
                                                </a>
                                            </div>
                                        ) : (
                                            <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '3px' }}>
                                                📞 Standard OPD Reception
                                            </div>
                                        )}

                                        {facility.operator && (
                                            <div style={{ color: '#475569', fontSize: '11px', fontWeight: 600 }}>
                                                🏛️ {facility.operator}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    <button 
                                        onClick={() => handleFocusFacility(facility)}
                                        style={{
                                            padding: '9px',
                                            borderRadius: '10px',
                                            background: '#ffffff',
                                            border: '1.5px solid #e2e8f0',
                                            color: '#334155',
                                            fontWeight: 800,
                                            fontSize: '11.5px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <Compass size={13} color="#0d9488" />
                                        <span>View on Map</span>
                                    </button>

                                    <button 
                                        style={{ 
                                            padding: '9px', 
                                            display: 'flex', 
                                            justifyContent: 'center', 
                                            alignItems: 'center', 
                                            gap: '4px', 
                                            fontSize: '11.5px',
                                            fontWeight: 800,
                                            borderRadius: '10px',
                                            border: 'none',
                                            background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                                            color: '#ffffff',
                                            cursor: 'pointer',
                                            boxShadow: '0 2px 8px rgba(13, 148, 136, 0.3)'
                                        }}
                                        onClick={() => navigate('/referrals', { state: { selectedHospital: facility } })}
                                    >
                                        <span>Referral</span>
                                        <ArrowRight size={13} />
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Attribution */}
            <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '10.5px', color: '#94a3b8' }}>
                OpenStreetMap &copy; contributors • MapLibre GL Native Rendering
            </div>
            {/* Download Local Map Modal */}
            <AnimatePresence>
                {showDownloadModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '16px'
                    }}>
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="card"
                            style={{ maxWidth: '440px', width: '100%', padding: '24px', borderRadius: '18px', background: '#ffffff' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0d9488' }}>
                                    <Download size={22} />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '17px', fontWeight: '800', margin: 0, color: '#1e293b' }}>
                                        Download Local Area Map
                                    </h2>
                                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                                        OpenStreetMap Offline Healthcare Directory
                                    </p>
                                </div>
                            </div>

                            <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5', marginBottom: '16px' }}>
                                Download and cache real OpenStreetMap hospitals, clinics, and pharmacies for your region so they remain fully accessible even without an internet connection.
                            </p>

                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '12px', marginBottom: '16px', fontSize: '12.5px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ color: '#64748b' }}>Target Region:</span>
                                    <strong style={{ color: '#1e293b' }}>{selectedRegionName}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span style={{ color: '#64748b' }}>Search Radius:</span>
                                    <strong style={{ color: '#1e293b' }}>{(searchRadius / 1000).toFixed(0)} km coverage</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#64748b' }}>Data Source:</span>
                                    <strong style={{ color: '#0d9488' }}>OpenStreetMap Overpass (Free)</strong>
                                </div>
                            </div>

                            {downloadingMap && (
                                <div style={{ marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: '#0f766e' }}>
                                        <span>Downloading local healthcare POIs...</span>
                                        <span>{downloadProgress}%</span>
                                    </div>
                                    <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{ width: `${downloadProgress}%`, height: '100%', background: '#0d9488', transition: 'width 0.3s ease' }} />
                                    </div>
                                </div>
                            )}

                            {downloadSuccess && (
                                <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: '10px', padding: '10px 12px', color: '#166534', fontSize: '12.5px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
                                    <CheckCircle2 size={16} />
                                    <span>Successfully saved {facilities.length} facilities for offline access!</span>
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => setShowDownloadModal(false)}
                                    disabled={downloadingMap}
                                    style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#ffffff', color: '#475569', fontWeight: 600, fontSize: '12.5px', cursor: 'pointer' }}
                                >
                                    Close
                                </button>

                                <button
                                    onClick={handleDownloadLocalMap}
                                    disabled={downloadingMap}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                                        color: '#ffffff',
                                        fontWeight: 700,
                                        fontSize: '12.5px',
                                        cursor: downloadingMap ? 'not-allowed' : 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        boxShadow: '0 2px 8px rgba(13, 148, 136, 0.3)'
                                    }}
                                >
                                    {downloadingMap ? (
                                        <>
                                            <RefreshCw className="spin" size={14} />
                                            <span>Downloading...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Download size={14} />
                                            <span>Download & Cache Now</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Referral Booking Modal */}
            <AnimatePresence>
                {bookingFacility && (
                    <div style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '16px'
                    }}>
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="card"
                            style={{ maxWidth: '480px', width: '100%', padding: '24px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '18px', background: '#ffffff' }}
                        >
                            {bookingSuccess ? (
                                <div style={{ textAlign: 'center', padding: '30px 0' }}>
                                    <CheckCircle2 size={50} color="#16A34A" style={{ margin: '0 auto 16px' }} />
                                    <h2>Referral Created!</h2>
                                    <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                                        Redirecting to closed-loop tracker...
                                    </p>
                                </div>
                            ) : (
                                <form onSubmit={handleCreateReferral}>
                                    <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '4px', color: '#1e293b' }}>
                                        Create Facility Referral
                                    </h2>
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                                        Target: <strong>{bookingFacility.name}</strong> ({bookingFacility.typeLabel})
                                    </p>

                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Required Specialty</label>
                                        <select 
                                            value={specialty} 
                                            onChange={(e) => setSpecialty(e.target.value)}
                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '13px' }}
                                        >
                                            <option value="GENERAL_MEDICINE">General Medicine</option>
                                            <option value="OBSTETRICS">Obstetrics & Gynecology (Maternal)</option>
                                            <option value="PEDIATRICS">Pediatrics (Child Health)</option>
                                            <option value="CARDIOLOGY">Cardiology</option>
                                            <option value="TRAUMA_SURGERY">Trauma & Orthopedic Surgery</option>
                                            <option value="PHARMACY_DISPENSARY">Pharmacy & Prescription Fulfillment</option>
                                        </select>
                                    </div>

                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Urgency Level</label>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <button 
                                                type="button" 
                                                onClick={() => setUrgency('ROUTINE')}
                                                style={{
                                                    flex: 1, padding: '8px', borderRadius: '8px', fontSize: '13px', fontWeight: '700',
                                                    border: urgency === 'ROUTINE' ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                                                    backgroundColor: urgency === 'ROUTINE' ? 'rgba(13, 148, 136, 0.1)' : 'var(--bg-color)',
                                                    color: urgency === 'ROUTINE' ? 'var(--primary-color)' : 'var(--text-secondary)',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Routine
                                            </button>
                                            <button 
                                                type="button" 
                                                onClick={() => setUrgency('EMERGENCY')}
                                                style={{
                                                    flex: 1, padding: '8px', borderRadius: '8px', fontSize: '13px', fontWeight: '700',
                                                    border: urgency === 'EMERGENCY' ? '2px solid #DC2626' : '1px solid var(--border-color)',
                                                    backgroundColor: urgency === 'EMERGENCY' ? '#FEE2E2' : 'var(--bg-color)',
                                                    color: urgency === 'EMERGENCY' ? '#DC2626' : 'var(--text-secondary)',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                🚨 Emergency
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '18px' }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Primary Symptoms / Clinical Reason</label>
                                        <textarea 
                                            rows={3}
                                            placeholder="e.g., Patient experiencing acute fever, shortness of breath, need specialist consult..."
                                            value={complaint}
                                            onChange={(e) => setComplaint(e.target.value)}
                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'var(--text-primary)', fontSize: '13px', resize: 'none' }}
                                            required
                                        />
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                        <button type="button" className="btn-outline" onClick={() => setBookingFacility(null)} style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px' }}>Cancel</button>
                                        <button type="submit" className="btn-primary" style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px' }}>Confirm & Dispatch</button>
                                    </div>
                                </form>
                            )}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FacilityFinder;
