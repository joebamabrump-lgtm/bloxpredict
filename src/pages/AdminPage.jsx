import React, { useState, useEffect, useCallback } from 'react';
import api from '../api';
import {
    Users, Settings, ShieldCheck, Trash2, Wallet, DollarSign, Key, Plus, Zap,
    CheckCircle2, XCircle, Search, Clock, Calendar, Mail, Hash, UserCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- STABLE SUB-COMPONENTS ---

function SidebarButton({ active, onClick, icon, label }) {
    const style = {
        width: '100%', padding: '14px 20px', borderRadius: '12px', border: 'none',
        background: active ? 'var(--primary)' : 'transparent',
        color: active ? 'white' : 'var(--text-dim)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '15px',
        fontWeight: active ? '800' : '600', transition: 'all 0.3s ease', textAlign: 'left',
        boxShadow: active ? '0 10px 20px -5px rgba(124, 77, 255, 0.3)' : 'none',
        fontFamily: 'inherit'
    };
    return (
        <button onClick={onClick} style={style}>
            {icon} <span style={{ fontSize: '0.95rem' }}>{label}</span>
        </button>
    );
}

function LogEntry({ label, time, detail }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
            <div>
                <div style={{ fontSize: '0.8rem', fontWeight: '700' }}>{label}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '2px' }}>{detail}</div>
            </div>
            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginTop: '3px' }}>{time}</div>
        </div>
    );
}

function StatCard({ label, value, icon: Icon, color, delay }) {
    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="glass" style={{ padding: '25px', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '15px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={24} color={color} />
            </div>
            <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 'bold' }}>{label}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: '900' }}>{value}</div>
            </div>
        </motion.div>
    );
}

// --- MAIN ADMIN ENGINE ---

