import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Ticket } from 'lucide-react';

const Status = () => {
    const [appointments, setAppointments] = useState([]);

    useEffect(() => {
        fetchAppointments();
    }, []);

    const fetchAppointments = async () => {
        try {
            const res = await axios.get('/api/appointments/my-list');
            setAppointments(res.data);
        } catch (err) {
            console.log("No appointments yet or auth error");
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <h1 className="animate-enter">Status Dashboard</h1>

            {/* OPD Queue Slip */}
            <motion.div
                className="card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ borderLeft: '5px solid var(--blue-badge-text)', background: 'var(--blue-badge-bg)', padding: '16px', borderRadius: '12px' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>OPD Queue Slip</h3>
                    <Ticket color="var(--blue-badge-text)" />
                </div>
                <div style={{ margin: '16px 0', textAlign: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>YOUR NUMBER</span>
                    <div style={{ fontSize: '48px', fontWeight: '800', color: 'var(--blue-badge-text)' }}>24</div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>EST. WAIT: 15 MINS</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Dr. Sharma (Gen. Med)</span>
                    <span>Room 104</span>
                </div>
            </motion.div>

            {/* Appointments List */}
            <h3>Upcoming Appointments</h3>
            {appointments.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No booked appointments.</p> : (
                appointments.map((apt, i) => (
                    <motion.div
                        key={apt.id}
                        className="card"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                    >
                        <h4 style={{ margin: '0 0 8px 0' }}>{apt.type} Visit</h4>
                        <div style={{ display: 'flex', alignItems: 'center', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                            <Calendar size={12} style={{ marginRight: '6px' }} />
                            {new Date(apt.appointment_date).toLocaleDateString()}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            <Clock size={12} style={{ marginRight: '6px' }} />
                            {apt.slot_time || '10:00 AM'}
                        </div>
                    </motion.div>
                ))
            )}
        </div>
    );
};

export default Status;
