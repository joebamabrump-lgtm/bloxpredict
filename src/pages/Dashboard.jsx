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
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: '25px' }}>

                {/* Main Engine Area */}
                <section>
                    <div className="glass" style={{ padding: '30px', minHeight: '650px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                        {/* Decorative background elements */}
                        <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(124, 77, 255, 0.05) 0%, transparent 70%)' }}></div>

                        {!showingHistory ? (
                            <>
                                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px', zIndex: 1 }}>
                                    <div style={{ display: 'flex', gap: '15px' }}>
                                        <button onClick={() => setActiveTab('mines')} className={`tab-btn ${activeTab === 'mines' ? 'active' : ''}`} style={{ padding: '12px 25px', borderRadius: '12px', border: 'none', background: activeTab === 'mines' ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600', transition: 'all 0.3s' }}>
                                            <LayoutGrid size={18} /> Mines
                                        </button>
                                        <button onClick={() => setActiveTab('towers')} className={`tab-btn ${activeTab === 'towers' ? 'active' : ''}`} style={{ padding: '12px 25px', borderRadius: '12px', border: 'none', background: activeTab === 'towers' ? 'var(--primary)' : 'rgba(255,255,255,0.05)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '600', transition: 'all 0.3s' }}>
                                            <Pyramid size={18} /> Towers
                                        </button>
                                    </div>

                                    <AnimatePresence>
                                        {confidence && (
                                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} style={{ textAlign: 'right', background: 'rgba(124, 77, 255, 0.1)', padding: '10px 15px', borderRadius: '12px', border: '1px solid rgba(124, 77, 255, 0.2)' }}>
                                                <div style={{ color: 'var(--primary)', fontWeight: '900', fontSize: '1.4rem', letterSpacing: '1px' }}>{confidence}</div>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 'bold' }}>NEURAL CONFIDENCE</div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </header>

                                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.15)', borderRadius: '25px', border: '1px solid var(--surface-border)', padding: '40px', position: 'relative' }}>
                                    <AnimatePresence mode="wait">
                                        {loading ? (
                                            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ textAlign: 'center' }}>
                                                <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto' }}>
                                                    <RefreshCcw className="spinning" size={80} color="var(--primary)" style={{ opacity: 0.2 }} />
                                                    <BrainCircuit size={40} color="var(--primary)" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
                                                </div>
                                                <p style={{ marginTop: '20px', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 'bold', letterSpacing: '2px' }}>RUNNING {algorithm.toUpperCase()}...</p>
                                            </motion.div>
                                        ) : flowState === 'showing_prediction' ? (
                                            <motion.div key="prediction" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '25px' }}>
                                                    <Activity size={16} color="var(--primary)" />
                                                    <h3 style={{ fontSize: '0.9rem', color: 'white', fontWeight: 'bold', letterSpacing: '1px' }}>OPTIMIZED PATH GENERATED</h3>
                                                </div>

                                                {renderGrid(prediction)}

                                                <button onClick={() => setFlowState('inputting_outcome')} className="btn-primary" style={{ marginTop: '40px', background: 'var(--secondary)', color: '#000', fontWeight: '800', width: '100%', maxWidth: '300px' }}>
                                                    CONFIRM & TRAIN AI
                                                </button>
                                            </motion.div>
                                        ) : flowState === 'inputting_outcome' ? (
                                            <motion.div key="training" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
                                                    <ShieldAlert size={18} color="#ff5252" />
                                                    <h3 style={{ fontSize: '0.9rem', color: '#ff5252', fontWeight: 'bold' }}>MARK ACTUAL {activeTab === 'mines' ? 'MINE' : 'ROW'} LOCATIONS</h3>
                                                </div>
                                                {renderGrid(actualOutcome, 'input')}
                                                <div style={{ marginTop: '25px', padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', fontSize: '0.75rem', color: 'var(--text-dim)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <Info size={14} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                                                    Providing accurate outcomes improves next-round logic
                                                </div>
                                                <button onClick={syncOutcome} className="btn-primary" style={{ marginTop: '20px', width: '100%' }}>SYNC TO CORE NEURAL NETWORK</button>
                                            </motion.div>
                                        ) : (
                                            <div style={{ textAlign: 'center', opacity: 0.2 }}>
                                                <BrainCircuit size={80} />
                                                <p style={{ marginTop: '15px', fontWeight: 'bold', letterSpacing: '1px' }}>AWAITING SEED DATA</p>
                                            </div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {flowState === 'idle' && !loading && (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={getPrediction}
                                        className="btn-primary"
                                        style={{ marginTop: '25px', height: '60px', fontSize: '1.2rem', fontWeight: '900', letterSpacing: '2px', boxShadow: '0 10px 20px rgba(124, 77, 255, 0.3)' }}
                                    >
                                        INITIALIZE PREDICTION
                                    </motion.button>
                                )}
                            </>
                        ) : (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '30px' }}>
                                    <button onClick={() => setShowingHistory(false)} className="glass" style={{ padding: '10px', borderRadius: '10px' }}><ChevronLeft size={20} /></button>
                                    <h2 style={{ fontSize: '1.2rem', fontWeight: '800' }}>NEURAL LOG REPLAY</h2>
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

                {/* Sidebar Parameters */}
                <aside>
                    <div className="glass" style={{ padding: '25px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '25px' }}>
                            <Sliders size={16} color="var(--primary)" />
                            <h4 style={{ fontSize: '0.8rem', fontWeight: '800', letterSpacing: '1px' }}>CORE SETTINGS</h4>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 'bold' }}>VERSION 4.2 ENGINE</label>
                            <div style={{ marginTop: '10px', padding: '15px', background: 'rgba(124, 77, 255, 0.05)', borderRadius: '12px', border: '1px solid rgba(124, 77, 255, 0.1)' }}>
                                <div style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: '900', marginBottom: '5px' }}>REFERRAL CODE</div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '1rem', fontWeight: '900', letterSpacing: '1px' }}>{user?.referralCode}</span>
                                    <button onClick={() => navigator.clipboard.writeText(user?.referralCode)} className="glass" style={{ padding: '5px 10px', fontSize: '0.6rem', color: 'white', cursor: 'pointer' }}>COPY</button>
                                </div>
                                <div style={{ marginTop: '10px', fontSize: '0.7rem', color: 'white', fontWeight: 'bold' }}>
                                    Referrals: <span style={{ color: 'var(--primary)' }}>{user?.referralCount || 0}</span>
                                </div>
                                <p style={{ fontSize: '0.55rem', color: 'var(--text-dim)', marginTop: '8px' }}>Refer 5 friends for 3 days of PREMIUM access.</p>
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 'bold' }}>NEURAL ALGORITHM</label>
                            <select value={algorithm} onChange={e => setAlgorithm(e.target.value)} style={{ width: '100%', padding: '12px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--surface-border)', color: 'white', borderRadius: '10px', marginTop: '8px', outline: 'none', cursor: 'pointer' }}>
                                <option value="neural_v4">Neural V4 — 50% Data Weighted</option>
                                <option value="hash_chain_v1">HashChain V1 — 30% Data Weighted</option>
                                <option value="quantum_v2">{user?.isPremium || user?.isAdmin ? 'Quantum V2 — 65% Data Weighted (Premium)' : 'Quantum V2 🔒 Premium'}</option>
                                <option value="dynamic_adapt">{user?.isPremium || user?.isAdmin ? 'Dynamic Adaptive — 80% Data Weighted (Premium)' : 'Dynamic Adaptive 🔒 Premium'}</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 'bold' }}>SERVER SEED HASH</label>
                            <div style={{ position: 'relative', marginTop: '8px' }}>
                                <Fingerprint size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
                                <input className="input-field" style={{ paddingLeft: '40px', fontSize: '0.75rem' }} placeholder="sha256 hash or text..." value={serverSeedHash} onChange={e => setServerSeedHash(e.target.value)} />
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 'bold' }}>CLIENT SEED</label>
                            <div style={{ position: 'relative', marginTop: '8px' }}>
                                <Hash size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} />
                                <input className="input-field" style={{ paddingLeft: '40px', fontSize: '0.75rem' }} placeholder="Any text..." value={clientSeed} onChange={e => setClientSeed(e.target.value)} />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                            <div>
                                <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 'bold' }}>NONCE</label>
                                <input type="number" className="input-field" style={{ marginTop: '8px', fontSize: '0.8rem' }} value={nonce} onChange={e => setNonce(parseInt(e.target.value) || 0)} />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 'bold' }}>MINES</label>
                                <input type="number" className="input-field" style={{ marginTop: '8px', fontSize: '0.8rem' }} value={minesCount} onChange={e => setMinesCount(parseInt(e.target.value) || 1)} />
                            </div>
                        </div>

                        <div style={{ marginBottom: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 'bold' }}>SAFE TILES</label>
                                <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 'bold' }}>{predictionCount}</span>
                            </div>
                            <input type="range" min="1" max="15" value={predictionCount} onChange={e => setPredictionCount(parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }} />
                        </div>
                    </div>

                    <button onClick={() => setShowingHistory(true)} className="glass pulsate" style={{ width: '100%', padding: '18px', color: 'var(--primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', transition: 'all 0.3s' }}>
                        <History size={18} /> VIEW NEURAL LOGS
                    </button>

                    <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(0,255,157,0.05)', borderRadius: '12px', border: '1px solid rgba(0,255,157,0.1)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00ff9d', boxShadow: '0 0 10px #00ff9d' }}></div>
                        <span style={{ fontSize: '0.65rem', fontWeight: 'bold', color: '#00ff9d' }}>SYSTEM ENGINE ACTIVE</span>
                    </div>
                </aside>

            </div>
        </div>
    );
};

export default Dashboard;
