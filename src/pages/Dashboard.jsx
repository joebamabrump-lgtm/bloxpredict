import React, { useState, useEffect } from 'react';
import api from '../api';
import { LayoutGrid, Pyramid, Zap, BrainCircuit, History, Hash, Fingerprint, ShieldAlert, Database, Sparkles, ChevronLeft, RefreshCcw, Settings, Sliders, Activity, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Dashboard = ({ user }) => {
    const [activeTab, setActiveTab] = useState('mines');
    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(false);
    const [confidence, setConfidence] = useState(null);
    const [history, setHistory] = useState([]);
    const [showingHistory, setShowingHistory] = useState(false);
    const [selectedHistory, setSelectedHistory] = useState(null);
    const [espScript, setEspScript] = useState('');

    // Flow State: 'idle' -> 'showing_prediction' -> 'inputting_outcome'
    const [flowState, setFlowState] = useState('idle');

    // Predictor parameters
    const [clientSeed, setClientSeed] = useState(localStorage.getItem('lastClientSeed') || '');
    const [serverSeedHash, setServerSeedHash] = useState(localStorage.getItem('lastServerSeedHash') || '');
    const [nonce, setNonce] = useState(parseInt(localStorage.getItem('lastNonce')) || 0);
    const [minesCount, setMinesCount] = useState(3);
    const [predictionCount, setPredictionCount] = useState(5);
    const [algorithm, setAlgorithm] = useState('neural_v4');

    // Training state - dynamic based on activeTab
    const [actualOutcome, setActualOutcome] = useState(null);

    useEffect(() => {
        if (activeTab === 'mines') {
            setActualOutcome(Array.from({ length: 5 }, () => Array(5).fill(false)));
        } else {
            setActualOutcome(Array.from({ length: 8 }, () => null)); // null for unselected rows
        }
    }, [activeTab]);

    useEffect(() => {
        localStorage.setItem('lastClientSeed', clientSeed);
        localStorage.setItem('lastServerSeedHash', serverSeedHash);
        localStorage.setItem('lastNonce', nonce);
        fetchHistory();
    }, [clientSeed, serverSeedHash, nonce]);

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

    useEffect(() => {
        fetchEspScript();
    }, []);

    const getPrediction = async () => {
        if (!clientSeed || !serverSeedHash) return alert('Input Seeds First (Parameters Tab)');

        // Final sanity check for premium
        const isPremiumAlg = algorithm === 'quantum_v2' || algorithm === 'dynamic_adapt';
        if (isPremiumAlg && !user?.isPremium && !user?.isAdmin) {
            return alert('Premium Algorithm Locked! Refer 5 friends to unlock.');
        }

        setLoading(true);
        setPrediction(null);
        setFlowState('idle');
        try {
            const response = await api.post('/api/predict', {
                gameType: activeTab, clientSeed, serverSeedHash, nonce, minesCount, predictionCount, algorithm
            });

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
            // Towers - only one choice per row
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
            // Towers Grid
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

    return (
        <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', color: 'white', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <section style={{ width: '100%', maxWidth: '850px' }}>
                    <div className="glass" style={{ padding: '30px', minHeight: '650px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                        {/* Decorative background elements */}
                        <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(124, 77, 255, 0.05) 0%, transparent 70%)' }}></div>

                        {!showingHistory ? (
                            <>
                                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px', zIndex: 1 }}>
                                    <div style={{ display: 'flex', gap: '15px' }}>
                                        <button onClick={() => setActiveTab('mines')} className={`tab-btn ${activeTab === 'mines' ? 'active' : ''}`} style={{ padding: '12px 25px', borderRadius: '12px', border: 'none', background: activeTab === 'mines' ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600', transition: 'all 0.3s' }}>
                                            <Zap size={18} /> ESP Script
                                        </button>
                                        <button onClick={() => setActiveTab('instructions')} className={`tab-btn ${activeTab === 'instructions' ? 'active' : ''}`} style={{ padding: '12px 25px', borderRadius: '12px', border: 'none', background: activeTab === 'instructions' ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600', transition: 'all 0.3s' }}>
                                            <Info size={18} /> Instructions
                                        </button>
                                    </div>

                                    <AnimatePresence>
                                        {confidence && (
                                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ textAlign: 'right', background: 'rgba(124, 77, 255, 0.1)', padding: '10px 15px', borderRadius: '12px', border: '1px solid rgba(124, 77, 255, 0.2)' }}>
                                                <div style={{ color: 'var(--primary)', fontWeight: '900', fontSize: '1.4rem', letterSpacing: '1px' }}>{confidence}</div>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 'bold' }}>CONFIDENCE</div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </header>

                                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.15)', borderRadius: '25px', border: '1px solid var(--surface-border)', padding: '40px', position: 'relative' }}>
                                    {activeTab === 'mines' ? (
                                        <div style={{ width: '100%', textAlign: 'center' }}>
                                            <div style={{ marginBottom: '30px' }}>
                                                <div style={{ width: '80px', height: '80px', borderRadius: '25px', background: 'rgba(124, 77, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                                    <Zap size={40} color="var(--primary)" />
                                                </div>
                                                <h2 style={{ fontSize: '1.8rem', fontWeight: '900', letterSpacing: '1px' }}>ESP USERSCRIPT PREDICTOR</h2>
                                                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '10px' }}>Run this script in your browser console or Tampermonkey to enable ESP.</p>
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
                                                        alert('Script Copied to Clipboard');
                                                    }}
                                                    className="btn-primary"
                                                    style={{ height: '55px' }}
                                                >
                                                    COPY SCRIPT
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
                                                    style={{ height: '55px', color: 'white', fontWeight: 'bold' }}
                                                >
                                                    DOWNLOAD .JS
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ width: '100%', textAlign: 'left' }}>
                                            <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '25px', color: 'var(--primary)' }}>GETTING STARTED</h2>

                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                                <div className="glass" style={{ padding: '20px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                                                        <div style={{ minWidth: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.8rem' }}>1</div>
                                                        <div>
                                                            <div style={{ fontWeight: '800', fontSize: '1rem', marginBottom: '5px' }}>Install Tampermonkey</div>
                                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Download the Tampermonkey extension for your browser (Chrome, Edge, or Brave).</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="glass" style={{ padding: '20px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                                                        <div style={{ minWidth: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.8rem' }}>2</div>
                                                        <div>
                                                            <div style={{ fontWeight: '800', fontSize: '1rem', marginBottom: '5px' }}>Copy the ESP Script</div>
                                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Go to the "ESP Script" tab on this dashboard and click the "COPY SCRIPT" button.</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="glass" style={{ padding: '20px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                                                        <div style={{ minWidth: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.8rem' }}>3</div>
                                                        <div>
                                                            <div style={{ fontWeight: '800', fontSize: '1rem', marginBottom: '5px' }}>Create New Script</div>
                                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Open Tampermonkey &rarr; "Create a new script" &rarr; Paste the code and press CTRL+S to save.</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="glass" style={{ padding: '20px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                                                        <div style={{ minWidth: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '0.8rem' }}>4</div>
                                                        <div>
                                                            <div style={{ fontWeight: '800', fontSize: '1rem', marginBottom: '5px' }}>Sync & Play</div>
                                                            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Refresh BloxFlip or BloxGame. The predictor menu will appear at the bottom automatically.</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {activeTab !== 'mines' && activeTab !== 'instructions' && flowState === 'idle' && !loading && (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={getPrediction}
                                        className="btn-primary"
                                        style={{ marginTop: '25px', height: '60px', fontSize: '1.2rem', fontWeight: '900', letterSpacing: '2px', boxShadow: '0 10px 20px rgba(124, 77, 255, 0.3)' }}
                                    >
                                        PREDICT TOWERS
                                    </motion.button>
                                )}
                            </>
                        ) : (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
                                    <button onClick={() => setShowingHistory(false)} className="glass" style={{ padding: '10px', borderRadius: '10px' }}><ChevronLeft size={20} /></button>
                                    <h2 style={{ fontSize: '1.2rem', fontWeight: '800' }}>GAME HISTORY</h2>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) 1fr', gap: '25px' }}>
                                    <div style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '10px' }} className="custom-scroll">
                                        {history.map(h => (
                                            <div key={h.id} onClick={() => setSelectedHistory(h)} className="glass" style={{ padding: '15px', marginBottom: '12px', cursor: 'pointer', border: selectedHistory?.id === h.id ? '1px solid var(--primary)' : '1px solid transparent', background: selectedHistory?.id === h.id ? 'rgba(124, 77, 255, 0.05)' : 'rgba(255,255,255,0.02)', transition: 'all 0.2s' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--primary)' }}>{h.game_type.toUpperCase()}</span>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{new Date(h.created_at).toLocaleTimeString()}</span>
                                                </div>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>S:{h.server_seed_hash.substring(0, 10)}... | N:{h.nonce}</div>
                                            </div>
                                        ))}
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
