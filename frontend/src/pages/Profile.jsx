import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User as UserIcon, Sparkles, BookOpen, Layers, Save, LogOut, ArrowLeft, ShieldAlert } from 'lucide-react';

const playCyberBeep = (freq = 800, type = 'sine', duration = 0.08) => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.02, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
};

const PRESET_AVATARS = [
  { name: 'Dark Overlord', url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=150' },
  { name: 'Hype Captain', url: 'https://images.unsplash.com/photo-1541562232579-512a21360020?w=150' },
  { name: 'Chill Sensei', url: 'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=150' },
  { name: 'Cyber Samurai', url: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=150' },
  { name: 'Netrunner', url: 'https://images.unsplash.com/photo-1580477667995-2b94f01c9516?w=150' },
  { name: 'Mech Pilot', url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150' }
];


const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export default function Profile() {
  const navigate = useNavigate();
  
  // User Authentication State
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  
  // Profile Editable Fields State
  const [bio, setBio] = useState('');
  const [factions, setFactions] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  
  // Operational Metrics & Clubs Data
  const [characters, setCharacters] = useState([]);
  const [fanclubs, setFanclubs] = useState([]);
  const [joinedClubsList, setJoinedClubsList] = useState([]);

  useEffect(() => {
    // 1. Route guard check
    if (!token) {
      navigate('/');
      return;
    }

    const cachedUser = localStorage.getItem('user');
    if (cachedUser) {
      const parsedUser = JSON.parse(cachedUser);
      setUser(parsedUser);
      setBio(localStorage.getItem(`profile_bio_${parsedUser.id}`) || 'ARCHETYPE MATRIX USER // INTEL_CORP_AGENT');
      setFactions(localStorage.getItem(`profile_factions_${parsedUser.id}`) || 'DARK, HYPE');
      setAvatarUrl(parsedUser.avatarUrl || PRESET_AVATARS[0].url);
    }

    // 2. Fetch all characters to match resonance metrics
    fetch(`${API_URL}/api/characters`)
      .then(res => res.json())
      .then(data => setCharacters(data))
      .catch(err => console.log('Error loading characters for metrics:', err));

    // 3. Fetch all community fanclubs
    fetch(`${API_URL}/api/fanclubs`)
      .then(res => res.json())
      .then(data => setFanclubs(data))
      .catch(err => console.log('Error loading fanclubs for profile:', err));
  }, [token]);

  // Update joined clubs list when fanclubs or user joined lists change
  useEffect(() => {
    if (user && fanclubs.length > 0) {
      const list = fanclubs.filter(c => user.joinedFanclubs?.includes(c._id));
      setJoinedClubsList(list);
    }
  }, [user, fanclubs]);

  // Calculate Resonance Metrics (Top 3 synchronized characters based on affinity points)
  const getTopCharacters = () => {
    if (!user) return [];
    const pointsMap = user.affinityPoints || {};
    
    // Sort names based on points descending
    const sortedCharNames = Object.keys(pointsMap).sort((a, b) => pointsMap[b] - pointsMap[a]);
    
    const results = [];
    // Extract actual database characters matching the names
    sortedCharNames.slice(0, 3).forEach(name => {
      const found = characters.find(c => c.name.toLowerCase().includes(name.toLowerCase()));
      if (found) {
        let avatarUrl = found.avatarUrl;
        if (!avatarUrl || avatarUrl.includes('unsplash.com')) {
          if (found.name.toLowerCase().includes('gojo')) {
            avatarUrl = 'https://cdn.myanimelist.net/images/characters/3/499696.jpg';
          } else if (found.name.toLowerCase().includes('luffy')) {
            avatarUrl = 'https://cdn.myanimelist.net/images/characters/9/310307.jpg';
          } else if (found.name.toLowerCase().includes('kakashi')) {
            avatarUrl = 'https://cdn.myanimelist.net/images/characters/7/284129.jpg';
          } else if (found.name.toLowerCase().includes('zoro')) {
            avatarUrl = 'https://cdn.myanimelist.net/images/characters/3/100534.jpg';
          } else if (found.name.toLowerCase().includes('levi')) {
            avatarUrl = 'https://cdn.myanimelist.net/images/characters/2/241417.jpg';
          } else if (found.name.toLowerCase().includes('lelouch')) {
            avatarUrl = 'https://cdn.myanimelist.net/images/characters/8/342111.jpg';
          }
        }
        results.push({
          ...found,
          avatarUrl,
          points: pointsMap[name]
        });
      }
    });

    // Fallbacks if no chats/affinity points yet
    if (results.length < 3) {
      const fallbacks = [
        { _id: '1', name: 'Gojo Satoru', avatarUrl: 'https://cdn.myanimelist.net/images/characters/3/499696.jpg', vibeTag: 'dark', themeColor: '#a123ff', points: 420 },
        { _id: '2', name: 'Monkey D. Luffy', avatarUrl: 'https://cdn.myanimelist.net/images/characters/9/310307.jpg', vibeTag: 'hype', themeColor: '#ff2a5f', points: 350 },
        { _id: '3', name: 'Kakashi Hatake', avatarUrl: 'https://cdn.myanimelist.net/images/characters/7/284129.jpg', vibeTag: 'chill', themeColor: '#00f0ff', points: 180 }
      ];
      
      // Merge unique ones
      const merged = [...results];
      fallbacks.forEach(fallback => {
        if (merged.length < 3 && !merged.some(c => c.name === fallback.name)) {
          merged.push({
            ...fallback,
            points: fallback.points || 150
          });
        }
      });
      return merged;
    }
    return results;
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    if (!user) return;

    playCyberBeep(1200, 'sine', 0.15);
    setSaveStatus('SAVING DATA...');

    // Save bio & factions locally
    localStorage.setItem(`profile_bio_${user.id}`, bio);
    localStorage.setItem(`profile_factions_${user.id}`, factions);

    // Save avatarUrl into user object and update localStorage user
    const updatedUser = { ...user, avatarUrl };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);

    setTimeout(() => {
      setSaveStatus('IDENTITY UPDATED SUCCESSFULLY.');
      playCyberBeep(1500, 'sine', 0.1);
      setTimeout(() => {
        setSaveStatus('');
        // Trigger a reload to refresh global App.jsx state
        window.location.reload();
      }, 1500);
    }, 1200);
  };

  const handleLeaveClub = async (clubId) => {
    if (!user) return;
    playCyberBeep(400, 'sawtooth', 0.25);

    // Update locally to respect CRITICAL GUARDRAILS on backend route schemas
    const updatedClubs = user.joinedFanclubs.filter(id => id !== clubId);
    const updatedUser = { ...user, joinedFanclubs: updatedClubs };

    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const topSynced = getTopCharacters();

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', padding: '2rem 1.5rem 6rem 1.5rem', zIndex: 1, backgroundColor: '#030307' }}>
      
      {/* HUD background overlays */}
      <div className="scenic-grid-bg" />
      <div className="scenic-scanlines" />
      <div className="scenic-vignette" />

      <style dangerouslySetInnerHTML={{ __html: `
        .profile-container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 3rem;
          position: relative;
          z-index: 3;
        }

        .avatar-hover:hover {
          box-shadow: 0 0 20px var(--neon-cyan);
          border-color: var(--neon-cyan) !important;
        }

        .action-input {
          width: 100%;
          padding: 0.85rem;
          background-color: rgba(0, 0, 0, 0.7);
          border: 1px solid rgba(0, 240, 255, 0.25);
          border-radius: 4px;
          color: #fff;
          outline: none;
          font-family: var(--font-mono);
          font-size: 0.85rem;
          transition: var(--transition-bezier);
        }

        .action-input:focus {
          border-color: var(--neon-cyan);
          box-shadow: 0 0 10px rgba(0, 240, 255, 0.2);
        }

        .profile-btn {
          padding: 0.8rem 1.8rem;
          font-family: var(--font-mono);
          font-size: 0.8rem;
          font-weight: bold;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          cursor: pointer;
          transition: var(--transition-bezier);
          border-radius: 4px;
        }

        .avatar-select-grid img:hover {
          transform: scale(1.1);
          border-color: var(--neon-cyan) !important;
        }
      ` }} />

      <div className="profile-container">
        
        {/* Top Header Controls */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.2rem' }}>
          <div>
            <span className="mono-hud" style={{ color: 'var(--neon-cyan)', fontSize: '0.8rem', letterSpacing: '2px' }}>
              [ USER SESSION DIRECTIVE ]
            </span>
            <h1 style={{ fontSize: '2.2rem', fontWeight: '950', textTransform: 'uppercase', letterSpacing: '2px', marginTop: '0.2rem' }}>
              IDENTITY MANAGEMENT PORTAL
            </h1>
          </div>
          <button 
            onClick={() => { playCyberBeep(700, 'sine', 0.08); navigate('/workspace'); }}
            className="glass-panel profile-btn"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              border: '1px solid rgba(255, 255, 255, 0.15)', 
              background: 'rgba(255, 255, 255, 0.02)',
              color: '#fff' 
            }}
          >
            <ArrowLeft size={14} />
            BACK HUD
          </button>
        </header>

        {/* Dashboard Grid Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
          
          {/* COLUMN 1: BLOCK 1 (IDENTITY MATRIX INFO EDITOR) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <section 
              className="glass-panel" 
              style={{ 
                padding: '2.5rem 2rem', 
                borderLeft: '4px solid var(--neon-cyan)', 
                backgroundColor: 'rgba(5, 7, 12, 0.95)',
                boxShadow: '0 0 35px rgba(0, 240, 255, 0.05)',
                position: 'relative'
              }}
            >
              {/* Sci-Fi crosshair overlays */}
              <div style={{ position: 'absolute', top: '10px', right: '10px', width: '10px', height: '10px', borderTop: '2.5px solid rgba(0,240,255,0.3)', borderRight: '2.5px solid rgba(0,240,255,0.3)' }} />
              <div style={{ position: 'absolute', bottom: '10px', right: '10px', width: '10px', height: '10px', borderBottom: '2.5px solid rgba(0,240,255,0.3)', borderRight: '2.5px solid rgba(0,240,255,0.3)' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
                <UserIcon size={16} style={{ color: 'var(--neon-cyan)' }} />
                <span className="mono-hud" style={{ color: 'var(--neon-cyan)', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '2px' }}>
                  BLOCK 01 // IDENTITY MATRIX
                </span>
              </div>

              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Profile Picture Slot */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div 
                    style={{ 
                      width: '80px', 
                      height: '80px', 
                      borderRadius: '50%', 
                      border: '2px solid rgba(0, 240, 255, 0.4)', 
                      overflow: 'hidden', 
                      position: 'relative',
                      boxShadow: '0 0 15px rgba(0, 240, 255, 0.15)',
                      background: '#07080d'
                    }}
                  >
                    <img 
                      src={avatarUrl || null} 
                      alt="Avatar Preview" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <button 
                      type="button"
                      onClick={() => { playCyberBeep(850, 'sine', 0.05); setShowPresets(!showPresets); }}
                      className="mono-hud"
                      style={{
                        padding: '4px 10px',
                        fontSize: '0.65rem',
                        backgroundColor: 'rgba(0, 240, 255, 0.15)',
                        border: '1.5px solid var(--neon-cyan)',
                        color: '#00f0ff',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        letterSpacing: '1px'
                      }}
                    >
                      {showPresets ? 'HIDE PRESET GRID' : 'SELECT CYBER AVATAR'}
                    </button>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                      Presets or customize with image URL
                    </span>
                  </div>
                </div>

                {/* Preset Avatar Grid */}
                {showPresets && (
                  <div 
                    className="avatar-select-grid" 
                    style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(6, 1fr)', 
                      gap: '0.5rem', 
                      backgroundColor: 'rgba(0,0,0,0.6)', 
                      padding: '0.75rem', 
                      borderRadius: '4px', 
                      border: '1px dashed rgba(0, 240, 255, 0.25)' 
                    }}
                  >
                    {PRESET_AVATARS.map((avatar, idx) => (
                      <img 
                        key={idx}
                        src={avatar.url} 
                        alt={avatar.name} 
                        title={avatar.name}
                        onClick={() => { playCyberBeep(1000, 'sine', 0.04); setAvatarUrl(avatar.url); }}
                        style={{ 
                          width: '100%', 
                          height: '45px', 
                          objectFit: 'cover', 
                          borderRadius: '4px', 
                          cursor: 'pointer', 
                          border: avatarUrl === avatar.url ? '2px solid var(--neon-cyan)' : '2.5px solid transparent',
                          transition: 'all 0.2s ease'
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Custom Avatar URL */}
                <div>
                  <label className="mono-hud" style={{ fontSize: '0.7rem', color: 'var(--neon-cyan)', display: 'block', marginBottom: '0.4rem' }}>
                    &gt;_ Avatar Image Link
                  </label>
                  <input 
                    type="text" 
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="action-input"
                  />
                </div>

                {/* User Bio */}
                <div>
                  <label className="mono-hud" style={{ fontSize: '0.7rem', color: 'var(--neon-cyan)', display: 'block', marginBottom: '0.4rem' }}>
                    &gt;_ Mind Decryption (Bio)
                  </label>
                  <textarea 
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    className="action-input"
                    style={{ resize: 'none' }}
                  />
                </div>

                {/* Favorite Anime Factions */}
                <div>
                  <label className="mono-hud" style={{ fontSize: '0.7rem', color: 'var(--neon-cyan)', display: 'block', marginBottom: '0.4rem' }}>
                    &gt;_ Synchronized Faction Sectors
                  </label>
                  <input 
                    type="text" 
                    value={factions}
                    onChange={(e) => setFactions(e.target.value)}
                    className="action-input"
                    placeholder="e.g. DARK, HYPE, CHILL"
                  />
                </div>

                {/* Save button */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.5rem' }}>
                  <button 
                    type="submit" 
                    disabled={saveStatus.includes('SAVING')}
                    className="mono-hud"
                    style={{ 
                      padding: '0.9rem', 
                      background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.15) 0%, #000 100%)', 
                      border: '1px solid var(--neon-cyan)', 
                      color: 'var(--neon-cyan)', 
                      borderRadius: '4px', 
                      cursor: 'pointer', 
                      fontWeight: 'bold', 
                      letterSpacing: '1.5px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: '0.6rem', 
                      fontSize: '0.85rem', 
                      boxShadow: 'var(--glow-cyan)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--neon-cyan)';
                      e.currentTarget.style.color = '#000';
                      e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 240, 255, 0.4)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--neon-cyan)';
                      e.currentTarget.style.boxShadow = 'var(--glow-cyan)';
                    }}
                  >
                    <Save size={15} />
                    {saveStatus || 'SAVE PROFILE UPDATE'}
                  </button>
                </div>

              </form>
            </section>
          </div>

          {/* COLUMN 2: BLOCK 2 (OPERATIONAL METRICS) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <section 
              className="glass-panel" 
              style={{ 
                padding: '2.5rem 2rem', 
                borderLeft: '4px solid var(--neon-purple)', 
                backgroundColor: 'rgba(5, 7, 12, 0.95)',
                boxShadow: '0 0 35px rgba(161, 35, 255, 0.05)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '280px'
              }}
            >
              {/* Sci-Fi crosshair overlays */}
              <div style={{ position: 'absolute', top: '10px', right: '10px', width: '10px', height: '10px', borderTop: '2.5px solid rgba(161, 35, 255, 0.3)', borderRight: '2.5px solid rgba(161, 35, 255, 0.3)' }} />
              <div style={{ position: 'absolute', bottom: '10px', right: '10px', width: '10px', height: '10px', borderBottom: '2.5px solid rgba(161, 35, 255, 0.3)', borderRight: '2.5px solid rgba(161, 35, 255, 0.3)' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
                <Sparkles size={16} style={{ color: 'var(--neon-purple)' }} />
                <span className="mono-hud" style={{ color: 'var(--neon-purple)', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '2px' }}>
                  BLOCK 02 // OPERATIONAL METRICS
                </span>
              </div>

              {topSynced && topSynced.length > 0 ? (
                (() => {
                  const topChar = topSynced[0];
                  const vibeColor = topChar.themeColor || 'var(--neon-cyan)';
                  const pts = topChar.points || 100;
                  const resonancePercent = Math.min(Math.round((pts / 1000) * 100) + 40, 99);

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', flexGrow: 1, justifyContent: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        <span className="mono-hud" style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.35)', letterSpacing: '1.5px' }}>
                          DOMINANT COGNITIVE LINK
                        </span>
                        <h2 
                          className="mono-hud" 
                          style={{ 
                            fontSize: '2rem', 
                            fontWeight: '900', 
                            color: '#fff', 
                            textShadow: `0 0 15px ${vibeColor}`, 
                            letterSpacing: '2px',
                            textTransform: 'uppercase',
                            margin: '0.5rem 0'
                          }}
                        >
                          {topChar.name}
                        </h2>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="mono-hud" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          SECTOR: <span style={{ color: vibeColor, fontWeight: 'bold' }}>{topChar.vibeTag?.toUpperCase() || 'CHILL'}</span>
                        </span>
                        <span className="mono-hud" style={{ fontSize: '0.8rem', color: vibeColor, fontWeight: 'bold' }}>
                          RESONANCE: {resonancePercent}%
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: 'auto' }}>
                        {/* Mini Resonance Bar */}
                        <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '3px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <div 
                            style={{ 
                              width: `${resonancePercent}%`, 
                              height: '100%', 
                              backgroundColor: vibeColor, 
                              boxShadow: `0 0 10px ${vibeColor}`
                            }} 
                          />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>
                          <span>AFFINITY LEVEL</span>
                          <span>{pts} PTS</span>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div style={{ padding: '2rem 0', textAlign: 'center' }}>
                  <span className="mono-hud" style={{ fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                    NO ACTIVE RESONANCE MATRIX FOUND
                  </span>
                </div>
              )}
            </section>
          </div>

        </div>

        {/* ROW 2: BLOCK 3 (FACTION MANAGEMENT - CLUBS LIST) */}
        <section 
          className="glass-panel" 
          style={{ 
            padding: '2.5rem 2rem', 
            borderLeft: '4px solid var(--neon-red)', 
            backgroundColor: 'rgba(5, 7, 12, 0.95)',
            boxShadow: '0 0 35px rgba(255, 42, 95, 0.03)',
            position: 'relative'
          }}
        >
          {/* Sci-Fi crosshair overlays */}
          <div style={{ position: 'absolute', top: '10px', left: '10px', width: '10px', height: '10px', borderTop: '2.5px solid rgba(255,42,95,0.3)', borderLeft: '2.5px solid rgba(255,42,95,0.3)' }} />
          <div style={{ position: 'absolute', bottom: '10px', left: '10px', width: '10px', height: '10px', borderBottom: '2.5px solid rgba(255,42,95,0.3)', borderLeft: '2.5px solid rgba(255,42,95,0.3)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2rem' }}>
            <Layers size={16} style={{ color: 'var(--neon-red)' }} />
            <span className="mono-hud" style={{ color: 'var(--neon-red)', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '2px' }}>
              BLOCK 03 // FACTION MEMBERSHIP MANAGEMENT
            </span>
          </div>

          {joinedClubsList.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 0', gap: '1rem', border: '1px dashed rgba(255, 42, 95, 0.2)', borderRadius: '6px' }}>
              <ShieldAlert size={28} style={{ color: 'var(--neon-red)', opacity: 0.7 }} />
              <span className="mono-hud" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', letterSpacing: '1px' }}>
                NO ACTIVE FACTION ALLIANCES DETECTED.
              </span>
              <button 
                onClick={() => { playCyberBeep(700, 'sine', 0.08); navigate('/chat'); }}
                className="mono-hud"
                style={{
                  padding: '5px 12px',
                  fontSize: '0.7rem',
                  backgroundColor: 'rgba(255, 42, 95, 0.1)',
                  border: '1px solid var(--neon-red)',
                  color: 'var(--neon-red)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                JOIN CLUBS VIA PORTAL
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {joinedClubsList.map(club => (
                <div 
                  key={club._id}
                  className="glass-panel"
                  style={{
                    padding: '1.2rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.01)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <img 
                        src={club.bannerUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100'} 
                        alt={club.name} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                    </div>
                    <div>
                      <h4 className="mono-hud" style={{ fontSize: '0.9rem', color: '#fff', fontWeight: 'bold' }}>
                        {club.name.toUpperCase()}
                      </h4>
                      <span className="mono-hud" style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)' }}>
                        SEC_ID: {club._id.substring(18, 24).toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4', minHeight: '40px' }}>
                    {club.description}
                  </p>

                  <button
                    onClick={() => handleLeaveClub(club._id)}
                    className="mono-hud"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      backgroundColor: 'rgba(255, 42, 95, 0.08)',
                      border: '1px solid var(--neon-red)',
                      color: 'var(--neon-red)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                      fontWeight: 'bold',
                      transition: 'var(--transition-bezier)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--neon-red)';
                      e.currentTarget.style.color = '#000';
                      e.currentTarget.style.boxShadow = '0 0 10px rgba(255, 42, 95, 0.4)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 42, 95, 0.08)';
                      e.currentTarget.style.color = 'var(--neon-red)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    LEAVE HUB PROTOCOL
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}
