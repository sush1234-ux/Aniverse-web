import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Sparkles, BookOpen, Send, ShieldAlert, Film, MessageSquare, Terminal } from 'lucide-react';

const SHONEN_HYPE_NAMES = ['Luffy', 'Goku', 'Naruto', 'Zoro', 'Saitama', 'Gon', 'Sukuna', 'Edward'];
const DARK_ANTIHERO_NAMES = ['Levi', 'Lelouch', 'Light', 'Lawliet', 'Gojo', 'Itachi', 'Sasuke', 'Kaneki'];

const MOCK_TICKERS = [
  "MATRIX: User_Sushma just advanced to Affinity lvl 5 with Gojo!",
  "SYNAPSE: Luffy joined Straw Hat Deck Fanclub room.",
  "CORE: Dynamic neural node synchronized 25 archetype interfaces.",
  "ARCHETYPE: Lelouch vi Britannia commands you to open his direct portal.",
  "MATRIX: Saitama advanced to Affinity lvl 2 with User_101 (supermarket deals chat).",
  "CORE: Synchronizing mental nodes for active character matrices...",
  "SYNAPSE: Affinity point multiplier active (+50XP) in Shonen channels."
];

// Synth audio generator for retro-cyber click sounds
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
  } catch (e) {
    // Autoplay blocked
  }
};


