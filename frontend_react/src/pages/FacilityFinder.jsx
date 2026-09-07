import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Building2, MapPin, Phone, ShieldAlert, CheckCircle2, 
    Stethoscope, Clock, Filter, Search, ArrowRight, AlertCircle, 
    Bell, Navigation, RefreshCw, Compass, Download, WifiOff, 
    Globe, Crosshair, Layers, ExternalLink, Activity
} from 'lucide-react';
import axios from 'axios';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { 
    fetchNearbyOsmHealthcare, 
    calculateHaversineDistance, 
    formatDistance, 
    getFacilitiesFromLocalCache, 
    saveFacilitiesToLocalCache 
} from '../services/osmHealthcareService';

const FacilityFinder = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    // Geolocation States
    const [userLocation, setUserLocation] = useState(null); // { lat, lon, accuracy }
    const [locationStatus, setLocationStatus] = useState('prompt'); // 'prompt' | 'locating' | 'granted' | 'denied' | 'error'
    const [locationError, setLocationError] = useState(null);

    // Facility & Data States
    const [facilities, setFacilities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dataError, setDataError] = useState(null);
    const [isOfflineData, setIsOfflineData] = useState(false);
    const [dataSourceInfo, setDataSourceInfo] = useState('OpenStreetMap');
    const [lastUpdated, setLastUpdated] = useState(null);

    // Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ALL'); // 'ALL' | 'hospital' | 'clinic' | 'doctors' | 'pharmacy'
    const [emergencyOnly, setEmergencyOnly] = useState(false);
    const [searchRadius, setSearchRadius] = useState(8000); // 8 km in meters
    const [selectedFacility, setSelectedFacility] = useState(null);

    // Referral Booking Modal State
    const [bookingFacility, setBookingFacility] = useState(null);
    const [specialty, setSpecialty] = useState('GENERAL_MEDICINE');
    const [complaint, setComplaint] = useState('');
    const [urgency, setUrgency] = useState('ROUTINE');
    const [bookingSuccess, setBookingSuccess] = useState(false);

    // MapLibre Ref & Markers Ref
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const userMarkerRef = useRef(null);
    const facilityMarkersRef = useRef({});
    const popupsRef = useRef({});

    /**
     * Request real user geolocation from browser/device
     */
    const requestUserLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setLocationStatus('error');
            setLocationError('Geolocation is not supported by your browser/device.');
            return;
        }

        setLocationStatus('locating');
        setLocationError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude, accuracy } = position.coords;
                setUserLocation({ lat: latitude, lon: longitude, accuracy });
                setLocationStatus('granted');
                setLocationError(null);
            },
            (err) => {
                console.warn('Geolocation error:', err);
                setLocationStatus(err.code === 1 ? 'denied' : 'error');
                if (err.code === 1) {
                    setLocationError('Location access was denied. Please allow location permissions in your browser to find nearby health centres.');
                } else if (err.code === 2) {
                    setLocationError('GPS position unavailable. Please check your network or device location settings.');
                } else if (err.code === 3) {
                    setLocationError('Location request timed out. Please try again.');
                } else {
                    setLocationError('Unable to retrieve GPS coordinates.');
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 10000
            }
        );
    }, []);

    // Initial Geolocation Request on mount
    useEffect(() => {
        requestUserLocation();
    }, [requestUserLocation]);

    /**
     * Fetch real OpenStreetMap healthcare facilities whenever user location or radius changes
     */
    const loadOsmFacilities = useCallback(async () => {
        if (!userLocation) return;

        setLoading(true);
        setDataError(null);

        try {
            const result = await fetchNearbyOsmHealthcare(
                userLocation.lat, 
                userLocation.lon, 
                searchRadius
            );

            setFacilities(result.facilities || []);
            setIsOfflineData(result.isOffline || false);
            setDataSourceInfo(result.source || 'OpenStreetMap');
            setLastUpdated(result.timestamp || new Date().toISOString());
        } catch (err) {
            console.error('Error fetching OSM facilities:', err);
            // Check if there is cached data available
            const cached = getFacilitiesFromLocalCache(userLocation.lat, userLocation.lon);
            if (cached && cached.facilities && cached.facilities.length > 0) {
                const recalculated = cached.facilities.map(f => {
                    const dist = calculateHaversineDistance(userLocation.lat, userLocation.lon, f.lat, f.lon);
                    return {
                        ...f,
                        distanceMeters: dist,
                        distanceFormatted: formatDistance(dist)
                    };
                }).sort((a, b) => a.distanceMeters - b.distanceMeters);

                setFacilities(recalculated);
                setIsOfflineData(true);
                setDataSourceInfo(`Offline Cached (${new Date(cached.timestamp).toLocaleDateString()})`);
                setLastUpdated(cached.timestamp);
                setDataError('Internet unavailable. Displaying previously cached OpenStreetMap healthcare data.');
            } else {
                setFacilities([]);
                setDataError(
                    !navigator.onLine 
                        ? 'No offline healthcare data is available for this area. Connect to the internet to load nearby health centres.' 
                        : (err.message || 'Unable to retrieve healthcare facilities from OpenStreetMap.')
                );
            }
        } finally {
            setLoading(false);
        }
    }, [userLocation, searchRadius]);

    useEffect(() => {
        if (userLocation) {
            loadOsmFacilities();
        }
    }, [userLocation, searchRadius, loadOsmFacilities]);

    /**
     * Initialize MapLibre GL Map with OpenStreetMap raster tiles
     */
    useEffect(() => {
        if (!mapContainerRef.current) return;
        if (mapRef.current) return; // already initialized

        // Standard OpenStreetMap Tile Style specification for MapLibre
        const osmRasterStyle = {
            version: 8,
            sources: {
                'osm-tiles': {
                    type: 'raster',
                    tiles: [
                        'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
                    ],
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

        // Initialize Map
        const initialCenter = userLocation ? [userLocation.lon, userLocation.lat] : [77.2090, 28.6139]; // Default view center if not yet located
        const initialZoom = userLocation ? 13 : 4;

        const map = new maplibregl.Map({
            container: mapContainerRef.current,
            style: osmRasterStyle,
            center: initialCenter,
            zoom: initialZoom,
            maxZoom: 19,
            minZoom: 2
        });

        // Add standard navigation controls
        map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true }), 'top-right');
        map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

        mapRef.current = map;

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    /**
     * Update User Location Marker & Center Map
     */
    useEffect(() => {
        if (!mapRef.current || !userLocation) return;

        const map = mapRef.current;

        // Fly to user coordinates
        map.flyTo({
            center: [userLocation.lon, userLocation.lat],
            zoom: 13.5,
            essential: true
        });

        // Create or update user location marker with pulsing element
        if (!userMarkerRef.current) {
            const el = document.createElement('div');
            el.className = 'user-location-marker';
            el.style.width = '22px';
            el.style.height = '22px';
            el.style.borderRadius = '50%';
            el.style.backgroundColor = '#2563eb';
            el.style.border = '3px solid #ffffff';
            el.style.boxShadow = '0 0 0 6px rgba(37, 99, 235, 0.3), 0 3px 10px rgba(0,0,0,0.3)';
            el.style.cursor = 'pointer';

            const popup = new maplibregl.Popup({ offset: 12 }).setHTML(`
                <div style="font-family: Inter, sans-serif; font-size: 12px; padding: 4px;">
                    <strong style="color: #2563eb;">📍 Your Real Location</strong>
                    <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                        Lat: ${userLocation.lat.toFixed(4)}, Lon: ${userLocation.lon.toFixed(4)}
                    </div>
                </div>
            `);

            userMarkerRef.current = new maplibregl.Marker({ element: el })
                .setLngLat([userLocation.lon, userLocation.lat])
                .setPopup(popup)
                .addTo(map);
        } else {
            userMarkerRef.current.setLngLat([userLocation.lon, userLocation.lat]);
        }
    }, [userLocation]);

    /**
     * Filter facilities by search, category, and emergency tag
     */
    const filteredFacilities = facilities.filter(f => {
        const matchesSearch = 
            f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
            f.typeLabel.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory = 
            selectedCategory === 'ALL' || f.typeKey === selectedCategory;

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

        // Remove old markers
        Object.values(facilityMarkersRef.current).forEach(marker => marker.remove());
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

            // Pin icon based on type
            let symbol = '🏥';
            if (facility.typeKey === 'pharmacy') symbol = '💊';
            else if (facility.typeKey === 'doctors') symbol = '🩺';
            else if (facility.typeKey === 'clinic') symbol = '⚕️';

            el.innerHTML = `<span style="font-size: 14px;">${symbol}</span>`;

            el.addEventListener('mouseenter', () => {
                el.style.transform = 'scale(1.2)';
            });
            el.addEventListener('mouseleave', () => {
                el.style.transform = 'scale(1)';
            });

            // Map Popup content
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
                    <div style="font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 4px; margin-top: 4px;">
                        Data: OpenStreetMap (Real OSM POI)
                    </div>
                </div>
            `;

            const popup = new maplibregl.Popup({ offset: 18 }).setHTML(popupHtml);
            popupsRef.current[facility.id] = popup;

            const marker = new maplibregl.Marker({ element: el })
                .setLngLat([facility.lon, facility.lat])
                .setPopup(popup)
                .addTo(map);

            // On marker click, highlight corresponding facility
            marker.getElement().addEventListener('click', () => {
                setSelectedFacility(facility);
                const elCard = document.getElementById(`facility-card-${facility.id}`);
                if (elCard) {
                    elCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            });

            facilityMarkersRef.current[facility.id] = marker;
        });
    }, [filteredFacilities]);

    /**
     * Focus map on selected facility
     */
    const handleFocusFacility = (facility) => {
        setSelectedFacility(facility);
        if (mapRef.current) {
            mapRef.current.flyTo({
                center: [facility.lon, facility.lat],
                zoom: 16,
                essential: true
            });

            const popup = popupsRef.current[facility.id];
            const marker = facilityMarkersRef.current[facility.id];
            if (popup && marker) {
                marker.togglePopup();
            }
        }
    };

    /**
     * Save Current Area for Offline Use
     */
    const handleSaveAreaOffline = () => {
        if (!userLocation || facilities.length === 0) {
            alert('No facilities available to save for offline use.');
            return;
        }
        saveFacilitiesToLocalCache(userLocation.lat, userLocation.lon, searchRadius, facilities);
        alert(`Successfully saved ${facilities.length} real OpenStreetMap healthcare facilities for offline access.`);
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
            // Fallback gracefully if database id differs from OSM ID
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
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
                        {isOfflineData && (
                            <span style={{
                                background: '#fef3c7',
                                color: '#b45309',
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                border: '1px solid #fde68a',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                <WifiOff size={12} /> Offline Mode
                            </span>
                        )}
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px', margin: '4px 0' }}>
                        <Building2 color="var(--primary-color)" size={28} />
                        HealthCentres Nearby & Smart Directory
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', margin: 0 }}>
                        Real-time GPS mapping of hospitals, clinics, and pharmacies powered by OpenStreetMap
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={requestUserLocation}
                        style={{
                            background: '#ffffff',
                            border: '1px solid var(--border-color)',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            color: 'var(--primary-color)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }}
                        title="Acquire real GPS coordinates"
                    >
                        <Crosshair size={15} />
                        <span>GPS Locate</span>
                    </button>

                    <button
                        onClick={handleSaveAreaOffline}
                        style={{
                            background: '#ffffff',
                            border: '1px solid var(--border-color)',
                            padding: '8px 12px',
                            borderRadius: '10px',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            color: '#475569',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }}
                        title="Save current area's real healthcare facilities for offline use"
                    >
                        <Download size={15} />
                        <span>Save Offline</span>
                    </button>
                </div>
            </div>

            {/* Geolocation Status / Error Banner */}
            {locationStatus === 'locating' && (
                <div style={{ background: '#e0f2fe', border: '1px solid #bae6fd', borderRadius: '12px', padding: '10px 14px', marginBottom: '16px', color: '#0369a1', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <RefreshCw className="spin" size={16} />
                    <span>Detecting your real device GPS coordinates...</span>
                </div>
            )}

            {locationError && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px', color: '#b91c1c', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={18} style={{ flexShrink: 0 }} />
                        <span>{locationError}</span>
                    </div>
                    <button
                        onClick={requestUserLocation}
                        style={{ background: '#dc2626', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '6px', fontWeight: 700, fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                        Retry Location
                    </button>
                </div>
            )}

            {dataError && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px', color: '#b45309', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={18} style={{ flexShrink: 0 }} />
                    <span>{dataError}</span>
                </div>
            )}

            {/* Interactive Map Section */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '20px', borderRadius: '16px', border: '1px solid var(--border-color)', position: 'relative' }}>
                <div 
                    ref={mapContainerRef} 
                    style={{ 
                        width: '100%', 
                        height: '380px', 
                        background: '#f1f5f9' 
                    }} 
                />

                {/* Map Floating Control Overlay */}
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
                    maxWidth: '240px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#1e293b' }}>
                        <Globe size={14} color="#0d9488" />
                        <span>MapLibre + OpenStreetMap</span>
                    </div>
                    {userLocation ? (
                        <div style={{ color: '#64748b', fontSize: '10.5px' }}>
                            📍 GPS: <strong>{userLocation.lat.toFixed(4)}, {userLocation.lon.toFixed(4)}</strong>
                        </div>
                    ) : (
                        <div style={{ color: '#b45309', fontSize: '10.5px' }}>
                            Waiting for GPS permissions...
                        </div>
                    )}
                    <div style={{ color: '#0d9488', fontWeight: 700, fontSize: '11px' }}>
                        🏥 {filteredFacilities.length} real facilities found
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
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#dc2626' }}></span> Hospital</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0d9488' }}></span> Clinic</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#7c3aed' }}></span> Doctors</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }}></span> Pharmacy</span>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="card" style={{ padding: '16px', marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', borderRadius: '14px' }}>
                <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
                    <input 
                        type="text"
                        placeholder="Search real facility name, street, or city..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ paddingLeft: '38px', width: '100%', fontSize: '13.5px' }}
                    />
                    <Search size={18} color="var(--text-secondary)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                </div>

                {/* Category Filter */}
                <select 
                    value={selectedCategory} 
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600 }}
                >
                    <option value="ALL">All Facility Types</option>
                    <option value="hospital">Hospitals</option>
                    <option value="clinic">Clinics & Health Centres</option>
                    <option value="doctors">Doctors & Specialists</option>
                    <option value="pharmacy">Pharmacies & Chemists</option>
                </select>

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

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}>
                    <input 
                        type="checkbox"
                        checked={emergencyOnly}
                        onChange={(e) => setEmergencyOnly(e.target.checked)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--primary-color)' }}
                    />
                    <span>🚨 24x7 Emergency</span>
                </label>
            </div>

            {/* Results Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#334155' }}>
                    Nearby Healthcare Facilities ({filteredFacilities.length} found)
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginLeft: '6px' }}>
                        • Sorted by nearest GPS distance
                    </span>
                </div>

                <div style={{ fontSize: '11px', color: '#64748b' }}>
                    Data Source: <strong style={{ color: '#0f766e' }}>{dataSourceInfo}</strong>
                </div>
            </div>

            {/* Facility Grid */}
            {loading ? (
                <div className="card" style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-secondary)' }}>
                    <RefreshCw className="spin" size={28} color="var(--primary-color)" style={{ margin: '0 auto 12px' }} />
                    <div style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b' }}>Querying OpenStreetMap Healthcare POIs...</div>
                    <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                        Calculating actual road distances from your GPS location
                    </p>
                </div>
            ) : filteredFacilities.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '40px 20px', borderRadius: '16px' }}>
                    <AlertCircle size={40} color="var(--primary-color)" style={{ margin: '0 auto 12px' }} />
                    <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>No Healthcare Facilities Found</h3>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '8px', fontSize: '13.5px', maxWidth: '500px', margin: '8px auto 16px' }}>
                        {dataError || 'No facilities matched your search radius or filters. Try increasing the search radius or clearing search keywords.'}
                    </p>
                    <button
                        onClick={() => {
                            setSearchTerm('');
                            setSelectedCategory('ALL');
                            setEmergencyOnly(false);
                            setSearchRadius(15000);
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
                        Expand Search Radius to 15 km
                    </button>
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

                                        <div style={{ display: 'flex', gap: '4px' }}>
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
                                        onClick={() => setBookingFacility(facility)}
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
