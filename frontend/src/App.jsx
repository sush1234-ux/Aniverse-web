import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Landing from './pages/Landing';
import Home from './pages/Home';
import ChatWorkspace from './pages/ChatWorkspace';
import MovieEngine from './pages/MovieEngine';
import Login from './pages/Login';
import ArenaSelect from './pages/ArenaSelect';
import ArenaModes from './pages/ArenaModes';
import Multiplayer from './pages/Multiplayer';
import Profile from './pages/Profile';

export default function App() {
  const [user, setUser] = useState(null);

  // Sync user credentials on mount
  useEffect(() => {
    const cachedUser = localStorage.getItem('user');
    if (cachedUser) {
      setUser(JSON.parse(cachedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    window.location.reload();
  };

  return (
    <Router>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Unified Top Navbar Overlay */}
        <div 
          className="glass-panel navbar-overlay" 
          style={{ 
            margin: '1rem auto 0 auto', 
            maxWidth: '1200px', 
            width: 'calc(100% - 2rem)', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '0.75rem 1.5rem', 
            zIndex: 10,
            backgroundColor: 'rgba(15, 16, 26, 0.4)'
          }}
        >
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '800', fontSize: '1.2rem', textTransform: 'uppercase' }}>
            <span style={{ color: 'var(--neon-purple)' }}>Ani</span>
            <span style={{ color: '#fff' }}>Verse</span>
          </Link>
          
          {/* Main Navigation Links */}
          {user && (
            <div className="nav-links-container" style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', fontWeight: '600', alignItems: 'center' }}>
              <Link to="/" style={{ color: '#fff', textTransform: 'uppercase', transition: 'var(--transition-bezier)' }} className="nav-link">
                Home
              </Link>
              <Link to="/workspace" style={{ color: '#fff', textTransform: 'uppercase', transition: 'var(--transition-bezier)' }} className="nav-link">
                Workspace
              </Link>
              <Link to="/chat" style={{ color: '#fff', textTransform: 'uppercase', transition: 'var(--transition-bezier)' }} className="nav-link">
                Clubs
              </Link>
              <Link to="/holocinema" style={{ color: '#fff', textTransform: 'uppercase', transition: 'var(--transition-bezier)' }} className="nav-link">
                Holocinema
              </Link>
              <Link to="/arena" style={{ color: '#fff', textTransform: 'uppercase', transition: 'var(--transition-bezier)' }} className="nav-link">
                Arena Hub
              </Link>
            </div>
          )}

          {/* User Account Session Info */}
          {user && (
            <div className="user-profile-container" style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <Link 
                  to="/profile" 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    color: 'var(--neon-cyan)',
                    fontWeight: 'bold',
                    textDecoration: 'none',
                    border: '1px solid rgba(0, 240, 255, 0.3)',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '4px',
                    background: 'rgba(0, 240, 255, 0.05)',
                    boxShadow: 'var(--glow-cyan)',
                    transition: 'var(--transition-bezier)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 240, 255, 0.5)';
                    e.currentTarget.style.borderColor = 'var(--neon-cyan)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.boxShadow = 'var(--glow-cyan)';
                    e.currentTarget.style.borderColor = 'rgba(0, 240, 255, 0.3)';
                  }}
                >
                  <img 
                    src={user.avatarUrl || 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=100'} 
                    alt="avatar" 
                    style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--neon-cyan)' }} 
                  />
                  <span className="mono-hud">
                    {(user.username || user.email || 'Guest').toUpperCase()}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  style={{
                    backgroundColor: 'rgba(255, 42, 95, 0.1)',
                    border: '1px solid var(--neon-red)',
                    color: 'var(--neon-red)',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    transition: 'var(--transition-bezier)'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--neon-red)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 42, 95, 0.1)'}
                >
                  LOGOUT
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Global Router Screen Viewports */}
        <main style={{ flexGrow: 1, position: 'relative', zIndex: 1 }}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/workspace" element={<Home />} />
            <Route path="/chat" element={<ChatWorkspace />} />
            <Route path="/holocinema" element={<MovieEngine />} />
            <Route path="/movies" element={<MovieEngine />} />
            <Route path="/arena-select" element={<ArenaSelect />} />
            <Route path="/arena" element={<ArenaSelect />} />
            <Route path="/arena/play" element={<ArenaModes />} />
            <Route path="/teambattle" element={<ArenaModes />} />
            <Route path="/multiplayer" element={<Multiplayer />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </main>

        <style dangerouslySetInnerHTML={{ __html: `
          .nav-link:hover {
            color: var(--neon-cyan) !important;
            text-shadow: 0 0 8px rgba(0, 240, 255, 0.5);
          }
          .login-btn:hover {
            background-color: var(--neon-purple) !important;
            color: #fff !important;
            box-shadow: var(--glow-purple);
          }
        ` }} />
      </div>
    </Router>
  );
}
