import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Video, PhoneCall } from 'lucide-react';

const Support = () => {
    return (
        <div style={{ padding: '20px' }}>
            <h1 className="animate-enter">Help & Support</h1>

            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                    <PhoneCall color="#34C759" style={{ marginRight: '10px' }} />
                    <h3>Emergency Helpline</h3>
                </div>
                <h2 style={{ color: '#34C759', margin: 0 }}>1800-123-4567</h2>
                <p>24x7 Ambulance & Emergency</p>
            </div>

            <h3 style={{ marginTop: '24px' }}>Resources</h3>
            <div className="card" style={{ display: 'flex', alignItems: 'center' }}>
                <BookOpen style={{ marginRight: '16px' }} />
                <div>
                    <b>User Manual</b>
                    <div style={{ fontSize: '12px', color: '#8E8E93' }}>PDF Guide (2.5 MB)</div>
                </div>
            </div>
            <div className="card" style={{ display: 'flex', alignItems: 'center' }}>
                <Video style={{ marginRight: '16px' }} />
                <div>
                    <b>Video Tutorials</b>
                    <div style={{ fontSize: '12px', color: '#8E8E93' }}>How to book OPD?</div>
                </div>
            </div>
        </div>
    );
};

export default Support;
