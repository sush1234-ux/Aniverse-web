import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Zap, Terminal } from 'lucide-react';

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

export default function ArenaSelect() {
  const navigate = useNavigate();

  const menuItems = [
    {
      title: '1V1 DUEL PORTAL',
      desc: 'Simulate instant high-stakes AI-driven roast battles against iconic anime contenders. Fight over topics and claim victory.',
      path: '/arena/play',
      vibe: 'hype',
      color: '#ff2a5f',
      glow: '0 0 20px rgba(255, 42, 95, 0.4)',
      icon: <Shield size={32} style={{ color: '#ff2a5f' }} />
    },
    {
      title: '3V3 MULTIVERSE TEAM RUMBLE',
      desc: 'Draft a squad of 3 character interfaces. Execute immediate tag assists, shift combat focus, and tag in backup elements.',
      path: '/teambattle',
      vibe: 'dark',
      color: '#a123ff',
      glow: '0 0 20px rgba(161, 35, 255, 0.4)',
      icon: <Users size={32} style={{ color: '#a123ff' }} />
    },
    {
      title: 'MULTIPLAYER SECTOR',
      desc: 'Connect to players in the lobby. Execute tactical actions (Strike, Barrier, Ultimate) in synchronous turn-based combat.',
      path: '/multiplayer',
      vibe: 'chill',
      color: '#00f0ff',
      glow: '0 0 20px rgba(0, 240, 255, 0.4)',
      icon: <Zap size={32} style={{ color: '#00f0ff' }} />
    }
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '4rem auto', padding: '0 1.5rem', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      
      {/* HUD Header */}
      <div style={{ textAlign: 'center' }}>
        <span className="mono-hud" style={{ color: 'var(--neon-purple)', fontSize: '0.8rem', fontWeight: 'bold', letterSpacing: '3px' }}>
          [ ACTIVE PORTAL REGISTRY ]
        </span>
        <h1 style={{ fontSize: '2.8rem', marginTop: '0.5rem', fontWeight: '950', textTransform: 'uppercase', letterSpacing: '-1px' }}>
          Select Game Arena Sector
        </h1>
        <p className="mono-hud" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '600px', margin: '0.6rem auto 0 auto' }}>
          Synchronize mental interface parameters and load the battlefield configuration metrics.
        </p>
      </div>

      {/* Grid of modes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem' }}>
        {menuItems.map((item, idx) => (
          <div
            key={idx}
            onMouseEnter={() => playCyberBeep(850, 'sine', 0.04)}
            onClick={() => {
              playCyberBeep(1200, 'sine', 0.1);
              navigate(item.path);
            }}
            className="glass-panel cyber-glitch-hover"
            style={{
              cursor: 'pointer',
              padding: '2.5rem 2rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              height: '350px',
              border: `1px solid rgba(255,255,255,0.08)`,
              borderRadius: '8px',
              backgroundColor: 'rgba(10, 11, 20, 0.6)',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = item.color;
              e.currentTarget.style.boxShadow = item.glow;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {/* Visual scanlines overlay inside panel */}
            <div 
              style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                opacity: 0.03,
                backgroundImage: 'repeating-linear-gradient(45deg, #fff 0px, #fff 1px, transparent 1px, transparent 10px)',
                pointerEvents: 'none'
              }}
            />

            {/* Corner Bracket */}
            <div style={{ position: 'absolute', top: '12px', right: '12px', width: '12px', height: '12px', borderTop: `2px solid ${item.color}`, borderRight: `2px solid ${item.color}` }} />

            <div>
              <div style={{ marginBottom: '1.5rem' }}>{item.icon}</div>
              <h3 className="mono-hud" style={{ fontSize: '1.4rem', fontWeight: '900', color: '#fff', marginBottom: '0.8rem', letterSpacing: '-0.5px' }}>
                {item.title}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                {item.desc}
              </p>
            </div>

            <div 
              className="mono-hud" 
              style={{ 
                alignSelf: 'flex-start',
                fontSize: '0.75rem', 
                color: item.color, 
                fontWeight: 'bold', 
                borderBottom: `2px solid ${item.color}`,
                paddingBottom: '3px',
                marginTop: '1.5rem',
                letterSpacing: '1px'
              }}
            >
              LOAD GATEWAY &gt;&gt;
            </div>
          </div>
        ))}
      </div>
      
    </div>
  );
}
