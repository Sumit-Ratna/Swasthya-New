import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Activity, Bell, Droplets, Pill, FileText, MessageSquareHeart } from 'lucide-react';
import { motion } from 'framer-motion';
import FeedbackModal from '../components/FeedbackModal';

const Notifications = () => {
    const navigate = useNavigate();
    
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            const res = await axios.get('/api/notifications', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(res.data);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    const markAllRead = async () => {
        const unread = notifications.filter(n => !n.is_read);
        for (let n of unread) {
            try {
                const token = localStorage.getItem('accessToken');
                await axios.put(`/api/notifications/${n.id}/read`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (err) {
                console.error(err);
            }
        }
        setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    };

    return (
        <div style={{ padding: '20px', minHeight: '100vh', background: 'var(--bg-color)' }}>
            <header style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
                <button
                    onClick={() => navigate(-1)}
                    style={{ background: 'none', border: 'none', padding: 0, marginRight: '16px', cursor: 'pointer', color: 'var(--text-primary)' }}
                >
                    <ArrowLeft size={24} />
                </button>
                <div style={{ flex: 1 }}>
                    <h1 className="animate-enter" style={{ margin: 0, fontSize: '24px', color: 'var(--text-primary)' }}>Notifications</h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                        onClick={() => setIsFeedbackOpen(true)}
                        style={{
                            background: '#ccfbf1',
                            border: '1px solid #99f6e4',
                            color: '#0f766e',
                            padding: '6px 10px',
                            borderRadius: '16px',
                            fontWeight: 700,
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        <MessageSquareHeart size={14} />
                        <span>Feedback</span>
                    </button>
                    <button 
                        onClick={markAllRead}
                        style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                        Mark Read
                    </button>
                </div>
            </header>

            <FeedbackModal 
                isOpen={isFeedbackOpen} 
                onClose={() => setIsFeedbackOpen(false)} 
            />

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading...</div>
            ) : notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    <Bell size={48} style={{ opacity: 0.5, margin: '0 auto 16px' }} />
                    <p>No notifications yet</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {notifications.map((notif, index) => (
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            key={notif.id}
                            style={{
                                display: 'flex',
                                gap: '16px',
                                padding: '16px',
                                background: notif.is_read ? 'var(--card-bg)' : 'var(--card-bg-highlight, rgba(0, 122, 255, 0.05))',
                                border: '1px solid var(--border-color)',
                                borderRadius: '16px',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            {!notif.is_read && (
                                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: 'var(--primary-color)' }} />
                            )}
                            <div style={{
                                width: '48px', height: '48px', borderRadius: '50%',
                                background: 'var(--primary-light)', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', flexShrink: 0
                            }}>
                                <Bell color="var(--primary-color)" size={24} />
                            </div>
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                    <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>{notif.title}</h3>
                                </div>
                                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                    {notif.message}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Notifications;