const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export default function Home() {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState([]);
  const [selectedVibe, setSelectedVibe] = useState(null);
  const [diaryText, setDiaryText] = useState('');
  const [matchingResult, setMatchingResult] = useState(null);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [matrixFlash, setMatrixFlash] = useState(null);
  const [tickerLogs, setTickerLogs] = useState([]);
  const tickerInterval = useRef(null);

  const cardRefs = useRef({});

  const cleanJikanName = (name) => {
    if (name.includes(',')) {
      const parts = name.split(',').map(p => p.trim());
      return `${parts[1]} ${parts[0]}`;
    }
    return name;
  };

  useEffect(() => {
    // Restrict visibility to authenticated users
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }

    // Fetch top characters from backend proxy quietly
    fetch(`${API_URL}/api/archetype-matrix`)
      .then(res => {
        if (!res.ok) throw new Error('API limit');
        return res.json();
      })
      .then(data => {
        if (data && data.data) {
          const rawList = data.data.slice(0, 25);
          const mapped = rawList.map(item => {
            const cleanedName = cleanJikanName(item.name);
            let vibeTag = 'chill';
            let themeColor = '#00f0ff';

            const isHype = SHONEN_HYPE_NAMES.some(h => cleanedName.toLowerCase().includes(h.toLowerCase()));
            const isDark = DARK_ANTIHERO_NAMES.some(d => cleanedName.toLowerCase().includes(d.toLowerCase()));

            if (isHype) {
              vibeTag = 'hype';
              themeColor = '#ff2a5f';
            } else if (isDark) {
              vibeTag = 'dark';
              themeColor = '#a123ff';
            }

            return {
              _id: item.mal_id.toString(),
              name: cleanedName,
              animeSource: item.name_kanji ? `${item.name_kanji} Series` : 'Featured Series',
              avatarUrl: item.images.jpg.image_url,
              cardBackdropUrl: item.images.jpg.image_url,
              vibeTag,
              themeColor,
              catchphrases: ["Believe it!", "Interesting...", "Let's fight!"].slice(0, 2)
            };
          });
          setCharacters(mapped);
        }
      })
      .catch(err => {
        console.log('Synchronizing fallback entries...');
        setCharacters([
          { _id: '1', name: 'Monkey D. Luffy', animeSource: 'One Piece', avatarUrl: 'https://images.unsplash.com/photo-1541562232579-512a21360020?w=200', vibeTag: 'hype', themeColor: '#ff2a5f' },
          { _id: '2', name: 'Gojo Satoru', animeSource: 'Jujutsu Kaisen', avatarUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=200', vibeTag: 'dark', themeColor: '#a123ff' },
          { _id: '3', name: 'Kakashi Hatake', animeSource: 'Naruto', avatarUrl: 'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=200', vibeTag: 'chill', themeColor: '#00f0ff' }
        ]);
      });

    const initialLogs = [];
    for (let i = 0; i < 6; i++) {
      const time = new Date(Date.now() - (6 - i) * 60000).toLocaleTimeString();
      initialLogs.push(`[${time}] ${MOCK_TICKERS[i % MOCK_TICKERS.length]}`);
    }
    setTickerLogs(initialLogs);

    tickerInterval.current = setInterval(() => {
      const time = new Date().toLocaleTimeString();
      const randomMsg = MOCK_TICKERS[Math.floor(Math.random() * MOCK_TICKERS.length)];
      setTickerLogs(prev => [...prev.slice(1), `[${time}] ${randomMsg}`]);
    }, 4000);

    return () => clearInterval(tickerInterval.current);
  }, []);

  const handleMoodSubmit = async (e) => {
    e.preventDefault();
    if (!diaryText.trim() || characters.length === 0) return;

    setMatchingLoading(true);
    setMatchingResult(null);
    playCyberBeep(600, 'sawtooth', 0.15);

    try {
      const res = await fetch(`${API_URL}/api/mood-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayDescription: diaryText,
          charactersList: characters
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMatchingResult(data);
        const matchedChar = characters.find(c => 
          c.name.toLowerCase().includes(data.name.toLowerCase()) || 
          data.name.toLowerCase().includes(c.name.toLowerCase())
        );
        if (matchedChar) {
          setMatrixFlash(matchedChar.vibeTag);
          setSelectedVibe(matchedChar.vibeTag);
          playCyberBeep(1000, 'sine', 0.25);
          setTimeout(() => setMatrixFlash(null), 1500);

          setTimeout(() => {
            const element = cardRefs.current[matchedChar._id];
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              element.style.transform = 'rotateX(15deg) rotateY(15deg) scale3d(1.06, 1.06, 1.06)';
              element.style.borderColor = matchedChar.themeColor;
              element.style.boxShadow = `0 0 35px ${matchedChar.themeColor}`;
              
              const grid = element.querySelector('.card-grid-overlay');
              if (grid) {
                grid.style.opacity = '0.45';
                grid.style.filter = 'brightness(2.5)';
              }

              setTimeout(() => {
                element.style.transform = 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
                element.style.borderColor = 'var(--glass-border)';
                element.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4)';
                if (grid) {
                  grid.style.opacity = '0.05';
                  grid.style.filter = 'brightness(1)';
                }
              }, 2500);
            }
          }, 400);
        }
      }
    } catch (err) {
      console.log('Connection error');
    } finally {
      setMatchingLoading(false);
    }
  };

  // High performance direct DOM manipulation for 3D tilts
  const handleMouseMove = (e) => {
    const card = e.currentTarget;
    const box = card.getBoundingClientRect();
    const x = e.clientX - box.left;
    const y = e.clientY - box.top;
    
    const relX = (x / box.width) - 0.5;
    const relY = (y / box.height) - 0.5;
    
    const rotateX = -relY * 20;
    const rotateY = relX * 20;

    card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.04, 1.04, 1.04)`;
    
    const tiltStrength = Math.sqrt(rotateX * rotateX + rotateY * rotateY);
    const grid = card.querySelector('.card-grid-overlay');
    if (grid) {
      grid.style.opacity = tiltStrength > 13 ? '0.35' : '0.08';
      grid.style.filter = tiltStrength > 13 ? 'brightness(2)' : 'brightness(1)';
    }

    const shine = card.querySelector('.card-shine');
    if (shine) {
      shine.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(255,255,255,0.12) 0%, transparent 60%)`;
    }
  };

  const handleMouseLeave = (e) => {
    const card = e.currentTarget;
    card.style.transform = 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    
    const grid = card.querySelector('.card-grid-overlay');
    if (grid) {
      grid.style.opacity = '0.05';
      grid.style.filter = 'brightness(1)';
    }

    const shine = card.querySelector('.card-shine');
    if (shine) {
      shine.style.background = 'transparent';
    }
  };

  const handleOpenPortal = async (char) => {
    playCyberBeep(1400, 'sine', 0.1);
    try {
      const res = await fetch(`${API_URL}/api/characters/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: char.name,
          animeSource: char.animeSource,
          avatarUrl: char.avatarUrl,
          vibeTag: char.vibeTag,
          themeColor: char.themeColor
        })
      });
      const data = await res.json();
      if (res.ok) {
        navigate('/chat', { state: { characterId: data._id } });
      }
    } catch (err) {
      navigate('/chat');
    }
  };

  const filteredCharacters = selectedVibe
    ? characters.filter(c => c.vibeTag === selectedVibe)
    : characters;

  const currentStanceColor = selectedVibe === 'hype' 
    ? '#ff2a5f' 
    : (selectedVibe === 'dark' ? '#a123ff' : (selectedVibe === 'chill' ? '#00f0ff' : 'transparent'));

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', padding: '2rem 1.5rem', zIndex: 1, backgroundColor: '#030307', backgroundImage: 'linear-gradient(135deg, #030307 0%, #080911 100%)' }}>
      
      {/* Living Scenic Grid, Scanlines & Vignette */}
      <div className="scenic-grid-bg" />
      <div className="scenic-scanlines" />
      <div className="scenic-vignette" />

      {/* Background Matrix Flash Overlays */}
      {matrixFlash === 'hype' && <div className="matrix-overlay-hype" />}
      {matrixFlash === 'dark' && <div className="matrix-overlay-dark" />}
      {matrixFlash === 'chill' && <div className="matrix-overlay-chill" />}

      {/* Dynamic Stance Ambient Radial Glow */}
      {selectedVibe && (
        <div 
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '75%',
            height: '75%',
            background: `radial-gradient(circle, ${currentStanceColor}12 0%, transparent 70%)`,
            pointerEvents: 'none',
            zIndex: 0,
            transition: 'all 0.8s cubic-bezier(0.25, 0.8, 0.25, 1)'
          }}
        />
      )}

      {/* self-contained character burst animations */}
      <style>{`
        .game-card:hover .card-avatar {
          transform: scale(1.22) translateY(-14px) !important;
          box-shadow: 0 12px 30px rgba(0,0,0,0.8), 0 0 20px var(--hover-theme) !important;
          border-color: var(--hover-theme) !important;
        }
        .stance-btn::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 50%;
          width: 0;
          height: 2px;
          background-color: var(--theme-col);
          box-shadow: 0 0 8px var(--theme-col);
          transition: all 0.3s ease;
          transform: translateX(-50%);
        }
        .stance-btn:hover::after {
          width: 80%;
        }
        .angular-cut {
          clip-path: polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%);
        }
      `}</style>

      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '3rem', position: 'relative', zIndex: 3 }}>
        
        {/* HEADER BRANDING HUD */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '950', display: 'flex', alignItems: 'center', gap: '0.4rem', textTransform: 'uppercase', letterSpacing: '3px' }}>
              <span style={{ color: 'var(--neon-purple)', textShadow: '0 0 15px rgba(161, 35, 255, 0.6)' }}>Ani</span>
              <span style={{ color: '#fff' }}>Verse</span>
              <span className="mono-hud" style={{ color: 'var(--neon-cyan)', fontSize: '0.75rem', border: '1px solid var(--neon-cyan)', padding: '2px 6px', borderRadius: '4px', marginLeft: '0.5rem', boxShadow: 'var(--glow-cyan)' }}>HUD_V1.9</span>
            </h1>
            <p className="mono-hud" style={{ color: 'var(--text-secondary)', marginTop: '0.3rem', fontSize: '0.8rem', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Terminal size={12} className="terminal-green-text" />
              SYSTEM CORE STATUS: ACTIVE // ARCHETYPE_SYNAPSE_MATRIX
            </p>
          </div>
          
          <nav style={{ display: 'flex', gap: '1.2rem' }}>
            <button 
              onClick={() => { playCyberBeep(700, 'sine', 0.08); navigate('/chat'); }}
              className="glass-panel cyber-glitch-hover" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1.4rem', cursor: 'pointer', color: '#fff', border: '1px solid rgba(0, 240, 255, 0.3)', background: 'rgba(0, 240, 255, 0.05)', fontWeight: 'bold', borderRadius: '4px', fontSize: '0.8rem', letterSpacing: '1px' }}
            >
              <MessageSquare size={14} style={{ color: 'var(--neon-cyan)' }} />
              CLUBS
            </button>
            <button 
              onClick={() => { playCyberBeep(700, 'sine', 0.08); navigate('/holocinema'); }}
              className="glass-panel cyber-glitch-hover" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1.4rem', cursor: 'pointer', color: '#fff', border: '1px solid rgba(255, 42, 95, 0.3)', background: 'rgba(255, 42, 95, 0.05)', fontWeight: 'bold', borderRadius: '4px', fontSize: '0.8rem', letterSpacing: '1px' }}
            >
              <Film size={14} style={{ color: 'var(--neon-red)' }} />
              HOLOCINEMA
            </button>
          </nav>
        </header>

        {/* SPLIT HUD GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 310px', gap: '2.5rem', alignItems: 'start' }}>
          
          {/* LEFT INTERACTIVE SECTION */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3.5rem' }}>

            {/* 1. PREMIUM MOOD MATRIX STANCE SELECTOR */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <span className="mono-hud" style={{ fontSize: '0.75rem', color: '#fff', opacity: 0.4, letterSpacing: '3px', textTransform: 'uppercase' }}>
                [ Select System combat Stance ]
              </span>
              
              <div 
                className="glass-panel angular-cut"
                style={{ 
                  display: 'flex', 
                  gap: '2px', 
                  padding: '4px 18px', 
                  backgroundColor: 'rgba(12, 14, 25, 0.8)', 
                  border: '1px solid rgba(255,255,255,0.08)',
                  position: 'relative'
                }}
              >
                {/* Visual border accents */}
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', backgroundColor: currentStanceColor || 'rgba(255,255,255,0.1)', transition: 'all 0.5s ease' }} />
                
                {['hype', 'dark', 'chill'].map(v => {
                  const isActive = selectedVibe === v;
                  const activeColor = v === 'hype' ? '#ff2a5f' : (v === 'dark' ? '#a123ff' : '#00f0ff');
                  return (
                    <button
                      key={v}
                      onMouseEnter={() => playCyberBeep(900, 'sine', 0.04)}
                      onClick={() => {
                        playCyberBeep(1200, 'sine', 0.08);
                        setSelectedVibe(selectedVibe === v ? null : v);
                      }}
                      className="stance-btn"
                      style={{
                        padding: '0.6rem 1.8rem',
                        fontSize: '0.85rem',
                        borderRadius: '0',
                        cursor: 'pointer',
                        background: 'transparent',
                        border: 'none',
                        color: isActive ? activeColor : 'var(--text-secondary)',
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        transition: 'all 0.25s ease',
                        position: 'relative',
                        '--theme-col': activeColor,
                        textShadow: isActive ? `0 0 10px ${activeColor}88` : 'none'
                      }}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. COGNITIVE PSYCHE DECRYPTOR DIARY */}
            <section 
              className="glass-panel" 
              style={{ 
                padding: '2rem', 
                borderLeft: `4px solid ${currentStanceColor || 'var(--neon-purple)'}`, 
                position: 'relative', 
                backgroundColor: 'rgba(10, 11, 20, 0.75)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                transition: 'all 0.5s ease'
              }}
            >
              {/* Corner crosshairs decorations */}
              <div style={{ position: 'absolute', top: '10px', right: '10px', width: '12px', height: '12px', borderTop: '2px solid rgba(255,255,255,0.15)', borderRight: '2px solid rgba(255,255,255,0.15)' }} />
              <div style={{ position: 'absolute', bottom: '10px', right: '10px', width: '12px', height: '12px', borderBottom: '2px solid rgba(255,255,255,0.15)', borderRight: '2px solid rgba(255,255,255,0.15)' }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.8rem' }}>
                <BookOpen size={16} style={{ color: currentStanceColor || 'var(--neon-purple)' }} />
                <span className="mono-hud" style={{ color: currentStanceColor || 'var(--neon-purple)', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>
                  COGNITIVE PSYCHE DECRYPTOR // INPUT PORTAL
                </span>
              </div>
              
              <h2 style={{ fontSize: '1.4rem', marginBottom: '1.2rem', fontWeight: '900', letterSpacing: '-0.2px', textTransform: 'uppercase' }}>
                Decrypt Daily Log entries to Align resonant entities
              </h2>
              
              <form onSubmit={handleMoodSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <textarea
                  placeholder="Analyze Day Log: Describe events, feelings, or stress level to synchronize target interface profiles..."
                  value={diaryText}
                  onChange={(e) => setDiaryText(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '1rem',
                    backgroundColor: 'rgba(3, 4, 8, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '0.95rem',
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'var(--font-mono)',
                    lineHeight: '1.5',
                    boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.9)',
                    transition: 'var(--transition-bezier)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = currentStanceColor || 'var(--neon-purple)';
                    e.currentTarget.style.boxShadow = `0 0 10px ${currentStanceColor || 'rgba(161, 35, 255, 0.2)'}, inset 0 2px 10px rgba(0,0,0,0.9)`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.boxShadow = 'inset 0 2px 10px rgba(0,0,0,0.9)';
                  }}
                />
                
                <button
                  type="submit"
                  disabled={matchingLoading}
                  className="cyber-glitch-hover"
                  style={{
                    alignSelf: 'flex-start',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.8rem 2rem',
                    background: `linear-gradient(135deg, ${currentStanceColor || 'var(--neon-purple)'} 0%, rgba(3,4,8,0.9) 100%)`,
                    border: `1px solid ${currentStanceColor || 'var(--neon-purple)'}`,
                    borderRadius: '4px',
                    color: '#fff',
                    fontWeight: '800',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    letterSpacing: '1px',
                    textTransform: 'uppercase',
                    boxShadow: `0 4px 15px ${currentStanceColor || 'rgba(161, 35, 255, 0.15)'}`
                  }}
                >
                  <Send size={14} style={{ color: currentStanceColor || 'var(--neon-purple)' }} />
                  {matchingLoading ? 'DECRYPTING TRANSCRIPT LOGS...' : 'RUN MATRIX ALIGNMENT'}
                </button>
              </form>

              {matchingResult && (
                <div className="glass-panel" style={{ marginTop: '1.5rem', padding: '1.2rem', border: '1px solid var(--neon-cyan)', backgroundColor: 'rgba(0, 240, 255, 0.02)', boxShadow: '0 0 15px rgba(0,240,255,0.08)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--neon-cyan)', marginBottom: '0.4rem' }}>
                    <Sparkles size={16} />
                    <h4 className="mono-hud" style={{ fontSize: '0.9rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                      ALIGNMENT RESULT: {matchingResult.name.toUpperCase()}
                    </h4>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#d1d5db', lineHeight: '1.5' }}>
                    {matchingResult.explanation}
                  </p>
                </div>
              )}
            </section>

            {/* 3. THE 3D GAMEPLAY CARD DECK ROSTER */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.8rem' }}>
                <span className="mono-hud" style={{ color: 'var(--neon-cyan)', fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '2px' }}>
                  ACTIVE DECK MATRIX // RENDERED CHASSIS ({filteredCharacters.length} CONTENDERS)
                </span>
              </div>

              {characters.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6rem 0', gap: '1.5rem' }}>
                  <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.03)', borderTopColor: 'var(--neon-cyan)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                  <span className="mono-hud" style={{ fontSize: '0.85rem', color: 'var(--neon-cyan)', letterSpacing: '1.5px' }}>
                    ACQUIRING NEURAL TARGET CHASSIS MATRIX...
                  </span>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '2rem' }}>
                  {filteredCharacters.map(char => {
                    const themeColor = char.themeColor;
                    const matchVal = (parseInt(char._id.substring(0, 3)) || char._id.charCodeAt(0)) % 15 + 85;
                    const cleanAnimeName = (char.animeSource || 'Series').split(' ')[0].split(',')[0].replace(/[^\w]/g, '').toUpperCase();
                    
                    const levelVal = (parseInt(char._id.substring(0, 3)) || char._id.charCodeAt(0)) % 99 + 1;
                    const levelStr = levelVal < 10 ? `0${levelVal}` : `${levelVal}`;

                    return (
                      <div
                        key={char._id}
                        ref={el => cardRefs.current[char._id] = el}
                        onMouseMove={handleMouseMove}
                        onMouseLeave={handleMouseLeave}
                        className="glass-panel game-card"
                        style={{
                          height: '380px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          padding: '1.5rem',
                          position: 'relative',
                          overflow: 'hidden',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          backgroundColor: 'rgba(10, 11, 20, 0.65)',
                          transition: 'transform 0.15s ease, box-shadow 0.3s ease, border-color 0.3s ease',
                          perspective: '1000px',
                          cursor: 'default',
                          '--hover-theme': themeColor
                        }}
                      >
                        {/* Sci-Fi Grid Overlay inside card */}
                        <div className="card-grid-overlay" />
                        
                        {/* Light shine layer */}
                        <div className="card-shine" />

                        {/* Top layout vibe tags */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 5 }}>
                          <span style={{ fontSize: '0.6rem', color: themeColor, border: `1px solid ${themeColor}66`, padding: '2px 6px', borderRadius: '2px', fontFamily: 'var(--font-mono)', backgroundColor: `${themeColor}09` }}>
                            STANCE: {char.vibeTag.toUpperCase()}
                          </span>
                          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)' }}>
                            ID_{char._id.padStart(4, '0')}
                          </span>
                        </div>

                        {/* Character burst artwork boundaries container */}
                        <div 
                          style={{ 
                            position: 'relative',
                            width: '100%',
                            height: '170px',
                            overflow: 'visible',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'flex-end',
                            marginTop: '0.5rem',
                            marginBottom: '0.5rem'
                          }}
                        >
                          {/* Inner boundary backdrop */}
                          <div 
                            style={{
                              position: 'absolute',
                              top: '15px', left: 0, right: 0, bottom: 0,
                              background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)',
                              border: '1px solid rgba(255,255,255,0.03)',
                              borderRadius: '4px',
                              pointerEvents: 'none',
                              zIndex: 1
                            }}
                          />
                          <img 
                            src={char.avatarUrl} 
                            alt={char.name} 
                            referrerPolicy="no-referrer"
                            className="card-avatar"
                            style={{ 
                              width: '115px', 
                              height: '160px', 
                              objectFit: 'cover', 
                              borderRadius: '4px', 
                              border: `1.5px solid rgba(255, 255, 255, 0.08)`, 
                              boxShadow: `0 4px 15px rgba(0,0,0,0.6)`,
                              zIndex: 4,
                              transition: 'transform 0.25s cubic-bezier(0.25, 0.8, 0.25, 1)',
                              transformOrigin: 'bottom center'
                            }} 
                          />
                        </div>

                        {/* Character details nameplate & mini status */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', zIndex: 5 }}>
                          
                          {/* Monospace Game Block Nameplate */}
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', letterSpacing: '0.5px' }}>
                            <span style={{ color: themeColor, fontWeight: 'bold' }}>[{`LVL ${levelStr}`}]</span>{' '}
                            <span style={{ color: '#fff', fontWeight: '800' }}>{char.name.toUpperCase()}</span>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', marginTop: '2px', opacity: 0.7 }}>
                              // {cleanAnimeName} CHASSIS
                            </div>
                          </div>

                          {/* Visual specs grid */}
                          <div 
                            className="mono-hud" 
                            style={{ 
                              display: 'grid', 
                              gridTemplateColumns: '1fr 1fr', 
                              gap: '0.25rem', 
                              fontSize: '0.6rem', 
                              color: 'rgba(255,255,255,0.4)',
                              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                              padding: '0.4rem 0'
                            }}
                          >
                            <div>
                              SYNAPSE: <span style={{ color: themeColor, fontWeight: 'bold' }}>{matchVal}%</span>
                            </div>
                            <div>
                              SIGNAL: <span style={{ color: '#00ff66', fontWeight: 'bold' }}>ONLINE</span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleOpenPortal(char)}
                            style={{
                              width: '100%',
                              padding: '0.55rem',
                              background: 'rgba(15, 16, 26, 0.9)',
                              border: `1px solid ${themeColor}66`,
                              borderRadius: '4px',
                              color: '#fff',
                              fontWeight: 'bold',
                              fontSize: '0.75rem',
                              cursor: 'pointer',
                              letterSpacing: '1px',
                              transition: 'var(--transition-bezier)'
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.background = themeColor;
                              e.currentTarget.style.color = '#000';
                              e.currentTarget.style.boxShadow = `0 0 10px ${themeColor}`;
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.background = 'rgba(15, 16, 26, 0.9)';
                              e.currentTarget.style.color = '#fff';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            CONNECT LINK
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

          </div>

          {/* RIGHT FIXED TERMINAL HUD SIDEBAR */}
          <aside 
            className="glass-panel" 
            style={{ 
              position: 'sticky', 
              top: '20px', 
              height: 'calc(100vh - 180px)', 
              padding: '1.5rem', 
              border: '1px solid rgba(0, 255, 102, 0.25)', 
              backgroundColor: 'rgba(5, 7, 12, 0.9)', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '1.5rem',
              overflow: 'hidden',
              boxShadow: '0 0 30px rgba(0,255,102,0.05)'
            }}
          >
            {/* HUD Title header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(0, 255, 102, 0.2)', paddingBottom: '0.8rem' }}>
              <span 
                style={{ 
                  display: 'inline-block', 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  backgroundColor: '#00ff66', 
                  boxShadow: '0 0 10px #00ff66', 
                  animation: 'pulse-cyan 1.5s infinite alternate' 
                }} 
              />
              <span className="mono-hud terminal-green-text" style={{ fontSize: '0.85rem', fontWeight: 'bold', letterSpacing: '1px' }}>
                ANIVERSE_HUD // FEED
              </span>
            </div>

            {/* Terminal scrolling logs logs */}
            <div 
              className="mono-hud terminal-green-text" 
              style={{ 
                flexGrow: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.9rem', 
                fontSize: '0.75rem', 
                lineHeight: '1.5',
                overflowY: 'auto',
                paddingRight: '0.2rem'
              }}
            >
              {tickerLogs.map((log, idx) => (
                <div 
                  key={idx} 
                  className="cyber-glitch-hover"
                  style={{ 
                    borderBottom: '1px dashed rgba(0, 255, 102, 0.08)', 
                    paddingBottom: '0.5rem', 
                    opacity: (idx + 1) / tickerLogs.length,
                    transition: 'all 0.3s ease'
                  }}
                >
                  <span style={{ color: 'rgba(0, 255, 102, 0.4)' }}>&gt;_ </span>
                  {log}
                </div>
              ))}
            </div>

            {/* Console grid stats specs at the bottom */}
            <div 
              className="mono-hud" 
              style={{ 
                borderTop: '1px solid rgba(0, 255, 102, 0.2)', 
                paddingTop: '0.8rem', 
                fontSize: '0.65rem', 
                color: 'rgba(0, 255, 102, 0.6)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.3rem'
              }}
            >
              <div>RESONANCE RATE: <span className="terminal-green-text">99.892%</span></div>
              <div>SOCKET PIPELINE: <span className="terminal-green-text">STABLE</span></div>
              <div>ENCRYPTION LAYER: <span className="terminal-green-text">NEURAL_PASS</span></div>
            </div>

          </aside>

        </div>

      </div>
    </div>
  );
}
