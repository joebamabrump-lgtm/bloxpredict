import React, { useState, useEffect } from 'react';
import api from '../api';
import { LayoutGrid, Pyramid, Zap, BrainCircuit, History, Hash, Fingerprint, ShieldAlert, Database, Sparkles, ChevronLeft, RefreshCcw, Settings, Sliders, Activity, Info, Lock, Crown, Copy, Download, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Dashboard = ({ user, isPremium, isAdmin }) => {
    const [activeTab, setActiveTab] = useState(isPremium ? 'esp' : 'mines');
    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(false);
    const [confidence, setConfidence] = useState(null);
    const [history, setHistory] = useState([]);
    const [showingHistory, setShowingHistory] = useState(false);
    const [selectedHistory, setSelectedHistory] = useState(null);
    const [espScript, setEspScript] = useState('');
    const [predictionsRemaining, setPredictionsRemaining] = useState(null);
    const [copied, setCopied] = useState(false);

    const [flowState, setFlowState] = useState('idle');

    const [clientSeed, setClientSeed] = useState('');
    const [serverSeedHash, setServerSeedHash] = useState('');
    const [nonce, setNonce] = useState(0);
    const [minesCount, setMinesCount] = useState(3);
    const [predictionCount, setPredictionCount] = useState(5);
    const [algorithm, setAlgorithm] = useState('neural_v4');
    const [actualOutcome, setActualOutcome] = useState(null);

    useEffect(() => {
        if (activeTab === 'mines') {
            setActualOutcome(Array.from({ length: 5 }, () => Array(5).fill(false)));
        } else if (activeTab === 'towers') {
            setActualOutcome(Array.from({ length: 8 }, () => null));
        }
    }, [activeTab]);

    useEffect(() => {
        if (!isPremium) {
            fetchHistory();
        }
    }, []);

    useEffect(() => {
        if (isPremium || isAdmin) {
            fetchEspScript();
        }
    }, [isPremium, isAdmin]);

    const fetchHistory = async () => {
        try {
            const res = await api.get('/api/history');
            setHistory(res.data);
        } catch (err) {
            console.error('Failed to fetch history');
        }
    };

    const fetchEspScript = async () => {
        try {
            const res = await api.get('/api/esp-script');
            setEspScript(res.data.script);
        } catch (err) {
            console.error('Failed to fetch ESP script');
        }
    };

    const getPrediction = async () => {
        if (!clientSeed || !serverSeedHash) return alert('Input Seeds First (Parameters section)');

        setLoading(true);
        setPrediction(null);
        setFlowState('idle');
        try {
            const response = await api.post('/api/predict', {
                gameType: activeTab, clientSeed, serverSeedHash, nonce, minesCount, predictionCount, algorithm
            });

            if (response.data.predictionsRemaining !== null && response.data.predictionsRemaining !== undefined) {
                setPredictionsRemaining(response.data.predictionsRemaining);
            }

            setTimeout(() => {
                setPrediction(response.data.prediction);
                setConfidence(response.data.confidence);
                setLoading(false);
                setFlowState('showing_prediction');
            }, 1200);
        } catch (err) {
            setLoading(false);
            alert(err.response?.data?.message || 'Neural engine failure');
        }
    };

    const syncOutcome = async () => {
        try {
            await api.post('/api/confirm-outcome', {
                gameType: activeTab, minesCount, prediction, actual_outcome: actualOutcome,
                clientSeed, serverSeedHash, nonce, confidence
            });
            setFlowState('idle');
            setPrediction(null);
            setNonce(prev => prev + 1);
            setActualOutcome(activeTab === 'mines' ? Array.from({ length: 5 }, () => Array(5).fill(false)) : Array.from({ length: 8 }, () => null));
            fetchHistory();
        } catch (err) {
            alert('Failed to sync outcome');
        }
    };

    const toggleActualMine = (r, c) => {
        if (activeTab === 'mines') {
            const NewOutcome = [...actualOutcome.map(row => [...row])];
            NewOutcome[r][c] = !NewOutcome[r][c];
            setActualOutcome(NewOutcome);
        } else {
            const NewOutcome = [...actualOutcome];
            NewOutcome[r] = c;
            setActualOutcome(NewOutcome);
        }
    };

    const renderGrid = (gridData, type = 'display') => {
        if (!gridData) return null;
        const isMines = activeTab === 'mines';

        if (isMines) {
            return (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 55px)', gap: '10px' }}
                >
                    {gridData.map((row, i) => row.map((val, j) => (
                        <motion.div
                            key={`${i}-${j}`}
                            whileHover={type === 'input' ? { scale: 1.05, background: 'rgba(255,255,255,0.1)' } : {}}
                            onClick={() => type === 'input' && toggleActualMine(i, j)}
                            initial={val ? { scale: 0, rotate: -20 } : {}}
                            animate={val ? { scale: 1, rotate: 0 } : {}}
                            style={{
                                width: '55px', height: '55px', borderRadius: '12px',
                                background: val ? (type === 'input' ? 'rgba(255, 82, 82, 0.2)' : 'linear-gradient(135deg, var(--primary), var(--secondary))') : 'rgba(255,255,255,0.03)',
                                border: val ? 'none' : '1px solid rgba(255,255,255,0.08)',
                                boxShadow: val ? '0 0 15px rgba(124, 77, 255, 0.4)' : 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: type === 'input' ? 'pointer' : 'default',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            {val && (type === 'input' ? <ShieldAlert size={20} color="#ff5252" /> : <Sparkles size={18} color="white" />)}
                        </motion.div>
                    )))}
                </motion.div>
            );
        } else {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {gridData.map((choice, i) => (
                        <motion.div key={i} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05 }} style={{ display: 'flex', gap: '8px' }}>
                            {[0, 1, 2].map(idx => (
                                <motion.div
                                    key={idx}
                                    whileHover={type === 'input' ? { scale: 1.05 } : {}}
                                    onClick={() => type === 'input' && toggleActualMine(i, idx)}
                                    style={{
                                        width: '80px', height: '38px', borderRadius: '8px',
                                        background: choice === idx ? (type === 'input' ? 'rgba(255, 82, 82, 0.4)' : 'var(--primary)') : 'rgba(255,255,255,0.03)',
                                        border: choice === idx ? 'none' : '1px solid rgba(255,255,255,0.08)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: type === 'input' ? 'pointer' : 'default'
                                    }}
                                >
                                    {choice === idx && (type === 'input' ? <ShieldAlert size={14} color="#ff5252" /> : <Sparkles size={14} color="white" />)}
                                </motion.div>
                            ))}
                        </motion.div>
                    )).reverse()}
                </div>
            );
        }
    };

    // ========== PREMIUM DASHBOARD: ESP Script Page ==========
    if (isPremium || isAdmin) {
        return (
            <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', color: 'white', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                    <section style={{ width: '100%', maxWidth: '850px' }}>
                        <div className="glass" style={{ padding: '30px', minHeight: '650px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(124, 77, 255, 0.05) 0%, transparent 70%)' }}></div>

                            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px', zIndex: 1 }}>
                                <div style={{ display: 'flex', gap: '15px' }}>
                                    <button onClick={() => setActiveTab('esp')} style={{ padding: '12px 25px', borderRadius: '12px', border: 'none', background: activeTab === 'esp' ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600', transition: 'all 0.3s', fontFamily: 'inherit' }}>
                                        <Zap size={18} /> ESP Script
                                    </button>
                                    <button onClick={() => setActiveTab('instructions')} style={{ padding: '12px 25px', borderRadius: '12px', border: 'none', background: activeTab === 'instructions' ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600', transition: 'all 0.3s', fontFamily: 'inherit' }}>
                                        <Info size={18} /> Instructions
                                    </button>
                                </div>
                                <div style={{ background: 'rgba(0, 229, 255, 0.1)', padding: '8px 16px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Crown size={16} color="var(--secondary)" />
                                    <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--secondary)' }}>PREMIUM</span>
                                </div>
                            </header>

                            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.15)', borderRadius: '25px', border: '1px solid var(--surface-border)', padding: '40px', position: 'relative' }}>
                                {activeTab === 'esp' ? (
                                    <div style={{ width: '100%', textAlign: 'center' }}>
                                        <div style={{ marginBottom: '30px' }}>
                                            <div style={{ width: '80px', height: '80px', borderRadius: '25px', background: 'rgba(124, 77, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                                <Zap size={40} color="var(--primary)" />
                                            </div>
                                            <h2 style={{ fontSize: '1.8rem', fontWeight: '900', letterSpacing: '1px' }}>ESP USERSCRIPT</h2>
                                            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '10px' }}>Copy or download the script. Use with Tampermonkey or browser console.</p>
                                        </div>

                                        <div className="glass" style={{ background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '15px', position: 'relative', textAlign: 'left', marginBottom: '25px' }}>
                                            <pre style={{ margin: 0, fontSize: '0.75rem', color: 'var(--primary)', fontFamily: 'monospace', maxHeight: '200px', overflowY: 'auto' }}>
                                                {espScript || '// Loading script...'}
                                            </pre>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(espScript);
                                                    setCopied(true);
                                                    setTimeout(() => setCopied(false), 2000);
                                                }}
                                                className="btn-primary"
                                                style={{ height: '55px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                                            >
                                                <Copy size={18} /> {copied ? 'COPIED!' : 'COPY SCRIPT'}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const blob = new Blob([espScript], { type: 'text/javascript' });
                                                    const url = URL.createObjectURL(blob);
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = 'blox_esp.js';
                                                    a.click();
                                                }}
                                                className="glass"
                                                style={{ height: '55px', color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer' }}
                                            >
                                                <Download size={18} /> DOWNLOAD .JS
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ width: '100%', textAlign: 'left' }}>
                                        <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '25px', color: 'var(--primary)' }}>GETTING STARTED</h2>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                            {[
                                                { num: 1, title: 'Install Tampermonkey', desc: 'Download the Tampermonkey extension for your browser (Chrome, Edge, or Brave).' },
                                                { num: 2, title: 'Copy the ESP Script', desc: 'Go to the "ESP Script" tab on this dashboard and click the "COPY SCRIPT" button.' },
                                                { num: 3, title: 'Create New Script', desc: 'Open Tampermonkey → "Create a new script" → Paste the code and press CTRL+S to save.' },
                                                { num: 4, title: 'Sync & Play', desc: 'Refresh BloxFlip or BloxGame. The predictor menu will appear at the bottom automatically.' }
                                            ].map(step => (
                                                <div key={step.num} className="glass" style={{ padding: '20px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                                                        <div style={{ minWidth: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.8rem' }}>{step.num}</div>
                                                        <div>
                                                            <div style={{ fontWeight: '800', fontSize: '1rem', marginBottom: '5px' }}>{step.title}</div>
                                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>{step.desc}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        );
    }

    // ========== FREE USER DASHBOARD: Website Predictor ==========
    return (
        <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', color: 'white', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <section style={{ width: '100%', maxWidth: '850px' }}>
                    <div className="glass" style={{ padding: '30px', minHeight: '650px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(124, 77, 255, 0.05) 0%, transparent 70%)' }}></div>

                        {!showingHistory ? (
                            <>
                                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px', zIndex: 1, flexWrap: 'wrap', gap: '12px' }}>
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        {/* Game type tabs */}
                                        <button onClick={() => setActiveTab('mines')} style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', background: activeTab === 'mines' ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', transition: 'all 0.3s', fontFamily: 'inherit', fontSize: '0.85rem' }}>
                                            <LayoutGrid size={16} /> Mines
                                        </button>
                                        <button onClick={() => setActiveTab('towers')} style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', background: activeTab === 'towers' ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', transition: 'all 0.3s', fontFamily: 'inherit', fontSize: '0.85rem' }}>
                                            <Pyramid size={16} /> Towers
                                        </button>

                                        {/* Greyed out ESP tab */}
                                        <div style={{ position: 'relative' }}>
                                            <button disabled style={{ padding: '10px 20px', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.25)', cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', fontSize: '0.85rem', fontFamily: 'inherit', opacity: 0.5 }}>
                                                <Lock size={14} /> ESP Script
                                                <span style={{ background: 'linear-gradient(135deg, #ffc107, #ff9800)', padding: '2px 8px', borderRadius: '6px', fontSize: '0.55rem', fontWeight: '900', color: '#000', marginLeft: '4px' }}>PREMIUM</span>
                                            </button>
                                        </div>

                                        <button onClick={() => setShowingHistory(true)} style={{ padding: '10px 20px', borderRadius: '12px', border: 'none', background: 'rgba(255,255,255,0.05)', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600', transition: 'all 0.3s', fontFamily: 'inherit', fontSize: '0.85rem' }}>
                                            <History size={16} /> History
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        {predictionsRemaining !== null && (
                                            <div style={{ background: predictionsRemaining <= 10 ? 'rgba(255, 82, 82, 0.1)' : 'rgba(0, 229, 255, 0.1)', padding: '8px 14px', borderRadius: '10px', border: `1px solid ${predictionsRemaining <= 10 ? 'rgba(255, 82, 82, 0.2)' : 'rgba(0, 229, 255, 0.2)'}` }}>
                                                <span style={{ fontSize: '0.7rem', fontWeight: '800', color: predictionsRemaining <= 10 ? '#ff5252' : 'var(--secondary)' }}>{predictionsRemaining} LEFT TODAY</span>
                                            </div>
                                        )}
                                        <AnimatePresence>
                                            {confidence && (
                                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ textAlign: 'right', background: 'rgba(124, 77, 255, 0.1)', padding: '8px 14px', borderRadius: '12px', border: '1px solid rgba(124, 77, 255, 0.2)' }}>
                                                    <div style={{ color: 'var(--primary)', fontWeight: '900', fontSize: '1.1rem' }}>{confidence}</div>
                                                    <div style={{ fontSize: '0.55rem', color: 'var(--text-dim)', fontWeight: 'bold' }}>CONFIDENCE</div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </header>

                                {/* Parameters section */}
                                <div style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontWeight: 'bold', letterSpacing: '1px' }}>CLIENT SEED</label>
                                        <input className="input-field" style={{ marginTop: '6px', padding: '10px 14px', fontSize: '0.85rem' }} value={clientSeed} onChange={e => setClientSeed(e.target.value)} placeholder="Enter client seed" />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontWeight: 'bold', letterSpacing: '1px' }}>SERVER SEED HASH</label>
                                        <input className="input-field" style={{ marginTop: '6px', padding: '10px 14px', fontSize: '0.85rem' }} value={serverSeedHash} onChange={e => setServerSeedHash(e.target.value)} placeholder="Enter hash" />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontWeight: 'bold', letterSpacing: '1px' }}>NONCE</label>
                                        <input className="input-field" type="number" style={{ marginTop: '6px', padding: '10px 14px', fontSize: '0.85rem' }} value={nonce} onChange={e => setNonce(parseInt(e.target.value) || 0)} />
                                    </div>
                                </div>

                                {activeTab === 'mines' && (
                                    <div style={{ marginBottom: '20px', display: 'flex', gap: '15px' }}>
                                        <div>
                                            <label style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontWeight: 'bold' }}>MINES COUNT</label>
                                            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                                                {[1, 2, 3, 5, 7, 10].map(n => (
                                                    <button key={n} onClick={() => setMinesCount(n)} style={{ width: '36px', height: '36px', borderRadius: '8px', border: minesCount === n ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)', background: minesCount === n ? 'rgba(124,77,255,0.15)' : 'transparent', color: 'white', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700', fontFamily: 'inherit' }}>{n}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontWeight: 'bold' }}>SAFE TILES</label>
                                            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                                                {[3, 5, 7, 10].map(n => (
                                                    <button key={n} onClick={() => setPredictionCount(n)} style={{ width: '36px', height: '36px', borderRadius: '8px', border: predictionCount === n ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)', background: predictionCount === n ? 'rgba(124,77,255,0.15)' : 'transparent', color: 'white', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '700', fontFamily: 'inherit' }}>{n}</button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Prediction area */}
                                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.15)', borderRadius: '20px', border: '1px solid var(--surface-border)', padding: '30px', position: 'relative', minHeight: '300px' }}>
                                    {loading ? (
                                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center' }}>
                                            <div className="spinning" style={{ width: '50px', height: '50px', border: '3px solid rgba(124,77,255,0.2)', borderTop: '3px solid var(--primary)', borderRadius: '50%', margin: '0 auto 20px' }}></div>
                                            <p style={{ color: 'var(--text-dim)', fontWeight: '600' }}>Analyzing patterns...</p>
                                        </motion.div>
                                    ) : flowState === 'showing_prediction' && prediction ? (
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ marginBottom: '20px' }}>{renderGrid(prediction)}</div>
                                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                                <button onClick={() => { setFlowState('inputting_outcome'); }} className="glass" style={{ padding: '10px 20px', color: 'var(--secondary)', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <Activity size={16} /> LOG ACTUAL RESULT
                                                </button>
                                                <button onClick={() => { setFlowState('idle'); setPrediction(null); setConfidence(null); }} className="glass" style={{ padding: '10px 20px', color: '#ff5252', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem' }}>
                                                    RESET
                                                </button>
                                            </div>
                                        </div>
                                    ) : flowState === 'inputting_outcome' ? (
                                        <div style={{ textAlign: 'center' }}>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '15px', fontWeight: 'bold' }}>CLICK WHERE MINES ACTUALLY WERE</p>
                                            <div style={{ marginBottom: '20px' }}>{renderGrid(actualOutcome, 'input')}</div>
                                            <button onClick={syncOutcome} className="btn-primary" style={{ padding: '12px 30px' }}>SYNC RESULT</button>
                                        </div>
                                    ) : (
                                        <div style={{ textAlign: 'center', opacity: 0.4 }}>
                                            <BrainCircuit size={50} color="var(--primary)" />
                                            <p style={{ marginTop: '15px', fontSize: '0.85rem', fontWeight: '600' }}>Enter seeds and click predict</p>
                                        </div>
                                    )}
                                </div>

                                {/* Predict button */}
                                {flowState === 'idle' && !loading && (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={getPrediction}
                                        className="btn-primary"
                                        style={{ marginTop: '20px', height: '55px', fontSize: '1.1rem', fontWeight: '900', letterSpacing: '2px', boxShadow: '0 10px 20px rgba(124, 77, 255, 0.3)' }}
                                    >
                                        PREDICT {activeTab.toUpperCase()}
                                    </motion.button>
                                )}

                                {/* Upgrade banner */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                    style={{
                                        marginTop: '20px', padding: '20px', borderRadius: '15px',
                                        background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.08), rgba(255, 152, 0, 0.05))',
                                        border: '1px solid rgba(255, 193, 7, 0.2)',
                                        display: 'flex', alignItems: 'center', gap: '15px'
                                    }}
                                >
                                    <div style={{ width: '45px', height: '45px', borderRadius: '12px', background: 'rgba(255, 193, 7, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Star size={22} color="#ffc107" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '800', fontSize: '0.9rem', color: '#ffc107', marginBottom: '4px' }}>Upgrade to Premium</div>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: '1.4' }}>Get unlimited predictions, access to the ESP Userscript, and premium algorithms. Purchase a key from the login page.</p>
                                    </div>
                                </motion.div>
                            </>
                        ) : (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
                                    <button onClick={() => setShowingHistory(false)} className="glass" style={{ padding: '10px', borderRadius: '10px', cursor: 'pointer' }}><ChevronLeft size={20} /></button>
                                    <h2 style={{ fontSize: '1.2rem', fontWeight: '800' }}>GAME HISTORY</h2>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) 1fr', gap: '25px' }}>
                                    <div style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '10px' }} className="custom-scroll">
                                        {history.map(h => (
                                            <div key={h.id} onClick={() => setSelectedHistory(h)} className="glass" style={{ padding: '15px', marginBottom: '12px', cursor: 'pointer', border: selectedHistory?.id === h.id ? '1px solid var(--primary)' : '1px solid transparent', background: selectedHistory?.id === h.id ? 'rgba(124, 77, 255, 0.05)' : 'rgba(255,255,255,0.02)', transition: 'all 0.2s' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--primary)' }}>{h.game_type?.toUpperCase()}</span>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{new Date(h.created_at).toLocaleTimeString()}</span>
                                                </div>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>S:{h.server_seed_hash?.substring(0, 10)}... | N:{h.nonce}</div>
                                            </div>
                                        ))}
                                        {history.length === 0 && (
                                            <div style={{ textAlign: 'center', padding: '40px', opacity: 0.3 }}>
                                                <Database size={30} />
                                                <p style={{ fontSize: '0.8rem', marginTop: '10px' }}>No history yet</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="glass" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px', background: 'rgba(0,0,0,0.2)' }}>
                                        {selectedHistory ? (
                                            <>
                                                <h4 style={{ marginBottom: '20px', fontSize: '0.8rem', color: 'var(--text-dim)' }}>REPLAYING PREDICTION</h4>
                                                {renderGrid(JSON.parse(selectedHistory.prediction))}
                                                <div style={{ marginTop: '20px', fontSize: '0.7rem', color: 'var(--primary)' }}>Confidence: {selectedHistory.confidence}</div>
                                            </>
                                        ) : (
                                            <div style={{ opacity: 0.2, textAlign: 'center' }}>
                                                <Database size={40} />
                                                <p style={{ marginTop: '10px', fontSize: '0.7rem' }}>Select a log to replay</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Dashboard;
