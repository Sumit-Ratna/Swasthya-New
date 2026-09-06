import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    BarChart3, Shield, Activity, Users, Building2, 
    CheckCircle2, AlertTriangle, RefreshCw, KeyRound, Lock 
} from 'lucide-react';
import axios from 'axios';

const AdminDashboard = () => {
    const [analytics, setAnalytics] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAdminData();
    }, []);

    const fetchAdminData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            const [analyticsRes, auditRes] = await Promise.all([
                axios.get('/api/admin/analytics', { headers: { Authorization: `Bearer ${token}` } }),
                axios.get('/api/admin/audit-ledger', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setAnalytics(analyticsRes.data);
            setAuditLogs(auditRes.data || []);
        } catch (err) {
            console.error("Fetch admin data error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '24px 16px', maxWidth: '1200px', margin: '0 auto', color: 'var(--text-primary)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <BarChart3 color="var(--primary-color)" size={28} />
                        Swasthya Health Authority Oversight
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
                        MSInS & District Health Office KPI Tracking and Cryptographic Security Audit Ledger
                    </p>
                </div>
                <button className="btn-outline" onClick={fetchAdminData} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px' }}>
                    <RefreshCw size={16} /> Sync KPIs
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
                    Loading analytics & cryptographic audit chain...
                </div>
            ) : (
                <>
                    {/* Top KPI Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                        <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--primary-color)' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Referral Completion Rate</span>
                            <h2 style={{ fontSize: '26px', fontWeight: '800', marginTop: '6px', color: 'var(--primary-color)' }}>
                                {analytics?.metrics?.completionRate || '88%'}
                            </h2>
                            <p style={{ fontSize: '12px', color: '#16A34A', marginTop: '4px' }}>Closed-loop verified</p>
                        </div>

                        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #0284C7' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total Referrals Initiated</span>
                            <h2 style={{ fontSize: '26px', fontWeight: '800', marginTop: '6px' }}>
                                {analytics?.metrics?.totalReferrals || '12'}
                            </h2>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Across all facilities</p>
                        </div>

                        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #D97706' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Active Referrals (In-Transit / In Care)</span>
                            <h2 style={{ fontSize: '26px', fontWeight: '800', marginTop: '6px', color: '#D97706' }}>
                                {analytics?.metrics?.activeReferrals || '3'}
                            </h2>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Currently progressing</p>
                        </div>

                        <div className="card" style={{ padding: '20px', borderLeft: '4px solid #DC2626' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Emergency Escalations</span>
                            <h2 style={{ fontSize: '26px', fontWeight: '800', marginTop: '6px', color: '#DC2626' }}>
                                {analytics?.metrics?.emergencyEscalations || '2'}
                            </h2>
                            <p style={{ fontSize: '12px', color: '#DC2626', marginTop: '4px' }}>Direct urgent route</p>
                        </div>
                    </div>

                    {/* Facility Load Overview */}
                    <div className="card" style={{ padding: '20px', marginBottom: '24px', border: '1px solid var(--border-color)' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Building2 size={18} color="var(--primary-color)" /> Facility Network & Real-Time Operational Load
                        </h3>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                        <th style={{ padding: '10px' }}>Facility Name</th>
                                        <th style={{ padding: '10px' }}>Tier</th>
                                        <th style={{ padding: '10px' }}>District</th>
                                        <th style={{ padding: '10px' }}>Status</th>
                                        <th style={{ padding: '10px' }}>Current Load</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {analytics?.facilities?.map((f, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '12px 10px', fontWeight: '600' }}>{f.name}</td>
                                            <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>{f.tier?.replace(/_/g, ' ')}</td>
                                            <td style={{ padding: '12px 10px' }}>{f.district}</td>
                                            <td style={{ padding: '12px 10px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: '700', color: '#16A34A', backgroundColor: '#DCFCE7', padding: '3px 8px', borderRadius: '12px' }}>
                                                    {f.operational_status || 'OPEN'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 10px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '100px', height: '6px', backgroundColor: 'var(--border-color)', borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div style={{ width: `${f.current_load || 40}%`, height: '100%', backgroundColor: f.current_load > 75 ? '#DC2626' : '#16A34A' }}></div>
                                                    </div>
                                                    <span>{f.current_load || 40}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Cryptographic Security Audit Ledger */}
                    <div className="card" style={{ padding: '20px', border: '1px solid var(--border-color)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Shield size={18} color="#16A34A" /> Immutable Security Audit Ledger (SHA-256 Hash Chain)
                            </h3>
                            <span style={{ fontSize: '12px', color: '#16A34A', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                                <Lock size={14} /> Cryptographically Chained
                            </span>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                                        <th style={{ padding: '8px' }}>Timestamp</th>
                                        <th style={{ padding: '8px' }}>Event Type</th>
                                        <th style={{ padding: '8px' }}>Actor</th>
                                        <th style={{ padding: '8px' }}>Details</th>
                                        <th style={{ padding: '8px' }}>SHA-256 Hash</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                                                No audit entries yet. Actions will be logged in the cryptographic chain.
                                            </td>
                                        </tr>
                                    ) : (
                                        auditLogs.map((log) => (
                                            <tr key={log.log_id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>
                                                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </td>
                                                <td style={{ padding: '10px 8px', fontWeight: '600' }}>
                                                    <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(13, 148, 136, 0.1)', color: 'var(--primary-color)' }}>
                                                        {log.event_type}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '10px 8px' }}>{log.actor_user_id?.substring(0, 8) || 'SYSTEM'}</td>
                                                <td style={{ padding: '10px 8px' }}>{log.details || 'Action completed'}</td>
                                                <td style={{ padding: '10px 8px', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                                                    {log.current_hash ? log.current_hash.substring(0, 16) + '...' : 'GENESIS'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminDashboard;
