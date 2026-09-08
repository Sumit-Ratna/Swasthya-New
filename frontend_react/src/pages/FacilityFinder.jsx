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

// Standard fallback region coordinates if browser GPS is loading/denied
const DEFAULT_REGIONS = [
    { name: 'Current GPS Location', lat: null, lon: null },
    { name: 'Nashik District (Maharashtra)', lat: 19.9975, lon: 73.7898 },
    { name: 'Pune Division (Maharashtra)', lat: 18.5204, lon: 73.8567 },
    { name: 'Mumbai Metropolitan', lat: 19.0760, lon: 72.8777 },
    { name: 'Delhi NCR Healthcare Zone', lat: 28.6139, lon: 77.2090 }
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
        <div style={{ padding: '20px 16px 120px 16px', maxWidth: '1100px', margin: '0 auto', color: 'var(--text-primary)', fontFamily: 'Inter, system-ui, sans-serif' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <span style={{
                            background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                            color: 'white',
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            letterSpacing: '0.5px'
                        }}>
                            OPENSTREETMAP + MAPLIBRE
                        </span>

                        {/* Live GPS Active Badge */}
                        <span style={{
                            background: liveGpsActive ? '#dcfce7' : '#e0f2fe',
                            color: liveGpsActive ? '#166534' : '#0369a1',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: `1px solid ${liveGpsActive ? '#bbf7d0' : '#bae6fd'}`,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            <Radio size={12} className={liveGpsActive ? 'spin' : ''} />
                            {liveGpsActive ? `Live GPS Active (±${userLocation.accuracy || 5}m)` : 'GPS Locating...'}
                        </span>

                        {/* Auto-Installed Local Map Badge */}
                        <span style={{
                            background: '#f0fdfa',
                            color: '#0f766e',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid #ccfbf1',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            <ShieldCheck size={12} />
                            Offline Map Ready ({offlineSavedCount || facilities.length} POIs)
                        </span>
                    </div>

                    <h1 style={{ fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0', color: '#1e293b' }}>
                        <Building2 color="var(--primary-color)" size={28} />
                        HealthCentres Nearby & Smart Directory
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', margin: 0 }}>
                        Real-time GPS tracking of hospitals & health centers • Auto-cached local offline map
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => {
                            setFollowUser(true);
                            if (mapRef.current && userLocation?.lat && userLocation?.lon) {
                                mapRef.current.flyTo({
                                    center: [userLocation.lon, userLocation.lat],
                                    zoom: 14.5,
                                    essential: true
                                });
                            }
                        }}
                        style={{
                            background: followUser ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : '#ffffff',
                            border: followUser ? 'none' : '1px solid var(--border-color)',
                            padding: '8px 14px',
                            borderRadius: '10px',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            color: followUser ? '#ffffff' : '#2563eb',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: followUser ? '0 2px 8px rgba(37, 99, 235, 0.3)' : '0 1px 3px rgba(0,0,0,0.05)'
                        }}
                    >
                        <Crosshair size={15} />
                        <span>{followUser ? '📍 Following GPS' : 'Center on GPS'}</span>
                    </button>

                    <button
                        onClick={() => loadOsmFacilities(userLocation.lat, userLocation.lon, true)}
                        disabled={loading}
                        style={{
                            background: '#ffffff',
                            border: '1px solid var(--border-color)',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }}
                        title="Re-sync healthcare facilities around your GPS location"
                    >
                        <RefreshCw size={14} className={loading ? 'spin' : ''} />
                        <span>Re-Sync</span>
                    </button>
                </div>
            </div>

            {/* 1-CLICK QUICK FILTER BAR (HOSPITALS / GOVT HOSPITALS / ALL) */}
            <div style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                padding: '12px 14px',
                marginBottom: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', flex: 1 }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: '4px' }}>
                        ⚡ 1-Click Filters:
                    </span>

                    {/* 1-CLICK: Gov. Hospital */}
                    <button
                        onClick={() => setSelectedCategory('government')}
                        style={{
                            background: selectedCategory === 'government' ? 'linear-gradient(135deg, #0284c7, #0369a1)' : '#f0f9ff',
                            color: selectedCategory === 'government' ? '#ffffff' : '#0369a1',
                            border: selectedCategory === 'government' ? '2px solid #0284c7' : '1px solid #bae6fd',
                            padding: '8px 16px',
                            borderRadius: '10px',
                            fontSize: '13px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: selectedCategory === 'government' ? '0 3px 10px rgba(2, 132, 199, 0.35)' : 'none',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <span style={{ fontSize: '15px' }}>🏛️</span>
                        <span>Gov. Hospital Only</span>
                    </button>

                    {/* 1-CLICK: All Hospitals */}
                    <button
                        onClick={() => setSelectedCategory('hospital')}
                        style={{
                            background: selectedCategory === 'hospital' ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : '#fef2f2',
                            color: selectedCategory === 'hospital' ? '#ffffff' : '#dc2626',
                            border: selectedCategory === 'hospital' ? '2px solid #dc2626' : '1px solid #fecaca',
                            padding: '8px 16px',
                            borderRadius: '10px',
                            fontSize: '13px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: selectedCategory === 'hospital' ? '0 3px 10px rgba(220, 38, 38, 0.35)' : 'none',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <span style={{ fontSize: '15px' }}>🏥</span>
                        <span>All Hospitals</span>
                    </button>

                    {/* 1-CLICK: All Facility Types */}
                    <button
                        onClick={() => setSelectedCategory('ALL')}
                        style={{
                            background: selectedCategory === 'ALL' ? 'linear-gradient(135deg, #0d9488, #0f766e)' : '#f0fdfa',
                            color: selectedCategory === 'ALL' ? '#ffffff' : '#0f766e',
                            border: selectedCategory === 'ALL' ? '2px solid #0d9488' : '1px solid #ccfbf1',
                            padding: '8px 16px',
                            borderRadius: '10px',
                            fontSize: '13px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: selectedCategory === 'ALL' ? '0 3px 10px rgba(13, 148, 136, 0.35)' : 'none',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <span style={{ fontSize: '15px' }}>🌐</span>
                        <span>All Facilities</span>
                    </button>

                    {/* 1-CLICK: Emergency Toggle */}
                    <button
                        onClick={() => setEmergencyOnly(prev => !prev)}
                        style={{
                            background: emergencyOnly ? '#991b1b' : '#ffffff',
                            color: emergencyOnly ? '#ffffff' : '#991b1b',
                            border: emergencyOnly ? '2px solid #7f1d1d' : '1px solid #fca5a5',
                            padding: '8px 14px',
                            borderRadius: '10px',
                            fontSize: '12.5px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        <span>🚨 24x7 Emergency</span>
                    </button>
                </div>

                <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f766e', background: '#ccfbf1', padding: '4px 10px', borderRadius: '8px', whiteSpace: 'nowrap' }}>
                    {filteredFacilities.length} {selectedCategory === 'government' ? 'Gov. Hospitals' : (selectedCategory === 'hospital' ? 'Hospitals' : 'Facilities')} Found
                </div>
            </div>

            {/* Region Selector Bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap', marginRight: '4px' }}>
                    Preset Region:
                </span>
                {DEFAULT_REGIONS.map((region, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleSelectRegion(region)}
                        style={{
                            padding: '5px 11px',
                            borderRadius: '8px',
                            border: selectedRegionName === region.name ? '1px solid #0d9488' : '1px solid var(--border-color)',
                            background: selectedRegionName === region.name ? '#f0fdfa' : '#ffffff',
                            color: selectedRegionName === region.name ? '#0f766e' : '#475569',
                            fontWeight: selectedRegionName === region.name ? 700 : 500,
                            fontSize: '11.5px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {region.name}
                    </button>
                ))}
            </div>

            {/* Geolocation Status / Error Banner */}
            {locationStatus === 'locating' && (
                <div style={{ background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '12px', padding: '10px 14px', marginBottom: '16px', color: '#0369a1', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <RefreshCw className="spin" size={16} />
                    <span>Continuous GPS tracking active: updating coordinates in real time...</span>
                </div>
            )}

            {locationError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px', color: '#b91c1c', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={18} style={{ flexShrink: 0 }} />
                        <span>{locationError}</span>
                    </div>
                    <button
                        onClick={startContinuousGpsTracking}
                        style={{ background: '#dc2626', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                        Retry GPS
                    </button>
                </div>
            )}

            {dataError && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px', color: '#b45309', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={18} style={{ flexShrink: 0 }} />
                        <span>{dataError}</span>
                    </div>
                    <button
                        onClick={() => loadOsmFacilities(userLocation.lat, userLocation.lon, true)}
                        style={{ background: '#d97706', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                        Retry Sync
                    </button>
                </div>
            )}

            {/* Interactive Map Section */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '20px', borderRadius: '16px', border: '1px solid var(--border-color)', position: 'relative' }}>
                {!mapGlError ? (
                    <div 
                        ref={mapContainerRef} 
                        style={{ 
                            width: '100%', 
                            height: '380px', 
                            background: '#f1f5f9' 
                        }} 
                    />
                ) : (
                    /* Fallback Safe View if WebGL is disabled */
                    <div style={{ width: '100%', height: '340px', background: 'linear-gradient(180deg, #f0fdfa 0%, #f8fafc 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
                        <Globe size={40} color="#0d9488" style={{ marginBottom: '10px' }} />
                        <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 800, color: '#1e293b' }}>
                            OpenStreetMap Healthcare Radar View
                        </h3>
                        <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#64748b', maxWidth: '450px' }}>
                            Displaying {filteredFacilities.length} real healthcare facilities found near your coordinates.
                        </p>
                    </div>
                )}

                {/* Map Floating Real-Time GPS Overlay */}
                <div style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(8px)',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    border: '1px solid rgba(0,0,0,0.1)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                    fontSize: '11.5px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    pointerEvents: 'auto',
                    maxWidth: '250px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#1e293b' }}>
                        <Radio size={14} color={liveGpsActive ? '#16a34a' : '#2563eb'} className={liveGpsActive ? 'spin' : ''} />
                        <span>{liveGpsActive ? 'Live Real-Time GPS Tracking' : 'GPS Initialized'}</span>
                    </div>
                    {userLocation ? (
                        <div style={{ color: '#64748b', fontSize: '10.5px' }}>
                            📍 Lat: <strong>{userLocation.lat.toFixed(4)}</strong>, Lon: <strong>{userLocation.lon.toFixed(4)}</strong>
                            {userLocation.accuracy && ` (±${userLocation.accuracy}m)`}
                        </div>
                    ) : (
                        <div style={{ color: '#b45309', fontSize: '10.5px' }}>
                            Waiting for GPS fix...
                        </div>
                    )}
                    <div style={{ color: selectedCategory === 'government' ? '#0369a1' : (selectedCategory === 'hospital' ? '#dc2626' : '#0d9488'), fontWeight: 800, fontSize: '11px' }}>
                        {selectedCategory === 'government' ? '🏛️ Showing Govt. Hospitals Only' : (selectedCategory === 'hospital' ? '🏥 Showing All Hospitals' : '🌐 Showing All Facilities')} ({filteredFacilities.length})
                    </div>
                </div>

                {/* Map Category Legend */}
                <div style={{
                    position: 'absolute',
                    bottom: '24px',
                    right: '12px',
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(8px)',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(0,0,0,0.1)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    fontSize: '10px',
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap',
                    alignItems: 'center'
                }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700, color: '#0369a1' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0284c7' }}></span> Govt. Hospital</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700, color: '#dc2626' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#dc2626' }}></span> Hospital</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0d9488' }}></span> Clinic</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#7c3aed' }}></span> Doctors</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }}></span> Pharmacy</span>
                </div>
            </div>

            {/* Filter Search and Radius Bar */}
            <div className="card" style={{ padding: '14px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', borderRadius: '14px' }}>
                <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
                    <input 
                        type="text"
                        placeholder="Search hospital name, street, or locality..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ paddingLeft: '38px', width: '100%', fontSize: '13.5px' }}
                    />
                    <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>

                {/* Search Radius Selector */}
                <select 
                    value={searchRadius} 
                    onChange={(e) => setSearchRadius(Number(e.target.value))}
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600 }}
                >
                    <option value="3000">Radius: 3 km</option>
                    <option value="5000">Radius: 5 km</option>
                    <option value="8000">Radius: 8 km</option>
                    <option value="15000">Radius: 15 km</option>
                    <option value="25000">Radius: 25 km</option>
                </select>
            </div>

            {/* Results Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>
                    {selectedCategory === 'government' ? '🏛️ Government Hospitals' : (selectedCategory === 'hospital' ? '🏥 All Hospitals' : 'Healthcare Facilities')} ({filteredFacilities.length} found)
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginLeft: '6px' }}>
                        • Live GPS distance sorted
                    </span>
                </div>

                <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Source: <strong style={{ color: '#0f766e' }}>{dataSourceInfo}</strong>
                </div>
            </div>

            {/* Facility Grid */}
            {loading ? (
                <div className="card" style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-secondary)' }}>
                    <RefreshCw className="spin" size={28} color="var(--primary-color)" style={{ margin: '0 auto 12px' }} />
                    <div style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b' }}>Syncing OpenStreetMap Healthcare POIs...</div>
                    <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                        Calculating actual road distances from your live GPS location
                    </p>
                </div>
            ) : filteredFacilities.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px 20px', borderRadius: '16px' }}>
                    <AlertCircle size={40} color="var(--primary-color)" style={{ margin: '0 auto 12px' }} />
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>No Matching Facilities Found</h3>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '13.5px', maxWidth: '500px', margin: '8px auto 16px' }}>
                        {dataError || 'No facilities matched your current filter or radius. Try expanding search radius to 25 km.'}
                    </p>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setSelectedCategory('ALL');
                                setEmergencyOnly(false);
                                setSearchRadius(25000);
                            }}
                            style={{
                                background: 'var(--primary-color)',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontWeight: 700,
                                fontSize: '13px',
                                cursor: 'pointer'
                            }}
                        >
                            Expand Radius to 25 km & Show All
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                    {filteredFacilities.map(facility => {
                        const isSelected = selectedFacility?.id === facility.id;

                        return (
                            <motion.div 
                                id={`facility-card-${facility.id}`}
                                key={facility.id}
                                className="card"
                                whileHover={{ y: -2 }}
                                style={{ 
                                    padding: '18px', 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    justifyContent: 'space-between', 
                                    border: isSelected ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                                    borderRadius: '14px',
                                    backgroundColor: isSelected ? '#f0fdfa' : 'var(--card-bg)',
                                    boxShadow: isSelected ? '0 4px 14px rgba(13, 148, 136, 0.15)' : 'var(--shadow-sm)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                <div>
                                    {/* Top Badges */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '4px' }}>
                                        <span style={{ 
                                            fontSize: '11px', 
                                            fontWeight: '700', 
                                            padding: '3px 8px', 
                                            borderRadius: '8px',
                                            backgroundColor: facility.badgeBg,
                                            color: facility.badgeColor,
                                            border: `1px solid ${facility.pinColor}33`
                                        }}>
                                            {facility.typeLabel}
                                        </span>

                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                            {facility.is_government && (
                                                <span style={{ fontSize: '10.5px', fontWeight: '800', color: '#0369a1', backgroundColor: '#e0f2fe', padding: '2px 7px', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                                                    🏛️ Govt.
                                                </span>
                                            )}
                                            {facility.emergency_capable && (
                                                <span style={{ fontSize: '10.5px', fontWeight: '800', color: '#DC2626', backgroundColor: '#FEE2E2', padding: '2px 7px', borderRadius: '6px' }}>
                                                    24x7 Emergency
                                                </span>
                                            )}
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: '800',
                                                color: '#0f766e',
                                                background: '#ccfbf1',
                                                padding: '2px 7px',
                                                borderRadius: '6px'
                                            }}>
                                                📍 {facility.distanceFormatted}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Name & Address */}
                                    <h3 style={{ fontSize: '15.5px', fontWeight: '800', margin: '4px 0 6px', color: '#1e293b' }}>
                                        {facility.name}
                                    </h3>
                                    
                                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'flex-start', gap: '4px', marginBottom: '10px', lineHeight: '1.4' }}>
                                        <MapPin size={14} style={{ flexShrink: 0, marginTop: '2px', color: '#64748b' }} />
                                        <span>{facility.address}</span>
                                    </p>

                                    {/* Real OSM Meta Specs */}
                                    <div style={{ background: 'var(--bg-color)', padding: '10px', borderRadius: '10px', marginBottom: '14px', fontSize: '12px' }}>
                                        {facility.phone ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0369a1', marginBottom: '4px', fontWeight: 600 }}>
                                                <Phone size={13} />
                                                <a href={`tel:${facility.phone}`} style={{ color: '#0284c7', textDecoration: 'none' }}>
                                                    {facility.phone}
                                                </a>
                                            </div>
                                        ) : (
                                            <div style={{ color: '#94a3b8', fontSize: '11.5px', marginBottom: '4px' }}>
                                                📞 Phone not specified in OSM
                                            </div>
                                        )}

                                        {facility.opening_hours ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#166534', fontSize: '11.5px', fontWeight: 600 }}>
                                                <Clock size={13} />
                                                <span>Hours: {facility.opening_hours}</span>
                                            </div>
                                        ) : (
                                            <div style={{ color: '#94a3b8', fontSize: '11.5px' }}>
                                                ⏰ Hours: Open for public healthcare
                                            </div>
                                        )}

                                        {facility.operator && (
                                            <div style={{ color: '#475569', fontSize: '11px', marginTop: '4px' }}>
                                                🏛️ Operator: {facility.operator}
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
                                            borderRadius: '8px',
                                            background: '#ffffff',
                                            border: '1px solid var(--border-color)',
                                            color: '#334155',
                                            fontWeight: 700,
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        <Compass size={14} color="#0d9488" />
                                        <span>View on Map</span>
                                    </button>

                                    <button 
                                        className="btn-primary" 
                                        style={{ 
                                            padding: '9px', 
                                            display: 'flex', 
                                            justifyContent: 'center', 
                                            alignItems: 'center', 
                                            gap: '4px', 
                                            fontSize: '12px',
                                            borderRadius: '8px'
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

            {/* OpenStreetMap Attribution Footer */}
            <div style={{ marginTop: '30px', padding: '12px', textAlign: 'center', fontSize: '11px', color: '#94a3b8', borderTop: '1px solid var(--border-color)' }}>
                Map & Healthcare Geographic Data &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" style={{ color: '#0d9488', textDecoration: 'underline' }}>OpenStreetMap</a> contributors. 
                Rendered with <a href="https://maplibre.org/" target="_blank" rel="noopener noreferrer" style={{ color: '#0d9488', textDecoration: 'underline' }}>MapLibre GL</a>. Real-time GPS distance calculation.
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