export default function AdminPage({ user }) {
    if (!user) return <div style={{ padding: '100px', textAlign: 'center', color: 'var(--text-dim)' }}>INITIALIZING COMMAND CENTER...</div>;

    const isKeyGenOnly = user.adminType === 'keygen';
    const [activeTab, setActiveTab] = useState(isKeyGenOnly ? 'forge' : 'users');

    // Core Registry States
    const [users, setUsers] = useState([]);
    const [payments, setPayments] = useState([]);
    const [announcements, setAnnouncements] = useState([]);
    const [newAnnouncement, setNewAnnouncement] = useState('');
    const [stats, setStats] = useState({ totalPredictions: 0, totalUsers: 0, totalRevenue: 0 });
    const [loading, setLoading] = useState(false);

    // Licensing Protocols
    const [genHours, setGenHours] = useState(24);
    const [genPrefix, setGenPrefix] = useState('BLOX-');
    const [generatedKey, setGeneratedKey] = useState('');

    // System Variables
    const [settings, setSettings] = useState({
        pricing_24: { eth: '10', ltc: '10', btc: '12' },
        pricing_168: { eth: '50', ltc: '50', btc: '55' },
        pricing_720: { eth: '150', ltc: '150', btc: '165' },
        wallet_eth: '0x...',
        wallet_ltc: 'L...',
        wallet_btc: '1...',
        free_keygen_enabled: false
    });

    const fetchData = useCallback(async () => {
        try {
            if (activeTab === 'users' && !isKeyGenOnly) {
                const res = await api.get('/api/admin/users');
                setUsers(Array.isArray(res.data) ? res.data : []);
            } else if (activeTab === 'payments' && !isKeyGenOnly) {
                const res = await api.get('/api/admin/payments');
                setPayments(Array.isArray(res.data) ? res.data : []);
            } else if (activeTab === 'settings' && !isKeyGenOnly) {
                const res = await api.get('/api/public-settings');
                if (res.data && typeof res.data === 'object' && Object.keys(res.data).length > 0) {
                    setSettings(prev => ({ ...prev, ...res.data }));
                }
            } else if (activeTab === 'announcements' && !isKeyGenOnly) {
                const res = await api.get('/api/announcements');
                setAnnouncements(Array.isArray(res.data) ? res.data : []);
            }

            if (!isKeyGenOnly) {
                const statsRes = await api.get('/api/admin/stats');
                if (statsRes.data) setStats(statsRes.data);
            }
        } catch (err) {
            console.warn('System link unstable');
        }
    }, [activeTab, isKeyGenOnly]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleGenerateKey = async () => {
        setLoading(true);
        try {
            const res = await api.post('/api/admin/generate-key', { hours: genHours, prefix: genPrefix });
            setGeneratedKey(res.data.key);
            fetchData();
        } catch (err) {
            alert('Forge Error');
        }
        setLoading(false);
    };

    const handlePostAnnouncement = async () => {
        if (!newAnnouncement.trim()) return;
        try {
            await api.post('/api/admin/announcements', { content: newAnnouncement });
            setNewAnnouncement('');
            fetchData();
            alert('Announcement Broadcasted');
        } catch (err) {
            alert('Broadcast Failure');
        }
    };

    const confirmAction = async (msg, fn) => { if (window.confirm(msg)) await fn(); };

    const getSafeDate = (d) => {
        try {
            const date = new Date(d);
            return isNaN(date.getTime()) ? 'Pending' : date.toLocaleDateString();
        } catch (e) { return 'Pending'; }
    };

    const getSafeSettingsVal = (key1, key2) => {
        try {
            if (key2) return settings?.[key1]?.[key2] || (settings?.[key1] && typeof settings[key1] === 'object' ? '0.00' : '0.00');
            return settings?.[key1] || '';
        } catch (e) { return '0.00'; }
    };

    const saveSettings = async () => {
        try {
            await api.post('/api/admin/settings', { settings });
            alert('System Config Synchronized');
        } catch (err) {
            alert('Sync Failure');
        }
    };

    const updateBan = async (userId, currentStatus) => {
        try {
            await api.post(`/api/admin/users/${userId}/ban`, { status: currentStatus ? 0 : 1 });
            fetchData();
        } catch (err) {
            alert('Protocol Violation Error');
        }
    };

    const approvePayment = async (id) => {
        try {
            const res = await api.post(`/api/admin/payments/${id}/approve`, {});
            alert('Verified. Key: ' + res.data.key);
            fetchData();
        } catch (err) {
            alert('Verification Error');
        }
    };

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1400px', margin: '0 auto', color: 'white', padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '30px' }}>

                {/* Left Sidebar */}
                <aside>
                    <div className="glass" style={{ padding: '25px', position: 'sticky', top: '20px', minHeight: '82vh', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', padding: '0 10px' }}>
                            <ShieldCheck size={28} color="var(--primary)" />
                            <h2 style={{ fontSize: '1.2rem', fontWeight: '900', letterSpacing: '2px' }}>CORE CMD</h2>
                        </div>

                        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                            {!isKeyGenOnly && (
                                <>
                                    <SidebarButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<Users size={18} />} label="Registry" />
                                    <SidebarButton active={activeTab === 'payments'} onClick={() => setActiveTab('payments')} icon={<Wallet size={18} />} label="Financials" />
                                    <SidebarButton active={activeTab === 'announcements'} onClick={() => setActiveTab('announcements')} icon={<Mail size={18} />} label="Broadcasts" />
                                </>
                            )}
                            <SidebarButton active={activeTab === 'forge'} onClick={() => setActiveTab('forge')} icon={<Key size={18} />} label="License Forge" />
                            {!isKeyGenOnly && (
                                <SidebarButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={18} />} label="Security Node" />
                            )}
                        </nav>

                        <div style={{ marginTop: '20px', padding: '20px', borderRadius: '15px', background: 'rgba(124, 77, 255, 0.05)', border: '1px solid rgba(124, 77, 255, 0.1)' }}>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginBottom: '5px', fontWeight: 'bold' }}>CLEARANCE</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--primary)' }}>{isKeyGenOnly ? 'KEY FORGER' : 'ELITE OVERSEER'}</div>
                        </div>
                    </div>
                </aside>

                {/* Main Control Panel */}
                <main>
                    {!isKeyGenOnly && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
                            <StatCard label="SYNCS" value={stats.totalPredictions || 0} icon={Zap} color="var(--primary)" delay={0} />
                            <StatCard label="NODES" value={stats.totalUsers || 0} icon={Users} color="#00ff9d" delay={0.1} />
                            <StatCard label="CAPITAL" value={`$${(parseFloat(stats.totalRevenue) || 0).toFixed(2)}`} icon={DollarSign} color="var(--secondary)" delay={0.2} />
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {activeTab === 'users' && !isKeyGenOnly && (
                            <motion.div key="users" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                <div className="glass" style={{ padding: '0', overflow: 'hidden' }}>
                                    <div style={{ padding: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--surface-border)' }}>
                                        <h3 style={{ fontWeight: '800' }}>Active Registry</h3>
                                        <div className="glass" style={{ padding: '10px 15px', display: 'flex', alignItems: 'center', gap: '10px', borderRadius: '10px' }}>
                                            <Search size={16} color="var(--text-dim)" />
                                            <input style={{ background: 'transparent', border: 'none', color: 'white', size: '15', outline: 'none' }} placeholder="Filter registry..." />
                                        </div>
                                    </div>
                                    <div style={{ padding: '20px', overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ color: 'var(--text-dim)', fontSize: '0.7rem', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '1px' }}>
                                                    <th style={{ padding: '15px' }}>Identity</th>
                                                    <th>License ID</th>
                                                    <th>Role</th>
                                                    <th>Status</th>
                                                    <th style={{ textAlign: 'right', paddingRight: '25px' }}>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {users.map(u => (
                                                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                                        <td style={{ padding: '20px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                                                <div style={{ position: 'relative' }}>
                                                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                        <UserCircle size={22} color={u.is_admin ? 'var(--primary)' : 'white'} />
                                                                    </div>
                                                                    <div style={{
                                                                        position: 'absolute', bottom: '-2px', right: '-2px', width: '12px', height: '12px', borderRadius: '50%',
                                                                        background: u.is_banned ? '#ff5252' : (u.isOnline ? '#00ff9d' : '#333'),
                                                                        border: '2px solid #0a0a0f', boxShadow: u.isOnline ? '0 0 10px #00ff9d' : 'none'
                                                                    }}></div>
                                                                </div>
                                                                <div>
                                                                    <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{u.username || <span style={{ opacity: 0.4 }}>unregistered</span>}</div>
                                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>UID: {u.id}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td style={{ fontSize: '0.85rem', color: 'var(--secondary)', fontWeight: 'bold', fontFamily: 'monospace' }}>{u.key_value}</td>
                                                        <td>
                                                            {u.is_admin ? <span className="admin-badge">ADMIN</span> : <span style={{ opacity: 0.6, fontSize: '0.7rem' }}>PREMIUM</span>}
                                                        </td>
                                                        <td style={{ fontSize: '0.75rem', color: u.isOnline ? '#00ff9d' : 'var(--text-dim)' }}>{u.isOnline ? 'SYNCED' : 'OFFLINE'}</td>
                                                        <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                                                            <button title="Toggle Ban" onClick={() => updateBan(u.id, u.is_banned)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: u.is_banned ? '#00ff9d' : '#ff5252', marginRight: '10px' }}>
                                                                {u.is_banned ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                                                            </button>
                                                            <button title="Delete License" onClick={() => confirmAction('IRREVERSIBLE: Purge License?', () => api.delete(`/api/admin/keys/${u.id}`).then(fetchData))} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ff5252' }}>
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'payments' && !isKeyGenOnly && (
                            <motion.div key="payments" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                                <div className="glass" style={{ padding: '0', overflow: 'hidden' }}>
                                    <div style={{ padding: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--surface-border)' }}>
                                        <h3 style={{ fontWeight: '800' }}>Inbound Capital</h3>
                                        <div style={{ background: 'rgba(0, 229, 255, 0.1)', color: 'var(--secondary)', padding: '6px 15px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                            AWAITING VERIFICATION: {payments.filter(x => x.status === 'pending').length}
                                        </div>
                                    </div>
                                    <div style={{ padding: '20px', overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ color: 'var(--text-dim)', fontSize: '0.7rem', textAlign: 'left', textTransform: 'uppercase' }}>
                                                    <th style={{ padding: '15px' }}>Date / Operator</th>
                                                    <th>Asset</th>
                                                    <th>Amount</th>
                                                    <th>Verification ID</th>
                                                    <th style={{ textAlign: 'right', paddingRight: '25px' }}>Protocol</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {payments.map(p => (
                                                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                                        <td style={{ padding: '15px' }}>
                                                            <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>{getSafeDate(p.created_at)}</div>
                                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>{p.email}</div>
                                                        </td>
                                                        <td style={{ fontWeight: '800', color: 'var(--secondary)' }}>{p.coin?.toUpperCase()}</td>
                                                        <td style={{ fontWeight: '900', fontSize: '1rem' }}>${(parseFloat(p.amount) || 0).toFixed(2)}</td>
                                                        <td>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <Hash size={12} color="var(--text-dim)" />
                                                                <span style={{ fontSize: '0.7rem', opacity: 0.5, fontFamily: 'monospace' }}>{p.tx_hash?.substring(0, 16)}...</span>
                                                            </div>
                                                        </td>
                                                        <td style={{ textAlign: 'right', paddingRight: '15px' }}>
                                                            {p.status === 'pending' ? (
                                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                                                    <button onClick={() => approvePayment(p.id)} className="btn-primary" style={{ padding: '8px 15px', fontSize: '0.7rem', height: 'auto', borderRadius: '8px' }}>APPROVE</button>
                                                                    <button onClick={() => confirmAction('DENY Transaction?', () => api.post(`/api/admin/payments/${p.id}/reject`).then(fetchData))} style={{ color: '#ff5252', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 'bold' }}>DENY</button>
                                                                </div>
                                                            ) : (
                                                                <span style={{ fontSize: '0.7rem', fontWeight: '900', color: p.status === 'approved' ? '#00ff9d' : '#ff5252' }}>{p.status?.toUpperCase()}</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'forge' && (
                            <motion.div key="forge" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
                                <div className="glass" style={{ padding: '40px', maxWidth: '700px' }}>
                                    <h3 style={{ fontSize: '1.4rem', fontWeight: '900', marginBottom: '30px' }}>License Forge</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                                        <div>
                                            <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 'bold' }}>KEY PREFIX</label>
                                            <input className="input-field" style={{ marginTop: '10px' }} value={genPrefix} onChange={e => setGenPrefix(e.target.value)} />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 'bold' }}>LIFE SPAN</label>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginTop: '10px' }}>
                                                {[24, 168, 720, 0].map(h => (
                                                    <button key={h} onClick={() => setGenHours(h)} className="glass" style={{ padding: '10px 0', fontSize: '0.7rem', border: genHours === h ? '1px solid var(--primary)' : '1px solid transparent', background: genHours === h ? 'rgba(124,77,255,0.1)' : 'transparent', color: 'white', cursor: 'pointer' }}>
                                                        {h === 0 ? 'INF' : h === 24 ? '1D' : h === 168 ? '7D' : '30D'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={handleGenerateKey} className="btn-primary" style={{ width: '100%', height: '60px' }} disabled={loading}>
                                        {loading ? 'FORGING...' : 'GENERATE LICENSE'} <Plus size={20} style={{ marginLeft: '10px' }} />
                                    </button>
                                    {generatedKey && (
                                        <div style={{ marginTop: '20px', padding: '20px', background: 'rgba(0,255,157,0.05)', borderRadius: '15px', border: '1px solid rgba(0,255,157,0.2)', textAlign: 'center' }}>
                                            <div style={{ fontSize: '1.6rem', fontWeight: '900', letterSpacing: '2px', color: '#00ff9d' }}>{generatedKey}</div>
                                            <button onClick={() => navigator.clipboard.writeText(generatedKey)} style={{ marginTop: '10px', background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.8rem' }}>COPY TO CLIPBOARD</button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'settings' && !isKeyGenOnly && (
                            <motion.div key="settings" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                                    <div className="glass" style={{ padding: '30px' }}>
                                        <h3 style={{ marginBottom: '20px', fontWeight: '800' }}>Pricing Nodes (USD)</h3>
                                        {['24', '168', '720'].map(dur => (
                                            <div key={dur} style={{ marginBottom: '25px' }}>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '12px', color: 'var(--text-dim)' }}>{dur} HOUR ACCESS</div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                                    {['eth', 'ltc', 'btc'].map(coin => (
                                                        <div key={coin}>
                                                            <div style={{ fontSize: '0.6rem', opacity: 0.5, marginBottom: '5px' }}>{coin.toUpperCase()}</div>
                                                            <input className="input-field" style={{ padding: '8px 12px', fontSize: '0.9rem' }} value={getSafeSettingsVal(`pricing_${dur}`, coin)} onChange={e => {
                                                                const key = `pricing_${dur}`;
                                                                setSettings(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [coin]: e.target.value } }));
                                                            }} />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                                        <div className="glass" style={{ padding: '30px' }}>
                                            <h3 style={{ marginBottom: '20px', fontWeight: '800' }}>Wallet Nodes</h3>
                                            {['eth', 'ltc', 'btc'].map(coin => (
                                                <div key={coin} style={{ marginBottom: '20px' }}>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 'bold', marginBottom: '8px' }}>{coin.toUpperCase()} ADDRESS</div>
                                                    <input className="input-field" style={{ fontSize: '0.85rem', fontFamily: 'monospace' }} value={getSafeSettingsVal(`wallet_${coin}`)} onChange={e => setSettings(prev => ({ ...prev, [`wallet_${coin}`]: e.target.value }))} />
                                                </div>
                                            ))}
                                        </div>

                                        {/* Free Key Gen Toggle */}
                                        <div className="glass" style={{ padding: '30px' }}>
                                            <h3 style={{ marginBottom: '8px', fontWeight: '800' }}>Free Key Generator</h3>
                                            <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '25px' }}>
                                                When ON, a "Generate Free Key" button appears on the login screen. Users can claim one free 24h key without paying.
                                            </p>
                                            <div
                                                onClick={() => setSettings(prev => ({ ...prev, free_keygen_enabled: !prev.free_keygen_enabled }))}
                                                style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    padding: '20px', borderRadius: '15px', cursor: 'pointer',
                                                    background: settings.free_keygen_enabled ? 'rgba(0,255,157,0.05)' : 'rgba(255,82,82,0.05)',
                                                    border: `1px solid ${settings.free_keygen_enabled ? 'rgba(0,255,157,0.3)' : 'rgba(255,82,82,0.2)'}`,
                                                    transition: 'all 0.3s ease'
                                                }}
                                            >
                                                <div>
                                                    <div style={{ fontWeight: '900', fontSize: '1rem', color: settings.free_keygen_enabled ? '#00ff9d' : '#ff5252' }}>
                                                        {settings.free_keygen_enabled ? '● ACTIVE' : '○ DISABLED'}
                                                    </div>
                                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                                                        {settings.free_keygen_enabled ? 'Users can generate free keys on login screen' : 'Login screen shows no free key option'}
                                                    </div>
                                                </div>
                                                {/* Toggle switch */}
                                                <div style={{
                                                    width: '50px', height: '26px', borderRadius: '13px',
                                                    background: settings.free_keygen_enabled ? '#00ff9d' : 'rgba(255,255,255,0.1)',
                                                    position: 'relative', transition: 'all 0.3s ease',
                                                    boxShadow: settings.free_keygen_enabled ? '0 0 15px rgba(0,255,157,0.5)' : 'none'
                                                }}>
                                                    <div style={{
                                                        position: 'absolute', top: '3px',
                                                        left: settings.free_keygen_enabled ? '27px' : '3px',
                                                        width: '20px', height: '20px', borderRadius: '50%',
                                                        background: settings.free_keygen_enabled ? '#000' : 'rgba(255,255,255,0.5)',
                                                        transition: 'all 0.3s ease'
                                                    }} />
                                                </div>
                                            </div>
                                        </div>

                                        <button onClick={saveSettings} className="btn-primary" style={{ height: '55px', fontWeight: '900' }}>SAVE SYSTEM STATE</button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'announcements' && !isKeyGenOnly && (
                            <motion.div key="announcements" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '25px' }}>
                                    <div className="glass" style={{ padding: '30px' }}>
                                        <h3 style={{ marginBottom: '25px', fontWeight: '900' }}>Global Broadcasts</h3>
                                        <textarea
                                            value={newAnnouncement}
                                            onChange={e => setNewAnnouncement(e.target.value)}
                                            placeholder="Transmission content... (All operators will be forced to acknowledge on next sync)"
                                            className="input-field"
                                            style={{ minHeight: '150px', marginBottom: '20px', resize: 'none' }}
                                        />
                                        <button onClick={handlePostAnnouncement} className="btn-primary" style={{ height: '60px', width: '100%', borderRadius: '15px' }}>
                                            <Zap size={18} style={{ marginRight: '10px' }} /> BROADCAST TO ALL NODES
                                        </button>
                                    </div>
                                    <div className="glass" style={{ padding: '30px' }}>
                                        <h4 style={{ marginBottom: '20px', color: 'var(--text-dim)', fontWeight: 'bold', fontSize: '0.7rem', textTransform: 'uppercase' }}>Transmission Archive</h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxHeight: '500px', overflowY: 'auto' }} className="custom-scroll">
                                            {announcements.map(a => (
                                                <div key={a.id} className="glass" style={{ padding: '15px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                                        <span style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: '900' }}>BY {a.author_name?.toUpperCase() || 'SYSTEM'}</span>
                                                        <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>{new Date(a.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                    <p style={{ fontSize: '0.8rem', lineHeight: '1.4', opacity: 0.8 }}>{a.content}</p>
                                                </div>
                                            ))}
                                            {announcements.length === 0 && (
                                                <div style={{ textAlign: 'center', py: '40px', opacity: 0.2 }}>
                                                    <Mail size={40} />
                                                    <p style={{ fontSize: '0.7rem', mt: '10px' }}>No past broadcasts</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </main>
            </div>

            <style>{`
                .admin-badge { padding: 4px 8px; background: rgba(124, 77, 255, 0.1); color: var(--primary); border: 1px solid rgba(124, 77, 255, 0.2); border-radius: 6px; font-size: 0.6rem; font-weight: 900; }
                .glass-btn { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
                .glass-btn:hover { background: rgba(255, 255, 255, 0.08); transform: translateY(-1px); }
            `}</style>
        </div>
    );
}
