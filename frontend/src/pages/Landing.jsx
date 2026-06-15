import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Terminal, ShieldAlert, Sparkles, Film, Zap, LogIn, UserPlus, Cpu, Database, Layers } from 'lucide-react';

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


const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export default function Landing() {
  const navigate = useNavigate();
  
  // Loader states
  const [booting, setBooting] = useState(true);
  const [bootLogs, setBootLogs] = useState([]);
  
  // Auth states
  const [authMode, setAuthMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Live Matrix telemetry logs
  const [liveLogs, setLiveLogs] = useState([
    "> Incoming sync connection from terminal node...",
    "> User_Sush successfully aligned with Archetype ID_0417...",
    "> Faction Hub: 'Jujutsu High' current capacity at 94.2%..."
  ]);
  const consoleRef = React.useRef(null);

  const handleFactionClick = async (factionTitle) => {
    playCyberBeep(900, 'sine', 0.08);
    const token = localStorage.getItem('token');
    
    if (!token) {
      const authCard = document.getElementById('auth-terminal');
      if (authCard) {
        authCard.scrollIntoView({ behavior: 'smooth' });
        const emailInput = authCard.querySelector('input[type="email"]');
        if (emailInput) emailInput.focus();
      }
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/fanclubs`);
      const data = await res.json();
      
      let targetClubName = '';
      const titleUpper = factionTitle.toUpperCase();
      if (titleUpper.includes('DARK')) {
        targetClubName = 'Jujutsu High Domain';
      } else if (titleUpper.includes('HYPE')) {
        targetClubName = 'Straw Hat Galley';
      } else if (titleUpper.includes('CHILL')) {
        targetClubName = 'Konoha Ramen Stand';
      }

      const matchedClub = data.find(c => c.name.toLowerCase().includes(targetClubName.toLowerCase()));
      if (matchedClub) {
        navigate('/chat', { state: { fanclubId: matchedClub._id } });
      } else {
        navigate('/chat');
      }
    } catch (err) {
      navigate('/chat');
    }
  };

  // Boot sequence simulation
  useEffect(() => {
    const logs = [
      'INITIALIZING ANIVERSE PROTOCOL...',
      'STREAMING ARCHETYPE CHASSIS VECTORS...',
      'SYSTEM SECURE // ACCESS GRANTED.'
    ];

    let currentLogIndex = 0;
    const logInterval = setInterval(() => {
      if (currentLogIndex < logs.length) {
        setBootLogs(prev => [...prev, logs[currentLogIndex]]);
        playCyberBeep(700 + currentLogIndex * 150, 'sawtooth', 0.06);
        currentLogIndex++;
      } else {
        clearInterval(logInterval);
        setTimeout(() => {
          setBooting(false);
          playCyberBeep(1200, 'sine', 0.15);
        }, 500);
      }
    }, 400);

    return () => clearInterval(logInterval);
  }, []);

  // Telemetry logs generator effect
  useEffect(() => {
    if (booting) return;
    
    const rawTemplates = [
      "> Connection established with Sector_Hype_772...",
      "> Decrypting soul wavelength profile vectors...",
      "> Active thread count: 4,921 secure sockets linked...",
      "> Warning: Cosmic alignment anomaly detected in Sector_Dark...",
      "> Restoring structural matrix integrity...",
      "> Movie recommendation generated for terminal 109...",
      "> User_Luffy23 joined Straw Hat Galley hub room...",
      "> P2P Arena: Duel initiated in Sector_09...",
      "> Sync rate optimized to 99.87% for Gojo Satoru..."
    ];

    const interval = setInterval(() => {
      const randomLine = rawTemplates[Math.floor(Math.random() * rawTemplates.length)];
      setLiveLogs(prev => {
        const next = [...prev, randomLine];
        if (next.length > 30) next.shift();
        return next;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [booting]);

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [liveLogs]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    playCyberBeep(1000, 'sine', 0.1);
    const endpoint = authMode === 'login' ? 'login' : 'signup';

    try {
      const res = await fetch(`${API_URL}/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'Authentication failed');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      navigate('/workspace');
      window.location.reload();
    } catch (err) {
      setError(err.message);
      playCyberBeep(300, 'sawtooth', 0.25);
    } finally {
      setLoading(false);
    }
  };

  const marketingFactions = [
    {
      title: 'Dark Masterminds',
      desc: 'Cross paths with Sukuna, Ken Kaneki, and Light Yagami. Walk the path of absolute masterminds.',
      poster: '/images/dark_faction_poster.png',
      color: 'var(--neon-purple)',
      glow: '0 0 20px rgba(161, 35, 255, 0.6)'
    },
    {
      title: 'Hype Squad',
      desc: 'Channel the limit-breaking combat energy of Gear 5 Luffy, Goku, and Naruto Uzumaki.',
      poster: '/images/hype_faction_poster.png',
      color: 'var(--neon-red)',
      glow: '0 0 20px rgba(255, 42, 95, 0.6)'
    },
    {
      title: 'Tactical Chill',
      desc: 'Emulate the flawless, quiet mastery of Kakashi Hatake.',
      poster: '/images/chill_faction_poster.png',
      color: 'var(--neon-cyan)',
      glow: '0 0 20px rgba(0, 240, 255, 0.6)'
    }
  ];

  const roadmapSteps = [
    {
      step: 'STEP 01',
      title: 'COGNITIVE ALIGNMENT',
      desc: 'Decrypt your daily log to extract your core wavelength frequency.',
      icon: <Database size={24} style={{ color: 'var(--neon-purple)' }} />
    },
    {
      step: 'STEP 02',
      title: 'CHASSIS MANIFESTATION',
      desc: 'Instantly bond with your matching legendary anime archetype entity.',
      icon: <Cpu size={24} style={{ color: 'var(--neon-red)' }} />
    },
    {
      step: 'STEP 03',
      title: 'FACTION DEPLOYMENT',
      desc: 'Enter dedicated Hubs and unlock AI-powered Chrono Reel movie matrices.',
      icon: <Layers size={24} style={{ color: 'var(--neon-cyan)' }} />
    }
  ];

  if (booting) {
    return (
      <div 
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: '#030307',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          zIndex: 9999,
          fontFamily: 'var(--font-mono)'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', textAlign: 'left', minWidth: '350px' }}>
          {bootLogs.map((log, idx) => (
            <div key={idx} style={{ color: '#00ff66', textShadow: '0 0 10px rgba(0,255,102,0.6)', fontSize: '1rem', letterSpacing: '1px' }}>
              &gt; {log}
            </div>
          ))}
          <span className="cursor-blink" style={{ display: 'inline-block', width: '8px', height: '15px', backgroundColor: '#00ff66', animation: 'blink 0.8s infinite' }} />
        </div>
        
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
        ` }} />
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', padding: '4rem 1.5rem 6rem 1.5rem', zIndex: 1, backgroundColor: '#030307', overflow: 'hidden' }}>
      
      {/* Scenic grids, scanlines, vignettes */}
      <div className="scenic-grid-bg" />
      <div className="scenic-scanlines" />
      <div className="scenic-vignette" />

      {/* Cyber-dust matrix particle backdrop effect */}
      <div className="particles-backdrop" />

      {/* Styles for particles, glitch effects, and flex poster cards */}
      <style dangerouslySetInnerHTML={{ __html: `
        .particles-backdrop {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          pointer-events: none;
          z-index: 0;
          background-image: radial-gradient(circle at 10% 20%, rgba(161, 35, 255, 0.03) 0%, transparent 40%),
                            radial-gradient(circle at 80% 70%, rgba(0, 240, 255, 0.03) 0%, transparent 40%);
          animation: float-ambient 20s ease-in-out infinite alternate;
        }

        @keyframes float-ambient {
          0% { transform: translateY(0px) scale(1); }
          100% { transform: translateY(-30px) scale(1.05); }
        }

        /* Glitch Title Hover Effect */
        .glitch-title {
          font-size: 3.8rem;
          font-weight: 950;
          letter-spacing: -2px;
          text-transform: uppercase;
          line-height: 1.1;
          color: #fff;
          position: relative;
        }

        .glitch-title:hover {
          animation: cyber-glitch 0.25s linear infinite;
        }

        /* Faction Cards Flex-Grow Transition */
        .faction-flex-container {
          display: flex;
          width: 100%;
          height: 480px;
          gap: 1.5rem;
          margin-top: 1rem;
        }

        .faction-flex-card {
          flex: 1;
          position: relative;
          overflow: hidden;
          border-radius: 12px;
          border: 1px solid var(--glass-border);
          background-color: rgba(10, 11, 20, 0.7);
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 2.5rem 2rem;
          cursor: pointer;
          transition: all 0.6s cubic-bezier(0.25, 0.8, 0.25, 1);
        }

        .faction-flex-card:hover {
          flex: 2.2;
          border-color: var(--hover-theme) !important;
          box-shadow: var(--hover-glow) !important;
        }

        .faction-flex-card .poster-bg {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          z-index: 1;
          opacity: 0.25;
          background-size: cover;
          background-position: center;
          transition: opacity 0.6s ease, transform 0.6s ease;
        }

        .faction-flex-card:hover .poster-bg {
          opacity: 0.75;
          transform: scale(1.05);
        }

        .faction-flex-card .content-overlay {
          position: relative;
          z-index: 3;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          transition: transform 0.4s ease;
        }

        .faction-flex-card:hover .content-overlay {
          transform: translateY(-5px);
        }

        .faction-flex-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(to top, rgba(3, 3, 7, 0.95) 15%, rgba(3, 3, 7, 0.4) 60%, transparent 100%);
          z-index: 2;
          pointer-events: none;
          transition: opacity 0.6s ease;
        }

        .faction-flex-card:hover::before {
          background: linear-gradient(to top, rgba(3, 3, 7, 0.95) 25%, rgba(3, 3, 7, 0.2) 70%, transparent 100%);
        }

        @media (max-width: 850px) {
          .faction-flex-container {
            flex-direction: column;
            height: auto;
            gap: 1.5rem;
          }
          .faction-flex-card {
            height: 320px;
            flex: none !important;
            width: 100%;
          }
        }
      ` }} />

      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '7rem', position: 'relative', zIndex: 3 }}>
        
        {/* HERO SECTION */}
        <section style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.8rem', marginTop: '2rem' }}>
          <span className="mono-hud" style={{ color: 'var(--neon-cyan)', fontSize: '0.8rem', border: '1px solid var(--neon-cyan)', padding: '4px 12px', borderRadius: '4px', boxShadow: 'var(--glow-cyan)', letterSpacing: '3px' }}>
            [ DIRECTIVE NODE ACTIVE // AAA_SECURE_PORTAL ]
          </span>
          
          <h1 className="glitch-title">
            UNLEASH YOUR INNER CHASSIS.<br />
            <span style={{ color: 'var(--neon-red)', textShadow: '0 0 20px rgba(255, 42, 95, 0.5)' }}>ALIGN YOUR ANIME SOUL.</span>
          </h1>
          
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.15rem', maxWidth: '800px', lineHeight: '1.7', margin: '0.5rem auto 0 auto' }}>
            Stop watching from the sidelines. Step into the matrix where your daily energy unlocks the absolute power vectors of legendary anime icons. Are you Void/Dark like Gojo, pure Shonen Hype like Luffy, or cool and tactical like Levi? Decrypt your wavelength and find your true archetype now.
          </p>
        </section>

        {/* SECTION 2: INTERACTIVE FACTION CARDS (HOVER EXPANSION) */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.8rem', textAlign: 'center' }}>
            <span className="mono-hud" style={{ color: 'var(--neon-purple)', fontSize: '0.8rem', letterSpacing: '2px', textTransform: 'uppercase' }}>
              // CHASSIS SECTORS ALIGNED IN REALTIME
            </span>
          </div>

          <div className="faction-flex-container">
            {marketingFactions.map((faction, idx) => (
              <div 
                key={idx}
                className="faction-flex-card"
                onClick={() => handleFactionClick(faction.title)}
                style={{
                  '--hover-theme': faction.color,
                  '--hover-glow': faction.glow
                }}
              >
                {/* Background Poster Image */}
                <div 
                  className="poster-bg"
                  style={{
                    backgroundImage: `url(${faction.poster})`
                  }}
                />
                
                {/* Content Overlay */}
                <div className="content-overlay">
                  <h3 
                    style={{ 
                      fontFamily: "'Russo One', sans-serif", 
                      fontStyle: 'italic', 
                      fontSize: '1.8rem', 
                      color: faction.color, 
                      textShadow: `0 0 15px ${faction.color}`,
                      letterSpacing: '1px',
                      textTransform: 'uppercase'
                    }}
                  >
                    {faction.title}
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                    {faction.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 3: THE CORE UTILITY MATRIX (3-COLUMN FEATURE GRID) */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.8rem', textAlign: 'center' }}>
            <span className="mono-hud" style={{ color: 'var(--neon-cyan)', fontSize: '0.8rem', letterSpacing: '2px', textTransform: 'uppercase' }}>
              // THE CORE UTILITY MATRIX
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <div 
              className="glass-panel" 
              style={{ 
                padding: '2.5rem 2rem', 
                backgroundColor: 'rgba(10, 10, 12, 0.7)', 
                border: '1px solid rgba(255, 255, 255, 0.08)', 
                borderRadius: '12px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.2rem',
                transition: 'var(--transition-bezier)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = 'var(--neon-purple)';
                e.currentTarget.style.boxShadow = '0 0 15px rgba(161, 35, 255, 0.2)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ position: 'absolute', top: '10px', right: '10px', width: '8px', height: '8px', borderTop: '2px solid var(--neon-purple)', borderRight: '2px solid var(--neon-purple)' }} />
              <span className="mono-hud" style={{ fontSize: '0.75rem', color: 'var(--neon-purple)', fontWeight: 'bold' }}>CARD 01 // SYNAPSE CHAT</span>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fff' }}>DIRECT INTERACTION PIPELINE</h3>
              <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Dive into immersive, AI-powered direct messaging pipelines with legendary archetypes.
              </p>
            </div>

            <div 
              className="glass-panel" 
              style={{ 
                padding: '2.5rem 2rem', 
                backgroundColor: 'rgba(10, 10, 12, 0.7)', 
                border: '1px solid rgba(255, 255, 255, 0.08)', 
                borderRadius: '12px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.2rem',
                transition: 'var(--transition-bezier)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = 'var(--neon-red)';
                e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 42, 95, 0.2)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ position: 'absolute', top: '10px', right: '10px', width: '8px', height: '8px', borderTop: '2px solid var(--neon-red)', borderRight: '2px solid var(--neon-red)' }} />
              <span className="mono-hud" style={{ fontSize: '0.75rem', color: 'var(--neon-red)', fontWeight: 'bold' }}>CARD 02 // HOLOCINEMA ENGINE</span>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fff' }}>MOOD WAVE ANALYZER</h3>
              <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Let the matrix dissect your mood wavelength to stream tailored anime and cinema recommendations.
              </p>
            </div>

            <div 
              className="glass-panel" 
              style={{ 
                padding: '2.5rem 2rem', 
                backgroundColor: 'rgba(10, 10, 12, 0.7)', 
                border: '1px solid rgba(255, 255, 255, 0.08)', 
                borderRadius: '12px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.2rem',
                transition: 'var(--transition-bezier)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = 'var(--neon-cyan)';
                e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 240, 255, 0.2)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ position: 'absolute', top: '10px', right: '10px', width: '8px', height: '8px', borderTop: '2px solid var(--neon-cyan)', borderRight: '2px solid var(--neon-cyan)' }} />
              <span className="mono-hud" style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', fontWeight: 'bold' }}>CARD 03 // ARENA HUB CLUBS</span>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fff' }}>COSMIC CLASH CORES</h3>
              <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                Deploy into faction-specific communities, join active rooms, and conquer the global leaderboards.
              </p>
            </div>
          </div>
        </section>

        {/* INTERACTIVE USER ROADMAP */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.8rem', textAlign: 'center' }}>
            <span className="mono-hud" style={{ color: 'var(--neon-cyan)', fontSize: '0.8rem', letterSpacing: '2px', textTransform: 'uppercase' }}>
              // THE OPERATION BLUEPRINT ROADMAP
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            {roadmapSteps.map((step, idx) => (
              <div 
                key={idx} 
                className="glass-panel" 
                style={{ 
                  padding: '2rem 1.8rem', 
                  backgroundColor: 'rgba(12, 14, 25, 0.5)', 
                  border: '1px solid var(--glass-border)', 
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  position: 'relative'
                }}
              >
                {/* Visual Step Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="mono-hud" style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 'bold' }}>
                    {step.step}
                  </span>
                  <div style={{ width: '40px', height: '40px', borderRadius: '4px', border: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                    {step.icon}
                  </div>
                </div>

                <h4 className="mono-hud" style={{ fontSize: '1rem', color: '#fff', fontWeight: 'bold', marginTop: '0.5rem' }}>
                  {step.title}
                </h4>
                
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 4: LIVE MATRIX TRANSMISSION FEED */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.8rem', textAlign: 'center' }}>
            <span className="mono-hud" style={{ color: 'var(--neon-purple)', fontSize: '0.8rem', letterSpacing: '2px', textTransform: 'uppercase' }}>
              // LIVE MATRIX TRANSMISSION FEED
            </span>
          </div>

          <div 
            className="glass-panel" 
            style={{ 
              padding: '1.5rem', 
              backgroundColor: 'rgba(5, 7, 12, 0.95)',
              border: '1px solid rgba(0, 255, 102, 0.3)',
              borderRadius: '8px',
              position: 'relative',
              boxShadow: '0 0 25px rgba(0, 255, 102, 0.05)'
            }}
          >
            {/* Header / Top bar of console */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,255,102,0.15)', paddingBottom: '0.6rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00ff66', display: 'inline-block', animation: 'blink 1s infinite' }} />
                <span className="mono-hud" style={{ fontSize: '0.75rem', color: '#00ff66', fontWeight: 'bold' }}>SYSTEM_TELEMETRY.LOG</span>
              </div>
              <span className="mono-hud" style={{ fontSize: '0.75rem', color: 'rgba(0, 255, 102, 0.5)' }}>STATUS: ACTIVE_SYNC</span>
            </div>

            {/* Logs Body */}
            <div 
              ref={consoleRef}
              style={{ 
                height: '180px', 
                overflowY: 'auto', 
                fontFamily: 'var(--font-mono)', 
                fontSize: '0.85rem', 
                color: '#00ff66', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.4rem',
                paddingRight: '0.5rem'
              }}
            >
              {liveLogs.map((log, idx) => (
                <div key={idx} style={{ textShadow: '0 0 5px rgba(0,255,102,0.3)', textAlign: 'left' }}>
                  {log}
                </div>
              ))}
              <span className="cursor-blink" style={{ display: 'inline-block', width: '8px', height: '14px', backgroundColor: '#00ff66', marginTop: '0.2rem' }} />
            </div>
          </div>
        </section>

        {/* COGNITIVE ACCESS TERMINAL (LOGIN STAGE) */}
        <section id="auth-terminal" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
          <div 
            className="glass-panel" 
            style={{ 
              width: '100%', 
              maxWidth: '460px', 
              padding: '3rem 2.5rem', 
              border: '2px solid rgba(0, 255, 102, 0.4)', 
              boxShadow: '0 0 35px rgba(0, 255, 102, 0.15)',
              backgroundColor: 'rgba(5, 7, 12, 0.95)',
              position: 'relative'
            }}
          >
            {/* Visual corner decorations */}
            <div style={{ position: 'absolute', top: '10px', left: '10px', width: '12px', height: '12px', borderTop: '2px solid #00ff66', borderLeft: '2px solid #00ff66' }} />
            <div style={{ position: 'absolute', top: '10px', right: '10px', width: '12px', height: '12px', borderTop: '2px solid #00ff66', borderRight: '2px solid #00ff66' }} />
            <div style={{ position: 'absolute', bottom: '10px', left: '10px', width: '12px', height: '12px', borderBottom: '2px solid #00ff66', borderLeft: '2px solid #00ff66' }} />
            <div style={{ position: 'absolute', bottom: '10px', right: '10px', width: '12px', height: '12px', borderBottom: '2px solid #00ff66', borderRight: '2px solid #00ff66' }} />

            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <span className="mono-hud terminal-green-text" style={{ fontSize: '0.9rem', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>
                INITIALIZE FREQUENCY SYNC // ENTER THE MATRIX
              </span>
            </div>

            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(255, 42, 95, 0.08)', border: '1px solid var(--neon-red)', color: 'var(--neon-red)', padding: '0.75rem', borderRadius: '4px', marginBottom: '1.2rem', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                <ShieldAlert size={14} />
                <span>{error.toUpperCase()}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {authMode === 'signup' && (
                <div>
                  <label className="mono-hud" style={{ fontSize: '0.7rem', color: '#00ff66', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                    &gt;_ Username
                  </label>
                  <input 
                    type="text" 
                    value={form.username}
                    onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
                    required
                    style={{ width: '100%', padding: '0.85rem', backgroundColor: 'rgba(0,0,0,0.7)', border: '1px solid rgba(0, 255, 102, 0.25)', borderRadius: '4px', color: '#fff', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#00ff66'}
                    onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(0, 255, 102, 0.25)'}
                  />
                </div>
              )}
              
              <div>
                <label className="mono-hud" style={{ fontSize: '0.7rem', color: '#00ff66', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                  &gt;_ Email Address
                </label>
                <input 
                  type="email" 
                  value={form.email}
                  onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                  style={{ width: '100%', padding: '0.85rem', backgroundColor: 'rgba(0,0,0,0.7)', border: '1px solid rgba(0, 255, 102, 0.25)', borderRadius: '4px', color: '#fff', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#00ff66'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(0, 255, 102, 0.25)'}
                />
              </div>

              <div>
                <label className="mono-hud" style={{ fontSize: '0.7rem', color: '#00ff66', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase' }}>
                  &gt;_ Secret Passkey
                </label>
                <input 
                  type="password" 
                  value={form.password}
                  onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                  required
                  style={{ width: '100%', padding: '0.85rem', backgroundColor: 'rgba(0,0,0,0.7)', border: '1px solid rgba(0, 255, 102, 0.25)', borderRadius: '4px', color: '#fff', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}
                  onFocus={(e) => e.currentTarget.style.borderColor = '#00ff66'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(0, 255, 102, 0.25)'}
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="mono-hud"
                style={{ 
                  padding: '0.9rem', 
                  background: 'linear-gradient(135deg, rgba(0, 255, 102, 0.15) 0%, #000 100%)', 
                  border: '1px solid #00ff66', 
                  color: '#00ff66', 
                  borderRadius: '4px', 
                  cursor: 'pointer', 
                  fontWeight: 'bold', 
                  letterSpacing: '1.5px', 
                  marginTop: '0.8rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '0.6rem', 
                  fontSize: '0.85rem', 
                  transition: 'var(--transition-bezier)',
                  boxShadow: '0 0 10px rgba(0, 255, 102, 0.05)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#00ff66';
                  e.currentTarget.style.color = '#000';
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 255, 102, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#00ff66';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {authMode === 'login' ? <LogIn size={15} /> : <UserPlus size={15} />}
                {loading ? 'SYNCHRONIZING...' : (authMode === 'login' ? 'INITIALIZE LINK' : 'GENERATE PROFILE')}
              </button>
            </form>

            <div className="mono-hud" style={{ textAlign: 'center', marginTop: '1.8rem', fontSize: '0.75rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>
                {authMode === 'login' ? "NO ACTIVE ACCESS PROFILE? " : "PROFILE ALREADY REGISTERED? "}
              </span>
              <button 
                onClick={() => {
                  playCyberBeep(750, 'sine', 0.05);
                  setAuthMode(authMode === 'login' ? 'signup' : 'login');
                  setError('');
                }}
                style={{ background: 'transparent', border: 'none', color: '#00ff66', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline', outline: 'none' }}
              >
                {authMode === 'login' ? 'CREATE PROFILE' : 'ACCESS LINK'}
              </button>
            </div>
          </div>
        </section>

        {/* SECTION 5: SYSTEM TERMINAL FOOTER */}
        <footer 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            borderTop: '1px solid rgba(255,255,255,0.05)', 
            paddingTop: '2rem',
            paddingBottom: '2rem',
            marginTop: '2rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div>
            <span className="mono-hud" style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', letterSpacing: '1px' }}>
              ANI VERSE // CORE_V1.9 // ALL RIGHTS RESERVED
            </span>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); playCyberBeep(700, 'sine', 0.05); }} 
              className="mono-hud" 
              style={{ 
                fontSize: '0.75rem', 
                color: 'rgba(255, 255, 255, 0.4)', 
                textDecoration: 'none', 
                transition: 'var(--transition-bezier)' 
              }} 
              onMouseOver={(e) => e.currentTarget.style.color = '#fff'} 
              onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
            >
              SYSTEM STATUS
            </a>
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); playCyberBeep(700, 'sine', 0.05); }} 
              className="mono-hud" 
              style={{ 
                fontSize: '0.75rem', 
                color: 'rgba(255, 255, 255, 0.4)', 
                textDecoration: 'none', 
                transition: 'var(--transition-bezier)' 
              }} 
              onMouseOver={(e) => e.currentTarget.style.color = '#fff'} 
              onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
            >
              API PROTOCOLS
            </a>
            <a 
              href="#" 
              onClick={(e) => { e.preventDefault(); playCyberBeep(700, 'sine', 0.05); }} 
              className="mono-hud" 
              style={{ 
                fontSize: '0.75rem', 
                color: 'rgba(255, 255, 255, 0.4)', 
                textDecoration: 'none', 
                transition: 'var(--transition-bezier)' 
              }} 
              onMouseOver={(e) => e.currentTarget.style.color = '#fff'} 
              onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
            >
              SUPPORT DEPLOYMENT
            </a>
          </div>
        </footer>

      </div>

      {/* LIVE SYSTEM TELEMETRY TICKER */}
      <footer 
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          backgroundColor: 'rgba(3, 3, 7, 0.9)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderTop: '1px solid rgba(0, 255, 102, 0.2)',
          padding: '0.5rem 1.5rem',
          zIndex: 99,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <span 
          className="mono-hud terminal-green-text" 
          style={{ 
            fontSize: '0.7rem', 
            fontWeight: 'bold', 
            letterSpacing: '1px', 
            textAlign: 'center',
            animation: 'pulse-cyan 2s infinite alternate' 
          }}
        >
          [ SYSTEM CORES RECRUITED: 1,847 ] // [ PIPELINE MATRIX STATUS: OPERATIONAL ] // [ FREQUENCY ALLIANCE: STABLE ]
        </span>
      </footer>

    </div>
  );
}
