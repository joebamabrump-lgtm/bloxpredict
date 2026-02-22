import React, { useState, useEffect } from 'react';
import api from '../api';
import { Shield, Key, ArrowRight, ShoppingCart, ChevronLeft, UserCircle, Zap, Clock, ExternalLink, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LoginPage = ({ onLogin }) => {
    const [key, setKey] = useState('');
    const [nickname, setNickname] = useState('');
    const [referralCode, setReferralCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [freeKeyGenEnabled, setFreeKeyGenEnabled] = useState(false);
    const [freeKeyLoading, setFreeKeyLoading] = useState(false);

    const [authStep, setAuthStep] = useState('login');
    const [tempToken, setTempToken] = useState(null);

    const [isBuying, setIsBuying] = useState(false);
    const [purchaseStep, setPurchaseStep] = useState(1);
    const [settings, setSettings] = useState(null);
    const [selectedCoin, setSelectedCoin] = useState('eth');
    const [selectedDuration, setSelectedDuration] = useState('24');
    const [txHash, setTxHash] = useState('');
    const [purchaseEmail, setPurchaseEmail] = useState('');

    useEffect(() => {
        // Check if free key gen is enabled on mount
        api.get('/api/free-keygen/status').then(res => setFreeKeyGenEnabled(res.data.enabled)).catch(() => { });
        if (isBuying) {
            api.get('/api/public-settings').then(res => setSettings(res.data));
        }
    }, [isBuying]);

    const handleFreeKeyGen = async () => {
        setFreeKeyLoading(true);
        try {
            const res = await api.post('/api/free-keygen/generate');
            setKey(res.data.key);
            setError('');
            // Small delay so user sees key fill in, then auto-focus
            setTimeout(() => document.getElementById('key-input')?.focus(), 100);
        } catch (err) {
            setError(err.response?.data?.message || 'Free key gen failed');
        }
        setFreeKeyLoading(false);
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await api.post('/api/login', { key: key.trim() });
            if (!res.data.isRegistered) {
                setTempToken(res.data.token);
                setAuthStep('set_name');
            } else {
                onLogin(res.data.token, res.data.isAdmin, { ...res.data });
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Verification Error');
        }
        setLoading(false);
    };

    const handleSetName = async (e) => {
        e.preventDefault();
        if (!nickname.trim()) return;
        setLoading(true);
        try {
            const res = await api.post('/api/auth/set-name',
                { name: nickname, referralCode },
                { headers: { Authorization: `Bearer ${tempToken}` } }
            );
            onLogin(res.data.token, res.data.isAdmin, { ...res.data });
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to set identity');
        }
        setLoading(false);
    };

    const handlePurchase = async () => {
        if (!txHash) return alert('Enter TXID');
        setLoading(true);
        try {
            const priceData = settings[`pricing_${selectedDuration}`] || {};
            await api.post('/api/buy-key', {
                txHash,
                coin: selectedCoin,
                durationHours: parseInt(selectedDuration),
                amount: priceData[selectedCoin] || 0,
                email: purchaseEmail
            });
            setPurchaseStep(3);
        } catch (err) {
            alert('Verification failed');
        }
        setLoading(false);
    };

    return (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', perspective: '1000px' }}>
            {/* Background effects */}
            <div style={{ position: 'fixed', top: '10%', left: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(124, 77, 255, 0.1) 0%, transparent 70%)', filter: 'blur(50px)' }}></div>
            <div style={{ position: 'fixed', bottom: '10%', right: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(0, 229, 255, 0.05) 0%, transparent 70%)', filter: 'blur(50px)' }}></div>

            <AnimatePresence mode="wait">
                {!isBuying ? (
                    <motion.div key="auth" initial={{ opacity: 0, rotateY: -15, scale: 0.9 }} animate={{ opacity: 1, rotateY: 0, scale: 1 }} exit={{ opacity: 0, rotateY: 15, scale: 0.9 }} className="glass" style={{ padding: '50px', width: '420px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                        <div style={{ position: 'relative', width: 'fit-content', margin: '0 auto 25px' }}>
                            <Shield size={60} color="var(--primary)" />
                            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 2 }} style={{ position: 'absolute', top: -5, right: -5, width: '15px', height: '15px', borderRadius: '50%', background: 'var(--secondary)', boxShadow: '0 0 10px var(--secondary)' }}></motion.div>
                        </div>

                        <h1 style={{ fontSize: '2.8rem', marginBottom: '8px', fontWeight: '900', letterSpacing: '-1px', background: 'linear-gradient(to right, white, var(--text-dim))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>BloxPredict</h1>
                        <p style={{ color: 'var(--text-dim)', marginBottom: '40px', fontSize: '0.85rem', fontWeight: '500', letterSpacing: '0.5px' }}>NEXT-GEN NEURAL PREDICTION ENGINE</p>

                        <AnimatePresence mode="wait">
                            {authStep === 'login' ? (
                                <motion.form key="login-form" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} onSubmit={handleLogin}>
                                    <div style={{ marginBottom: '30px', textAlign: 'left' }}>
                                        <label style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 'bold', letterSpacing: '1px' }}>LICENSE ACTIVATION</label>
                                        <div style={{ position: 'relative', marginTop: '12px' }}>
                                            <Key size={18} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                                            <input
                                                id="key-input"
                                                type="text"
                                                className="input-field"
                                                style={{ paddingLeft: '50px', letterSpacing: '1px' }}
                                                placeholder="PASTE YOUR KEY HERE"
                                                value={key}
                                                onChange={e => setKey(e.target.value)}
                                                required
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                    {error && <p style={{ color: '#ff5252', fontSize: '0.8rem', marginBottom: '20px', fontWeight: '500' }}>{error}</p>}
                                    <button type="submit" className="btn-primary" style={{ width: '100%', height: '60px', fontSize: '1.2rem', fontWeight: '800' }} disabled={loading}>
                                        {loading ? 'VERIFYING...' : 'ACCESS ENGINE'} <ArrowRight size={20} style={{ marginLeft: '12px' }} />
                                    </button>
                                    {freeKeyGenEnabled && (
                                        <motion.button
                                            type="button"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.97 }}
                                            onClick={handleFreeKeyGen}
                                            disabled={freeKeyLoading}
                                            style={{
                                                width: '100%', height: '50px', marginTop: '12px', borderRadius: '12px',
                                                background: 'transparent', border: '1px solid rgba(0,255,157,0.3)',
                                                color: '#00ff9d', fontWeight: '700', fontSize: '0.85rem',
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                                boxShadow: '0 0 20px rgba(0,255,157,0.1)', transition: 'all 0.3s',
                                                fontFamily: 'inherit'
                                            }}
                                        >
                                            <Zap size={16} />
                                            {freeKeyLoading ? 'GENERATING...' : 'GENERATE FREE KEY (24H)'}
                                        </motion.button>
                                    )}
                                </motion.form>
                            ) : (
                                <motion.form key="name-form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleSetName}>
                                    <div style={{ background: 'rgba(124, 77, 255, 0.05)', padding: '20px', borderRadius: '15px', border: '1px solid rgba(124, 77, 255, 0.1)', marginBottom: '25px' }}>
                                        <UserCircle size={30} color="var(--primary)" style={{ marginBottom: '10px' }} />
                                        <h3 style={{ fontSize: '1rem', marginBottom: '5px' }}>Welcome, Operator</h3>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>License verified. Choose your display name.</p>
                                    </div>
                                    <input
                                        type="text"
                                        className="input-field"
                                        style={{ marginBottom: '20px', textAlign: 'center', fontSize: '1.1rem' }}
                                        placeholder="CHOOSE A NICKNAME"
                                        value={nickname}
                                        onChange={e => setNickname(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                    <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                                        <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 'bold' }}>REFERRAL CODE (OPTIONAL)</label>
                                        <input
                                            type="text"
                                            className="input-field"
                                            style={{ marginTop: '8px', fontSize: '0.9rem' }}
                                            placeholder="ENTER CODE IF REFERRED"
                                            value={referralCode}
                                            onChange={e => setReferralCode(e.target.value)}
                                        />
                                    </div>
                                    <button type="submit" className="btn-primary" style={{ width: '100%', height: '60px', fontWeight: '800' }} disabled={loading}>
                                        {loading ? 'SETTING UP...' : 'CONTINUE TO DASHBOARD'}
                                    </button>
                                </motion.form>
                            )}
                        </AnimatePresence>

                        <div style={{ marginTop: '35px', paddingTop: '25px', borderTop: '1px solid var(--surface-border)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <button onClick={() => setIsBuying(true)} className="glass" style={{ width: '100%', padding: '15px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', fontWeight: '600' }}>
                                <ShoppingCart size={20} /> GET NEW LICENSE
                            </button>

                            <a href="https://discord.gg/DX4r6GbyzX" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                                <div className="glass" style={{ width: '100%', padding: '15px', color: '#5865F2', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', border: '1px solid rgba(88, 101, 242, 0.3)', fontWeight: '600', borderRadius: '12px' }}>
                                    <ExternalLink size={20} /> JOIN THE DISCORD
                                </div>
                            </a>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div key="buy" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass" style={{ padding: '40px', width: '460px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
                        <button onClick={() => { setIsBuying(false); setPurchaseStep(1); }} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', marginBottom: '25px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: '600', opacity: 0.7 }}><ChevronLeft size={18} /> BACK TO LOGIN</button>

                        {purchaseStep === 1 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '25px' }}>
                                    <Zap size={22} color="var(--primary)" />
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: '800' }}>CHOOSE YOUR ACCESS</h3>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '30px' }}>
                                    {['24', '168', '720'].map(h => (
                                        <button key={h} onClick={() => setSelectedDuration(h)} style={{ padding: '15px 10px', borderRadius: '15px', background: selectedDuration === h ? 'var(--primary)' : 'rgba(255,255,255,0.03)', border: selectedDuration === h ? 'none' : '1px solid rgba(255,255,255,0.08)', color: 'white', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                                            <span style={{ fontSize: '0.9rem', fontWeight: '800' }}>{h === '24' ? '1D' : h === '168' ? '7D' : '30D'}</span>
                                            <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>{h === '24' ? 'STARTER' : h === '168' ? 'ELITE' : 'MASTER'}</span>
                                        </button>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '30px' }}>
                                    {['eth', 'ltc', 'btc'].map(coin => (
                                        <motion.div key={coin} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setSelectedCoin(coin)} className="glass" style={{ padding: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: selectedCoin === coin ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.08)', background: selectedCoin === coin ? 'rgba(124, 77, 255, 0.05)' : 'rgba(255,255,255,0.02)', cursor: 'pointer' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>{coin.toUpperCase()}</div>
                                                <span style={{ fontWeight: '700', letterSpacing: '1px' }}>{coin === 'eth' ? 'ETHEREUM' : coin === 'ltc' ? 'LITECOIN' : 'BITCOIN'}</span>
                                            </div>
                                            <span style={{ color: 'var(--primary)', fontWeight: '900', fontSize: '1.1rem' }}>${settings ? (settings[`pricing_${selectedDuration}`]?.[coin] || '0.00') : '...'}</span>
                                        </motion.div>
                                    ))}
                                </div>
                                <button onClick={() => setPurchaseStep(2)} className="btn-primary" style={{ width: '100%', height: '55px', fontWeight: '800' }}>PROCEED TO SECURE CHECKOUT</button>
                            </motion.div>
                        )}

                        {purchaseStep === 2 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                                <h3 style={{ marginBottom: '25px', fontWeight: '800' }}>SECURE PAYMENT</h3>
                                <div className="glass" style={{ padding: '25px', marginBottom: '25px', textAlign: 'center', background: 'rgba(0,0,0,0.2)' }}>
                                    <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginBottom: '10px', fontWeight: 'bold', letterSpacing: '1px' }}>SEND EXACT AMOUNT TO:</p>
                                    <div style={{ padding: '15px', background: 'rgba(0,0,0,0.3)', borderRadius: '12px', border: '1px dashed var(--primary)', wordBreak: 'break-all', fontWeight: 'bold', color: 'var(--secondary)', fontSize: '0.85rem', letterSpacing: '0.5px' }}>
                                        {settings ? settings[`wallet_${selectedCoin}`] : '...'}
                                    </div>
                                    <p style={{ marginTop: '15px', fontSize: '0.65rem', color: 'var(--text-dim)' }}>NETWORK: <span style={{ color: 'white', fontWeight: 'bold' }}>{selectedCoin.toUpperCase()}</span></p>
                                </div>
                                <div style={{ marginBottom: '25px' }}>
                                    <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 'bold', letterSpacing: '1px' }}>DELIVERY EMAIL (FOR KEY)</label>
                                    <input type="email" className="input-field" style={{ marginTop: '10px' }} placeholder="your@email.com" value={purchaseEmail} onChange={e => setPurchaseEmail(e.target.value)} required />
                                </div>
                                <div style={{ marginBottom: '25px' }}>
                                    <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 'bold', letterSpacing: '1px' }}>TRANSACTION HASH (TXID)</label>
                                    <input type="text" className="input-field" style={{ marginTop: '10px' }} placeholder="PASTE TXID HERE" value={txHash} onChange={e => setTxHash(e.target.value)} required />
                                </div>
                                <button onClick={handlePurchase} className="btn-primary" style={{ width: '100%', height: '55px', fontWeight: '800' }} disabled={loading}>{loading ? 'VERIFYING BLOCKCHAIN...' : 'VERIFY PAYMENT'}</button>
                            </motion.div>
                        )}

                        {purchaseStep === 3 && (
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center' }}>
                                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(0, 255, 157, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 25px' }}>
                                    <CheckCircle2 size={45} color="#00ff9d" />
                                </div>
                                <h2 style={{ marginBottom: '10px', fontWeight: '900' }}>PAYMENT SUBMITTED</h2>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '30px' }}>Our system is verifying your transaction on the blockchain.</p>
                                <div className="glass" style={{ padding: '25px', margin: '30px 0', border: '2px dashed var(--primary)', background: 'rgba(124, 77, 255, 0.05)' }}>
                                    <p style={{ fontSize: '0.85rem', color: 'white', fontWeight: 'bold' }}>Key will be sent to:</p>
                                    <p style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--primary)', marginTop: '10px' }}>{purchaseEmail}</p>
                                </div>
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '25px' }}>Verification usually takes 5-15 minutes. You can safely close this page.</p>
                                <button onClick={() => { setIsBuying(false); setPurchaseStep(1); }} className="btn-primary" style={{ width: '100%', height: '55px', fontWeight: '900' }}>RETURN TO LOGIN</button>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LoginPage;
