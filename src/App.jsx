import React, { useState, useEffect } from 'react';
import api from './api';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import AdminPage from './pages/AdminPage';
import { Shield, Pyramid, LogOut, Menu, X, ExternalLink } from 'lucide-react';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('isAdmin') === 'true');
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser && savedUser !== 'undefined' ? JSON.parse(savedUser) : null;
    } catch (e) {
      console.error("Error parsing user from localStorage:", e);
      return null;
    }
  });
  const [view, setView] = useState(token ? 'dashboard' : 'login');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [unreadAnnouncement, setUnreadAnnouncement] = useState(null);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('isAdmin', isAdmin);
      localStorage.setItem('user', JSON.stringify(user || null));
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      checkAnnouncements();
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('isAdmin');
      localStorage.removeItem('user');
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token, isAdmin, user]);

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
  };

  if (view === 'login') {
    return <LoginPage onLogin={handleLogin} />;
  }

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
          <SidebarItem active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<Pyramid size={20} />} label="Predictors" />

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
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(45deg, var(--primary), var(--secondary))' }}></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: '600', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.username}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{isAdmin ? 'Administrator' : 'Premium Member'}</div>
            </div>
          </div>
          <button onClick={logout} className="glass" style={{ width: '100%', padding: '8px', fontSize: '0.8rem', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, background: 'var(--bg)', position: 'relative', overflowY: 'auto' }}>
        <header style={{ height: '60px', borderBottom: '1px solid var(--surface-border)', display: 'flex', alignItems: 'center', padding: '0 20px', background: 'rgba(10, 10, 18, 0.8)', backdropFilter: 'blur(10px)', sticky: 'top', zIndex: 10 }}>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', marginRight: '15px' }}>
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <h2 style={{ fontSize: '1.1rem', fontWeight: '600' }}>
            {view === 'dashboard' && 'Predictor'}
            {view === 'admin' && 'System Administration'}
          </h2>
        </header>

        <div style={{ padding: '20px' }}>
          {view === 'dashboard' && <Dashboard user={user} />}
          {view === 'admin' && <AdminPage user={user} />}
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
