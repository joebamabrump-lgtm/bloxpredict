import React, { useState, useEffect, useCallback } from 'react';
import api, { setApiToken } from './api';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import AdminPage from './pages/AdminPage';
import { Shield, Pyramid, LogOut, Menu, X, ExternalLink, Lock, Clock, AlertTriangle } from 'lucide-react';

function App() {
  const [token, setToken] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [unreadAnnouncement, setUnreadAnnouncement] = useState(null);

  // Site status
  const [siteStatus, setSiteStatus] = useState({ site_shutdown: false, esp_shutdown: false, update_mode: false, update_end_time: null });
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [countdown, setCountdown] = useState('');

  // Check site status on mount
  const checkSiteStatus = useCallback(async () => {
    try {
      const res = await api.get('/api/site-status');
      setSiteStatus(res.data);
    } catch (e) { }
  }, []);

  useEffect(() => {
    checkSiteStatus();
    const interval = setInterval(checkSiteStatus, 10000);
    return () => clearInterval(interval);
  }, [checkSiteStatus]);

  // Countdown timer for update mode
  useEffect(() => {
    if (!siteStatus.update_mode || !siteStatus.update_end_time) {
      setCountdown('');
      return;
    }

    const tick = () => {
      const end = new Date(siteStatus.update_end_time).getTime();
      const now = Date.now();
      const diff = end - now;

      if (diff <= 0) {
        setCountdown('COMING BACK ONLINE...');
        checkSiteStatus();
        return;
      }

      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setCountdown(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [siteStatus.update_mode, siteStatus.update_end_time, checkSiteStatus]);

  useEffect(() => {
    if (token) {
      setApiToken(token);
      checkAnnouncements();
    } else {
      setApiToken(null);
    }
  }, [token]);

  const checkAnnouncements = async () => {
    try {
      const res = await api.get('/api/announcements/unread');
      if (res.data) setUnreadAnnouncement(res.data);
    } catch (e) { }
  };

  const markRead = async () => {
    if (!unreadAnnouncement) return;
    try {
      await api.post('/api/announcements/mark-read', { announcementId: unreadAnnouncement.id });
      setUnreadAnnouncement(null);
    } catch (e) { }
  };

  const handleLogin = (newToken, adminStatus, userData) => {
    setToken(newToken);
    setIsAdmin(adminStatus);
    setUser(userData);
    setView('dashboard');
  };

  const logout = () => {
    setToken(null);
    setIsAdmin(false);
    setUser(null);
    setView('login');
    setApiToken(null);
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminLoginError('');
    try {
      const res = await api.post('/api/admin-login', { key: adminKey, adminPassword: adminPass });
      setToken(res.data.token);
      setIsAdmin(true);
      setUser(res.data);
      setView('admin');
      setShowAdminLogin(false);
      setAdminKey('');
      setAdminPass('');
    } catch (err) {
      setAdminLoginError(err.response?.data?.message || 'Login failed');
    }
  };

  // Show shutdown / update mode overlay (non-admins only)
  const isSiteDown = siteStatus.site_shutdown || siteStatus.update_mode;
  if (isSiteDown && !isAdmin) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
        {/* Background effects */}
        <div style={{ position: 'fixed', top: '20%', left: '30%', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(124, 77, 255, 0.08) 0%, transparent 70%)', filter: 'blur(80px)' }}></div>
        <div style={{ position: 'fixed', bottom: '20%', right: '20%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(255, 82, 82, 0.05) 0%, transparent 70%)', filter: 'blur(80px)' }}></div>

        <div className="glass animate-fade-in" style={{ padding: '60px', maxWidth: '550px', width: '100%', textAlign: 'center', border: '1px solid rgba(255, 82, 82, 0.2)', boxShadow: '0 30px 60px rgba(0,0,0,0.5)' }}>
          {siteStatus.update_mode ? (
            <>
              <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'rgba(124, 77, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 30px', border: '2px solid rgba(124, 77, 255, 0.3)' }}>
                <Clock size={45} color="var(--primary)" />
              </div>
              <h1 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '15px', background: 'linear-gradient(to right, white, var(--primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>UPDATING</h1>
              <p style={{ color: 'var(--text-dim)', fontSize: '1rem', marginBottom: '40px', lineHeight: '1.6' }}>BloxPredict is undergoing a scheduled update. We'll be back shortly.</p>
              
              {/* Countdown */}
              <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '20px', padding: '30px', border: '1px solid rgba(124, 77, 255, 0.2)', marginBottom: '30px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '15px' }}>ESTIMATED RETURN</div>
                <div style={{ fontSize: '4rem', fontWeight: '900', fontFamily: 'monospace', letterSpacing: '8px', color: 'var(--primary)', textShadow: '0 0 30px rgba(124, 77, 255, 0.5)' }}>
                  {countdown || '...'}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} className="pulsate" style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)', animationDelay: `${i * 0.3}s` }}></div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'rgba(255, 82, 82, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 30px', border: '2px solid rgba(255, 82, 82, 0.3)' }}>
                <AlertTriangle size={45} color="#ff5252" />
              </div>
              <h1 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '15px', color: '#ff5252' }}>OFFLINE</h1>
              <p style={{ color: 'var(--text-dim)', fontSize: '1rem', marginBottom: '30px', lineHeight: '1.6' }}>BloxPredict is currently offline. Please check back later.</p>
              <div style={{ background: 'rgba(255, 82, 82, 0.05)', borderRadius: '15px', padding: '20px', border: '1px solid rgba(255, 82, 82, 0.15)' }}>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>The site has been temporarily shut down by an administrator.</p>
              </div>
            </>
          )}
        </div>

        {/* Admin Login Button - Bottom Left */}
        <button
          onClick={() => setShowAdminLogin(true)}
          style={{
            position: 'fixed', bottom: '20px', left: '20px',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '12px', padding: '10px 16px', color: 'rgba(255,255,255,0.3)',
            cursor: 'pointer', fontSize: '0.7rem', fontWeight: '600',
            display: 'flex', alignItems: 'center', gap: '8px',
            transition: 'all 0.3s', fontFamily: 'inherit'
          }}
          onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.06)'; e.target.style.color = 'rgba(255,255,255,0.6)'; }}
          onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.03)'; e.target.style.color = 'rgba(255,255,255,0.3)'; }}
        >
          <Lock size={14} /> Admin Login
        </button>

        {/* Admin Login Modal */}
        {showAdminLogin && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="glass animate-fade-in" style={{ padding: '40px', width: '380px', border: '1px solid rgba(124, 77, 255, 0.3)' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '900', marginBottom: '25px', textAlign: 'center' }}>ADMIN ACCESS</h3>
              <form onSubmit={handleAdminLogin}>
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 'bold', letterSpacing: '1px' }}>ADMIN KEY</label>
                  <input
                    type="text" className="input-field" style={{ marginTop: '8px' }}
                    placeholder="Enter admin key" value={adminKey}
                    onChange={e => setAdminKey(e.target.value)} required autoFocus
                  />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 'bold', letterSpacing: '1px' }}>ADMIN PASSWORD</label>
                  <input
                    type="password" className="input-field" style={{ marginTop: '8px' }}
                    placeholder="Enter password" value={adminPass}
                    onChange={e => setAdminPass(e.target.value)} required
                  />
                </div>
                {adminLoginError && <p style={{ color: '#ff5252', fontSize: '0.8rem', marginBottom: '15px', textAlign: 'center' }}>{adminLoginError}</p>}
                <button type="submit" className="btn-primary" style={{ width: '100%', height: '50px', fontWeight: '800' }}>LOGIN</button>
                <button type="button" onClick={() => { setShowAdminLogin(false); setAdminLoginError(''); }} style={{ width: '100%', marginTop: '10px', padding: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'var(--text-dim)', cursor: 'pointer', fontFamily: 'inherit' }}>CANCEL</button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (view === 'login' && !token) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const isPremium = user?.isPremium || user?.userType === 'premium' || isAdmin;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: isSidebarOpen ? '260px' : '0px',
          transition: 'width 0.3s ease',
          background: '#12121e',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--surface-border)',
          overflow: 'hidden',
          zIndex: 100
        }}
      >
        <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '40px', height: '40px', background: 'var(--primary)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Pyramid color="white" size={24} />
          </div>
          <span style={{ fontWeight: '800', fontSize: '1.2rem', fontFamily: 'Outfit' }}>BloxPredict</span>
        </div>

        <nav style={{ flex: 1, padding: '10px' }}>
          <SidebarItem active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<Pyramid size={20} />} label={isPremium ? "ESP Script" : "Predictor"} />

          <a href="https://discord.gg/DX4r6GbyzX" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
            <div className="sidebar-item" style={{ padding: '12px 15px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', color: 'var(--text-dim)', marginBottom: '4px' }}>
              <ExternalLink size={20} />
              <span style={{ fontSize: '0.9rem' }}>Discord Server</span>
            </div>
          </a>

          {isAdmin && (
            <div style={{ marginTop: '20px' }}>
              <p style={{ padding: '10px', fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 'bold' }}>Admin Only</p>
              <SidebarItem active={view === 'admin'} onClick={() => setView('admin')} icon={<Shield size={20} />} label="Admin Panel" />
            </div>
          )}
        </nav>

        <div style={{ padding: '15px', borderTop: '1px solid var(--surface-border)', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: isPremium ? 'linear-gradient(45deg, var(--primary), var(--secondary))' : 'linear-gradient(45deg, #555, #777)' }}></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: '600', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.username}</div>
              <div style={{ fontSize: '0.7rem', color: isPremium ? 'var(--secondary)' : 'var(--text-dim)', fontWeight: isPremium ? '700' : '400' }}>
                {isAdmin ? 'Administrator' : isPremium ? '⭐ Premium Member' : 'Free Member'}
              </div>
            </div>
          </div>
          <button onClick={logout} className="glass" style={{ width: '100%', padding: '8px', fontSize: '0.8rem', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, background: 'var(--bg)', position: 'relative', overflowY: 'auto' }}>
        <header style={{ height: '60px', borderBottom: '1px solid var(--surface-border)', display: 'flex', alignItems: 'center', padding: '0 20px', background: 'rgba(10, 10, 18, 0.8)', backdropFilter: 'blur(10px)', zIndex: 10 }}>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', marginRight: '15px' }}>
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '600' }}>
            {view === 'dashboard' && (isPremium ? 'ESP Script' : 'Predictor')}
            {view === 'admin' && 'System Administration'}
          </h2>
          {!isPremium && view === 'dashboard' && (
            <div style={{ marginLeft: 'auto', background: 'rgba(255, 193, 7, 0.1)', padding: '6px 14px', borderRadius: '8px', fontSize: '0.7rem', color: '#ffc107', fontWeight: '700', border: '1px solid rgba(255, 193, 7, 0.2)' }}>
              FREE PLAN — 45 predictions/day
            </div>
          )}
        </header>

        <div style={{ padding: '20px' }}>
          {view === 'dashboard' && <Dashboard user={user} isPremium={isPremium} isAdmin={isAdmin} />}
          {view === 'admin' && <AdminPage user={user} onSiteStatusChange={checkSiteStatus} />}
        </div>
      </main>

      {/* GLOBAL ANNOUNCEMENT MODAL */}
      {unreadAnnouncement && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} className="animate-fade-in">
          <div className="glass" style={{ maxWidth: '500px', width: '100%', padding: '40px', textAlign: 'center', border: '1px solid var(--primary)', boxShadow: '0 0 30px rgba(124, 77, 255, 0.3)' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(124, 77, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 25px' }}>
              <Shield color="var(--primary)" size={30} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '15px', color: 'white' }}>SYSTEM BROADCAST</h2>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '15px', marginBottom: '30px', textAlign: 'left', border: '1px solid rgba(255,255,255,0.05)' }}>
              <p style={{ fontSize: '1rem', lineHeight: '1.6', color: 'rgba(255,255,255,0.8)' }}>{unreadAnnouncement.content}</p>
            </div>
            <button onClick={markRead} className="btn-primary" style={{ height: '55px', width: '100%', fontSize: '1rem', fontWeight: 'bold' }}>
              ACKNOWLEDGE TRANSMISSION
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SidebarItem({ active, onClick, icon, label }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 15px',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: 'pointer',
        background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
        color: active ? 'var(--primary)' : 'var(--text-dim)',
        marginBottom: '4px',
        transition: 'all 0.2s ease'
      }}
      className="sidebar-item"
    >
      {icon}
      <span style={{ fontWeight: active ? '600' : '400', fontSize: '0.9rem' }}>{label}</span>
    </div>
  );
}

export default App;
