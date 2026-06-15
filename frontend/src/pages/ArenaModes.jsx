import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Flame, Sword, Heart, Activity, AlertCircle, ArrowLeft, Trophy } from 'lucide-react';

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


const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ArenaModes() {
  const location = useLocation();
  const navigate = useNavigate();
  const is3v3 = location.pathname === '/teambattle';

  // State variables
  const [characters, setCharacters] = useState([]);
  const [topic, setTopic] = useState('Who is the ultimate anime legend?');
  const [isBattleActive, setIsBattleActive] = useState(false);
  const [loadingTurn, setLoadingTurn] = useState(false);
  const [history, setHistory] = useState([]);
  
  // Game states: PointsA & PointsB represent health bar weight splits (starts balanced at 50/50)
  const [pointsA, setPointsA] = useState(50);
  const [pointsB, setPointsB] = useState(50);

  // 1v1 States
  const [contenderA, setContenderA] = useState(null);
  const [contenderB, setContenderB] = useState(null);

  // 3v3 Team States
  const [teamA, setTeamA] = useState([]); // array of 3 characters
  const [teamB, setTeamB] = useState([]); // array of 3 characters
  const [activeAIdx, setActiveAIdx] = useState(0);
  const [activeBIdx, setActiveBIdx] = useState(0);
  const [koA, setKoA] = useState([false, false, false]);
  const [koB, setKoB] = useState([false, false, false]);

  // Active Setup slot selectors (for character swap assignment in 3v3 staging)
  const [selectedSlotA, setSelectedSlotA] = useState(0);
  const [selectedSlotB, setSelectedSlotB] = useState(0);

  // Turn tracking states
  const [currentSpeakerSide, setCurrentSpeakerSide] = useState('A'); // 'A' or 'B'
  const [countdown, setCountdown] = useState(0);
  const [userReactionScore, setUserReactionScore] = useState(0);
  const [affinityGained, setAffinityGained] = useState(0);
  const [readingBufferActive, setReadingBufferActive] = useState(false);
  const [readingBufferCountdown, setReadingBufferCountdown] = useState(0);

  // Visual effects overlays
  const [slashEffect, setSlashEffect] = useState(null); // 'A' or 'B'
  const [fireEffect, setFireEffect] = useState(null);  // 'A' or 'B'
  const [tagFlash, setTagFlash] = useState(false);
  const [gameOverVerdict, setGameOverVerdict] = useState(null);

  const countdownTimer = useRef(null);
  const nextTurnParams = useRef({ nextSide: 'A', pointsA: 50, pointsB: 50, history: [] });

  const executeGameTurnRef = useRef(null);
  const startReadingBufferRef = useRef(null);
  const startCountdownTickerRef = useRef(null);

  useEffect(() => {
    executeGameTurnRef.current = executeGameTurn;
    startReadingBufferRef.current = startReadingBuffer;
    startCountdownTickerRef.current = startCountdownTicker;
  });

  useEffect(() => {
    // Load top matrix profiles quietly
    fetch(`${API_URL}/api/archetype-matrix`)
      .then(res => res.json())
      .then(data => {
        if (data && data.data) {
          const raw = data.data.slice(0, 20);
          const seenNames = new Set();
          const mapped = [];
          
          raw.forEach(item => {
            if (item.name.includes(',')) {
              const parts = item.name.split(',').map(p => p.trim());
              item.name = `${parts[1]} ${parts[0]}`;
            }
            if (!seenNames.has(item.name)) {
              seenNames.add(item.name);
              let themeColor = '#00f0ff';
              if (SHONEN_HYPE_NAMES.some(h => item.name.toLowerCase().includes(h.toLowerCase()))) {
                themeColor = '#ff2a5f';
              } else if (DARK_ANTIHERO_NAMES.some(d => item.name.toLowerCase().includes(d.toLowerCase()))) {
                themeColor = '#a123ff';
              }
              mapped.push({
                _id: item.mal_id.toString(),
                name: item.name,
                animeSource: item.name_kanji ? `${item.name_kanji} Series` : 'Featured Series',
                avatarUrl: item.images.jpg.image_url,
                themeColor
              });
            }
          });
          setCharacters(mapped);
          
          // Seed defaults with completely unique entries
          if (mapped.length >= 6) {
            if (is3v3) {
              setTeamA([mapped[0], mapped[2], mapped[4]]);
              setTeamB([mapped[1], mapped[3], mapped[5]]);
            } else {
              setContenderA(mapped[0]);
              setContenderB(mapped[1]);
            }
          } else if (mapped.length > 1) {
            if (is3v3) {
              setTeamA([mapped[0], mapped[0], mapped[0]]);
              setTeamB([mapped[1], mapped[1], mapped[1]]);
            } else {
              setContenderA(mapped[0]);
              setContenderB(mapped[1]);
            }
          }
        }
      })
      .catch(err => {
        console.error('Local roster sync error:', err.message);
        // Static fallbacks
        const fallbacks = [
          { _id: '1', name: 'Monkey D. Luffy', animeSource: 'One Piece', avatarUrl: 'https://images.unsplash.com/photo-1541562232579-512a21360020?w=200', themeColor: '#ff2a5f' },
          { _id: '2', name: 'Gojo Satoru', animeSource: 'Jujutsu Kaisen', avatarUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=200', themeColor: '#a123ff' },
          { _id: '3', name: 'Kakashi Hatake', animeSource: 'Naruto', avatarUrl: 'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=200', themeColor: '#00f0ff' },
          { _id: '4', name: 'Saitama', animeSource: 'One Punch Man', avatarUrl: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=200', themeColor: '#ff2a5f' },
          { _id: '5', name: 'Levi Ackerman', animeSource: 'Attack on Titan', avatarUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200', themeColor: '#a123ff' },
          { _id: '6', name: 'Lelouch Lamperouge', animeSource: 'Code Geass', avatarUrl: 'https://images.unsplash.com/photo-1580477667995-2b94f01c9516?w=200', themeColor: '#00f0ff' }
        ];
        setCharacters(fallbacks);
        if (is3v3) {
          setTeamA([fallbacks[0], fallbacks[2], fallbacks[4]]);
          setTeamB([fallbacks[1], fallbacks[3], fallbacks[5]]);
        } else {
          setContenderA(fallbacks[0]);
          setContenderB(fallbacks[1]);
        }
      });
  }, [is3v3]);

  // Clean Jikan naming references
  const SHONEN_HYPE_NAMES = ['Luffy', 'Goku', 'Naruto', 'Zoro', 'Saitama', 'Gon', 'Sukuna', 'Edward'];
  const DARK_ANTIHERO_NAMES = ['Levi', 'Lelouch', 'Light', 'Lawliet', 'Gojo', 'Itachi', 'Sasuke', 'Kaneki'];

  // Start Battle Matchstage
  const handleStartBattle = () => {
    playCyberBeep(1100, 'sawtooth', 0.2);
    setPointsA(50);
    setPointsB(50);
    setHistory([]);
    setGameOverVerdict(null);
    setIsBattleActive(true);
    setCurrentSpeakerSide('A');
    setActiveAIdx(0);
    setActiveBIdx(0);
    setKoA([false, false, false]);
    setKoB([false, false, false]);
    
    // Set next turn params
    nextTurnParams.current = { nextSide: 'A', pointsA: 50, pointsB: 50, history: [] };

    // Trigger first turn after brief delay
    setTimeout(() => {
      const { nextSide, pointsA, pointsB, history } = nextTurnParams.current;
      executeGameTurnRef.current(nextSide, pointsA, pointsB, history);
    }, 500);
  };

  // Process game turns via Gemini REST pipeline
  const executeGameTurn = async (speakerSide, currentPointsA, currentPointsB, currentHistory, overrideActiveAIdx = null, overrideActiveBIdx = null) => {
    setLoadingTurn(true);
    setUserReactionScore(0);
    setReadingBufferActive(false);
    setReadingBufferCountdown(0);
    setCountdown(0);
    clearInterval(countdownTimer.current);
    
    const resolvedActiveAIdx = overrideActiveAIdx !== null ? overrideActiveAIdx : activeAIdx;
    const resolvedActiveBIdx = overrideActiveBIdx !== null ? overrideActiveBIdx : activeBIdx;

    const active = speakerSide === 'A' 
      ? (is3v3 ? teamA[resolvedActiveAIdx] : contenderA)
      : (is3v3 ? teamB[resolvedActiveBIdx] : contenderB);
    
    const opponent = speakerSide === 'A'
      ? (is3v3 ? teamB[resolvedActiveBIdx] : contenderB)
      : (is3v3 ? teamA[resolvedActiveAIdx] : contenderA);

    if (!active || !opponent) {
      setLoadingTurn(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/arena/process-turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          activeSpeaker: active,
          opponentSpeaker: opponent,
          topic,
          history: currentHistory.slice(-4),
          userReactionScore: userReactionScore
        })
      });
      const data = await res.json();
      
      if (res.ok) {
        const updatedHistory = [...currentHistory, { speaker: data.speaker, text: data.text, side: speakerSide }];
        setHistory(updatedHistory);
        playCyberBeep(850, 'triangle', 0.1);

        // Apply health bar damage split calculations based on reaction modifier score
        // High score aids the active speaker's health weight ratio
        const scoreMod = Math.min(userReactionScore, 40);
        let nextPointsA = currentPointsA;
        let nextPointsB = currentPointsB;

        if (speakerSide === 'A') {
          // A roasts B: PointsA weight increases
          const shift = 10 + Math.round(scoreMod * 0.4);
          nextPointsA = Math.min(100, currentPointsA + shift);
          nextPointsB = Math.max(0, currentPointsB - shift);
        } else {
          // B roasts A: PointsB weight increases
          const shift = 10 + Math.round(scoreMod * 0.4);
          nextPointsB = Math.min(100, currentPointsB + shift);
          nextPointsA = Math.max(0, currentPointsA - shift);
        }

        setPointsA(nextPointsA);
        setPointsB(nextPointsB);

        // Check if K.O. threshold hit (0% weight)
        if (nextPointsB <= 0) {
          // Side B active character K.O.
          if (is3v3) {
            handleKo('B', activeBIdx, nextPointsA, nextPointsB, updatedHistory);
          } else {
            setGameOverVerdict(`${contenderA.name} wins this battle!`);
            setIsBattleActive(false);
          }
        } else if (nextPointsA <= 0) {
          // Side A active character K.O.
          if (is3v3) {
            handleKo('A', activeAIdx, nextPointsA, nextPointsB, updatedHistory);
          } else {
            setGameOverVerdict(`${contenderB.name} wins this battle!`);
            setIsBattleActive(false);
          }
        } else {
          // No KO, swap turn and start reading buffer
          const nextSide = speakerSide === 'A' ? 'B' : 'A';
          setCurrentSpeakerSide(nextSide);
          
          nextTurnParams.current = { nextSide, pointsA: nextPointsA, pointsB: nextPointsB, history: updatedHistory };
          startReadingBufferRef.current();
        }
      }
    } catch (err) {
      console.error('Arena turn execution failure:', err);
    } finally {
      setLoadingTurn(false);
    }
  };

  // Handle character K.O. and rotation in 3v3 Multiverse rumble
  const handleKo = (koSide, koIdx, pointsAValue, pointsBValue, updatedHistory) => {
    playCyberBeep(250, 'sawtooth', 0.4);
    if (koSide === 'A') {
      const nextKoA = [...koA];
      nextKoA[koIdx] = true;
      setKoA(nextKoA);

      const nextActiveIdx = activeAIdx + 1;
      if (nextActiveIdx < 3) {
        setActiveAIdx(nextActiveIdx);
        // Reset split back to 50/50 balance for incoming teammate
        setPointsA(50);
        setPointsB(50);
        setCurrentSpeakerSide('A');
        
        nextTurnParams.current = { nextSide: 'A', pointsA: 50, pointsB: 50, history: updatedHistory };
        setTimeout(() => {
          const { nextSide, pointsA, pointsB, history } = nextTurnParams.current;
          executeGameTurnRef.current(nextSide, pointsA, pointsB, history);
        }, 1500);
      } else {
        // All team A KO
        setGameOverVerdict(`TEAM BLUE (Side B) wins the multiverse battle!`);
        setIsBattleActive(false);
      }
    } else {
      const nextKoB = [...koB];
      nextKoB[koIdx] = true;
      setKoB(nextKoB);

      const nextActiveIdx = activeBIdx + 1;
      if (nextActiveIdx < 3) {
        setActiveBIdx(nextActiveIdx);
        // Reset split
        setPointsA(50);
        setPointsB(50);
        setCurrentSpeakerSide('B');
        
        nextTurnParams.current = { nextSide: 'B', pointsA: 50, pointsB: 50, history: updatedHistory };
        setTimeout(() => {
          const { nextSide, pointsA, pointsB, history } = nextTurnParams.current;
          executeGameTurnRef.current(nextSide, pointsA, pointsB, history);
        }, 1500);
      } else {
        // All team B KO
        setGameOverVerdict(`TEAM RED (Side A) wins the multiverse battle!`);
        setIsBattleActive(false);
      }
    }
  };

  // Tag Assist override (User-clicked intervention)
  const handleTagAssist = (side) => {
    if (!isBattleActive || loadingTurn || (countdown <= 0 && !readingBufferActive)) return;
    playCyberBeep(1350, 'sine', 0.15);
    setTagFlash(true);
    setTimeout(() => setTagFlash(false), 500);
    clearInterval(countdownTimer.current);

    if (side === 'A') {
      // Rotate active index forward
      const nextIdx = (activeAIdx + 1) % 3;
      if (!koA[nextIdx]) {
        setActiveAIdx(nextIdx);
        executeGameTurnRef.current('A', pointsA, pointsB, history, nextIdx, null);
      }
    } else {
      const nextIdx = (activeBIdx + 1) % 3;
      if (!koB[nextIdx]) {
        setActiveBIdx(nextIdx);
        executeGameTurnRef.current('B', pointsA, pointsB, history, null, nextIdx);
      }
    }
  };

  // Start 4-second reading buffer
  const startReadingBuffer = () => {
    setReadingBufferActive(true);
    setReadingBufferCountdown(4);
    setCountdown(0);
    clearInterval(countdownTimer.current);

    countdownTimer.current = setInterval(() => {
      setReadingBufferCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownTimer.current);
          setReadingBufferActive(false);
          startCountdownTickerRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Start 18-second emoji countdown timer
  const startCountdownTicker = () => {
    setCountdown(18);
    clearInterval(countdownTimer.current);

    countdownTimer.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownTimer.current);
          // Auto execute turn when timer ends
          const { nextSide, pointsA, pointsB, history } = nextTurnParams.current;
          executeGameTurnRef.current(nextSide, pointsA, pointsB, history);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Skip countdown function
  const handleSkipCountdown = () => {
    playCyberBeep(900, 'sine', 0.08);
    clearInterval(countdownTimer.current);
    setCountdown(0);
    setReadingBufferActive(false);
    const { nextSide, pointsA, pointsB, history } = nextTurnParams.current;
    executeGameTurnRef.current(nextSide, pointsA, pointsB, history);
  };

  // Cleanup timers
  useEffect(() => {
    return () => clearInterval(countdownTimer.current);
  }, []);

  // Emoji buttons reactions handler
  const handleReactionClick = (type, side) => {
    if (!isBattleActive || countdown <= 0) return;

    if (type === 'fire') {
      playCyberBeep(700, 'sine', 0.05);
      setUserReactionScore(prev => prev + 10);
      setFireEffect(side);
      setTimeout(() => setFireEffect(null), 600);
    } else if (type === 'sword') {
      playCyberBeep(950, 'sine', 0.06);
      setUserReactionScore(prev => prev + 15);
      setSlashEffect(side);
      setTimeout(() => setSlashEffect(null), 600);
    } else if (type === 'heart') {
      playCyberBeep(1100, 'sine', 0.08);
      setUserReactionScore(prev => prev + 5);
      setAffinityGained(prev => prev + 5);
      // Local affinity indicator popup effect
      setTimeout(() => setAffinityGained(0), 1000);
    }
  };

  // Select contender logic for setup screen
  const selectContenderSetup = (side, char) => {
    playCyberBeep(650, 'sine', 0.05);
    if (is3v3) {
      if (side === 'A') {
        setTeamA(prev => {
          const next = [...prev];
          const existingIdx = next.findIndex(c => c && c._id === char._id);
          if (existingIdx !== -1) {
            // Swap characters in slots to avoid duplicates
            next[existingIdx] = next[selectedSlotA];
          }
          next[selectedSlotA] = char;
          return next;
        });
      } else {
        setTeamB(prev => {
          const next = [...prev];
          const existingIdx = next.findIndex(c => c && c._id === char._id);
          if (existingIdx !== -1) {
            next[existingIdx] = next[selectedSlotB];
          }
          next[selectedSlotB] = char;
          return next;
        });
      }
    } else {
      if (side === 'A') {
        if (contenderB && contenderB._id === char._id) {
          setContenderB(contenderA);
        }
        setContenderA(char);
      } else {
        if (contenderA && contenderA._id === char._id) {
          setContenderA(contenderB);
        }
        setContenderB(char);
      }
    }
  };

  // Extract active character profiles
  const activeCharA = is3v3 ? teamA[activeAIdx] : contenderA;
  const activeCharB = is3v3 ? teamB[activeBIdx] : contenderB;

  return (
    <div style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1.5rem', position: 'relative' }}>
      
      {/* Back button */}
      <button 
        onClick={() => { playCyberBeep(600, 'sine', 0.08); navigate('/arena'); }}
        className="glass-panel mono-hud"
        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', border: '1px solid var(--glass-border)', color: '#fff', cursor: 'pointer', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '2rem', position: 'relative', zIndex: 10 }}
      >
        <ArrowLeft size={14} />
        BACK TO GATEWAYS
      </button>

      {tagFlash && (
        <div 
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            border: '8px solid var(--neon-cyan)',
            boxShadow: 'inset 0 0 40px rgba(0, 240, 255, 0.4)',
            pointerEvents: 'none',
            zIndex: 9999,
            animation: 'flash-fade 0.5s ease-out forwards'
          }}
        />
      )}

      {/* STAGE SELECT SETUP STATE */}
      {!isBattleActive && !gameOverVerdict && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          <div style={{ textAlign: 'center' }}>
            <span className="mono-hud" style={{ color: 'var(--neon-red)', fontSize: '0.8rem', letterSpacing: '3px' }}>
              [ COGNITIVE STAGING CONFIG ]
            </span>
            <h2 style={{ fontSize: '2.2rem', marginTop: '0.4rem', fontWeight: '950', textTransform: 'uppercase' }}>
              {is3v3 ? '3v3 Multiverse Rumble Setup' : '1v1 Quick Duel Portal Setup'}
            </h2>
            <p className="mono-hud" style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.4rem' }}>
              Define the battle topic parameters and select character interfaces.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', backgroundColor: 'rgba(10, 11, 20, 0.7)' }}>
            <label className="mono-hud" style={{ fontSize: '0.75rem', color: 'var(--neon-purple)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Combat Roast Topic Argument:
            </label>
            <input 
              type="text" 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              style={{ width: '100%', padding: '0.8rem', backgroundColor: 'rgba(0,0,0,0.6)', border: '1px solid var(--glass-border)', borderRadius: '4px', color: '#fff', outline: 'none', fontFamily: 'var(--font-mono)' }}
            />

            <button
              onClick={handleStartBattle}
              style={{
                alignSelf: 'center',
                padding: '0.85rem 3rem',
                background: 'linear-gradient(135deg, var(--neon-red) 0%, #000 100%)',
                border: '1px solid var(--neon-red)',
                borderRadius: '4px',
                color: '#fff',
                fontWeight: '900',
                letterSpacing: '2px',
                cursor: 'pointer',
                boxShadow: 'var(--glow-red)',
                marginTop: '1rem',
                textTransform: 'uppercase'
              }}
            >
              INITIALIZE PORTAL CLASH
            </button>
          </div>

          {/* Quick Slot Preview Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', borderLeft: '3px solid var(--neon-red)' }}>
              <h4 className="mono-hud" style={{ fontSize: '0.9rem', color: 'var(--neon-red)', marginBottom: '1rem' }}>SIDE A TEAM PREVIEW</h4>
              {is3v3 ? (
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  {teamA.map((char, idx) => (
                    <img 
                      key={idx} 
                      src={char?.avatarUrl} 
                      alt="" 
                      title={`Click to select Team A slot ${idx + 1}`}
                      onClick={() => { playCyberBeep(600, 'sine', 0.05); setSelectedSlotA(idx); }}
                      style={{ 
                        width: '50px', 
                        height: '50px', 
                        borderRadius: '50%', 
                        border: selectedSlotA === idx ? '3px solid var(--neon-red)' : '2px solid rgba(255,255,255,0.15)', 
                        objectFit: 'cover',
                        cursor: 'pointer',
                        transform: selectedSlotA === idx ? 'scale(1.15)' : 'none',
                        transition: 'all 0.2s ease',
                        boxShadow: selectedSlotA === idx ? '0 0 12px var(--neon-red)' : 'none'
                      }} 
                    />
                  ))}
                </div>
              ) : (
                contenderA && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <img src={contenderA.avatarUrl} alt="" style={{ width: '70px', height: '70px', borderRadius: '50%', border: '2px solid var(--neon-red)', objectFit: 'cover' }} />
                    <strong style={{ color: '#fff' }}>{contenderA.name}</strong>
                  </div>
                )
              )}
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center', borderRight: '3px solid var(--neon-cyan)' }}>
              <h4 className="mono-hud" style={{ fontSize: '0.9rem', color: 'var(--neon-cyan)', marginBottom: '1rem' }}>SIDE B TEAM PREVIEW</h4>
              {is3v3 ? (
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  {teamB.map((char, idx) => (
                    <img 
                      key={idx} 
                      src={char?.avatarUrl} 
                      alt="" 
                      title={`Click to select Team B slot ${idx + 1}`}
                      onClick={() => { playCyberBeep(600, 'sine', 0.05); setSelectedSlotB(idx); }}
                      style={{ 
                        width: '50px', 
                        height: '50px', 
                        borderRadius: '50%', 
                        border: selectedSlotB === idx ? '3px solid var(--neon-cyan)' : '2px solid rgba(255,255,255,0.15)', 
                        objectFit: 'cover',
                        cursor: 'pointer',
                        transform: selectedSlotB === idx ? 'scale(1.15)' : 'none',
                        transition: 'all 0.2s ease',
                        boxShadow: selectedSlotB === idx ? '0 0 12px var(--neon-cyan)' : 'none'
                      }} 
                    />
                  ))}
                </div>
              ) : (
                contenderB && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <img src={contenderB.avatarUrl} alt="" style={{ width: '70px', height: '70px', borderRadius: '50%', border: '2px solid var(--neon-cyan)', objectFit: 'cover' }} />
                    <strong style={{ color: '#fff' }}>{contenderB.name}</strong>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Setup grids */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 className="mono-hud" style={{ fontSize: '0.8rem', color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.4rem' }}>
              {is3v3 
                ? `TAP TO ASSIGN SELECTED SLOTS (TEAM_A SLOT_${selectedSlotA + 1}, TEAM_B SLOT_${selectedSlotB + 1})`
                : "TAP TO SWAP CONTENDERS"
              }
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {characters.map(char => (
                <button
                  key={char._id}
                  onClick={() => playCyberBeep(700, 'sine', 0.05)}
                  className="glass-panel"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', borderRadius: '4px', textAlign: 'left' }}
                >
                  <img src={char.avatarUrl} alt="" style={{ width: '35px', height: '35px', borderRadius: '50%', objectFit: 'cover' }} />
                  <div>
                    <div style={{ fontSize: '0.8rem', color: '#fff', fontWeight: 'bold' }}>{char.name}</div>
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem' }}>
                      <span onClick={(e) => { e.stopPropagation(); selectContenderSetup('A', char); }} style={{ fontSize: '0.65rem', color: 'var(--neon-red)', fontWeight: 'bold' }}>SLOT_A</span>
                      <span onClick={(e) => { e.stopPropagation(); selectContenderSetup('B', char); }} style={{ fontSize: '0.65rem', color: 'var(--neon-cyan)', fontWeight: 'bold' }}>SLOT_B</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER STATE VIEW */}
      {gameOverVerdict && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 1rem', gap: '2rem' }}>
          <div 
            className="glass-panel" 
            style={{ 
              padding: '3rem', 
              textAlign: 'center', 
              border: '2px solid var(--neon-purple)', 
              boxShadow: 'var(--glow-purple)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.5rem',
              maxWidth: '500px',
              width: '100%',
              backgroundColor: 'rgba(10,11,20,0.8)'
            }}
          >
            <Trophy size={48} style={{ color: 'var(--neon-purple)' }} />
            <h2 className="mono-hud" style={{ fontSize: '1.8rem', color: '#fff', fontWeight: '950', textTransform: 'uppercase' }}>
              MATCH CONCLUDED
            </h2>
            <p className="mono-hud" style={{ fontSize: '1rem', color: 'var(--neon-cyan)', fontWeight: 'bold' }}>
              {gameOverVerdict}
            </p>
            <button
              onClick={() => { setGameOverVerdict(null); setIsBattleActive(false); }}
              style={{ padding: '0.8rem 2.5rem', backgroundColor: 'transparent', border: '1px solid var(--neon-purple)', color: '#fff', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' }}
            >
              RETURN TO STAGING
            </button>
          </div>
        </div>
      )}

      {/* ACTIVE COMBAT HUD SCREEN */}
      {isBattleActive && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Title topic readout */}
          <div style={{ textAlign: 'center' }}>
            <span className="mono-hud" style={{ color: 'var(--neon-purple)', fontSize: '0.75rem', letterSpacing: '1px' }}>
              TOPIC MATRIX: "{topic.toUpperCase()}"
            </span>
          </div>

          {/* Splits health bar weight tracker */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }} className="mono-hud">
              <span style={{ color: 'var(--neon-red)', fontWeight: 'bold' }}>SIDE A WEIGHT: {pointsA}%</span>
              <span style={{ color: 'var(--neon-cyan)', fontWeight: 'bold' }}>SIDE B WEIGHT: {pointsB}%</span>
            </div>
            
            {/* Split horizontal healthbar */}
            <div style={{ width: '100%', height: '14px', borderRadius: '4px', overflow: 'hidden', display: 'flex', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
              <div style={{ width: `${pointsA}%`, height: '100%', backgroundColor: 'var(--neon-red)', transition: 'all 0.5s ease', boxShadow: '0 0 10px var(--neon-red)' }} />
              <div style={{ width: `${pointsB}%`, height: '100%', backgroundColor: 'var(--neon-cyan)', transition: 'all 0.5s ease', boxShadow: '0 0 10px var(--neon-cyan)' }} />
            </div>
          </div>

          {/* STAGE ARENA: SIDE BY SIDE CARD CLASH */}
          <div style={{ display: 'grid', gridTemplateColumns: is3v3 ? '160px 1fr 1fr 160px' : '1fr 1fr', gap: '2rem', alignItems: 'center' }}>
            
            {/* 3v3 Side A list slots */}
            {is3v3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <span className="mono-hud" style={{ fontSize: '0.65rem', color: 'var(--neon-red)', textAlign: 'center' }}>SIDE A BENCH</span>
                {teamA.map((char, idx) => {
                  const isActive = activeAIdx === idx;
                  const isDead = koA[idx];
                  return (
                    <div 
                      key={idx} 
                      onClick={() => handleTagAssist('A')}
                      style={{ 
                        opacity: isActive ? 1.0 : 0.4, 
                        border: isActive ? '2px solid var(--neon-red)' : '1px solid var(--glass-border)',
                        padding: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: isActive ? 'default' : (isDead ? 'not-allowed' : 'pointer'),
                        borderRadius: '4px',
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        position: 'relative'
                      }}
                    >
                      <img src={char.avatarUrl} alt="" style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} />
                      <span style={{ fontSize: '0.75rem', color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{char.name}</span>
                      {isDead && (
                        <span className="mono-hud" style={{ position: 'absolute', right: '5px', fontSize: '0.6rem', color: 'var(--neon-red)', fontWeight: 'bold' }}>KO</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Side A Active combat card */}
            {activeCharA && (
              <div 
                className="glass-panel" 
                style={{ 
                  padding: '2rem', 
                  textAlign: 'center', 
                  border: `2px solid ${activeCharA.themeColor}`, 
                  backgroundColor: 'rgba(10, 11, 20, 0.75)',
                  boxShadow: `0 0 25px ${activeCharA.themeColor}33`,
                  position: 'relative',
                  overflow: 'hidden',
                  animation: fireEffect === 'A' ? 'shake 0.3s infinite' : 'none'
                }}
              >
                {slashEffect === 'A' && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.85)', zIndex: 99, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'flash-fade 0.5s forwards' }}>
                    <span className="mono-hud" style={{ fontSize: '2rem', color: '#000', fontWeight: '950', letterSpacing: '4px' }}>⚔️ SLASH!</span>
                  </div>
                )}
                {fireEffect === 'A' && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle, rgba(255,42,95,0.4) 0%, transparent 80%)', zIndex: 99, pointerEvents: 'none' }} />
                )}

                <img src={activeCharA.avatarUrl} alt="" style={{ width: '100px', height: '100px', borderRadius: '12px', border: `2px solid ${activeCharA.themeColor}`, objectFit: 'cover', boxShadow: `0 0 15px ${activeCharA.themeColor}`, marginBottom: '1rem' }} />
                <h3 className="mono-hud" style={{ fontSize: '1.2rem', color: '#fff', fontWeight: 'bold' }}>{activeCharA.name}</h3>
                <span className="mono-hud" style={{ fontSize: '0.7rem', color: activeCharA.themeColor }}>{activeCharA.animeSource.toUpperCase()}</span>

                {is3v3 && (
                  <button 
                    onClick={() => handleTagAssist('A')}
                    style={{ marginTop: '1rem', width: '100%', padding: '0.4rem', border: '1px dashed var(--neon-cyan)', color: 'var(--neon-cyan)', background: 'transparent', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                  >
                    COSMIC TAG ASSIST
                  </button>
                )}
              </div>
            )}

            {/* Side B Active combat card */}
            {activeCharB && (
              <div 
                className="glass-panel" 
                style={{ 
                  padding: '2rem', 
                  textAlign: 'center', 
                  border: `2px solid ${activeCharB.themeColor}`, 
                  backgroundColor: 'rgba(10, 11, 20, 0.75)',
                  boxShadow: `0 0 25px ${activeCharB.themeColor}33`,
                  position: 'relative',
                  overflow: 'hidden',
                  animation: fireEffect === 'B' ? 'shake 0.3s infinite' : 'none'
                }}
              >
                {slashEffect === 'B' && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.85)', zIndex: 99, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'flash-fade 0.5s forwards' }}>
                    <span className="mono-hud" style={{ fontSize: '2rem', color: '#000', fontWeight: '950', letterSpacing: '4px' }}>⚔️ SLASH!</span>
                  </div>
                )}
                {fireEffect === 'B' && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'radial-gradient(circle, rgba(0,240,255,0.4) 0%, transparent 80%)', zIndex: 99, pointerEvents: 'none' }} />
                )}

                <img src={activeCharB.avatarUrl} alt="" style={{ width: '100px', height: '100px', borderRadius: '12px', border: `2px solid ${activeCharB.themeColor}`, objectFit: 'cover', boxShadow: `0 0 15px ${activeCharB.themeColor}`, marginBottom: '1rem' }} />
                <h3 className="mono-hud" style={{ fontSize: '1.2rem', color: '#fff', fontWeight: 'bold' }}>{activeCharB.name}</h3>
                <span className="mono-hud" style={{ fontSize: '0.7rem', color: activeCharB.themeColor }}>{activeCharB.animeSource.toUpperCase()}</span>

                {is3v3 && (
                  <button 
                    onClick={() => handleTagAssist('B')}
                    style={{ marginTop: '1rem', width: '100%', padding: '0.4rem', border: '1px dashed var(--neon-cyan)', color: 'var(--neon-cyan)', background: 'transparent', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                  >
                    COSMIC TAG ASSIST
                  </button>
                )}
              </div>
            )}

            {/* 3v3 Side B list slots */}
            {is3v3 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <span className="mono-hud" style={{ fontSize: '0.65rem', color: 'var(--neon-cyan)', textAlign: 'center' }}>SIDE B BENCH</span>
                {teamB.map((char, idx) => {
                  const isActive = activeBIdx === idx;
                  const isDead = koB[idx];
                  return (
                    <div 
                      key={idx} 
                      onClick={() => handleTagAssist('B')}
                      style={{ 
                        opacity: isActive ? 1.0 : 0.4, 
                        border: isActive ? '2px solid var(--neon-cyan)' : '1px solid var(--glass-border)',
                        padding: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: isActive ? 'default' : (isDead ? 'not-allowed' : 'pointer'),
                        borderRadius: '4px',
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        position: 'relative'
                      }}
                    >
                      <img src={char.avatarUrl} alt="" style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} />
                      <span style={{ fontSize: '0.75rem', color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{char.name}</span>
                      {isDead && (
                        <span className="mono-hud" style={{ position: 'absolute', right: '5px', fontSize: '0.6rem', color: 'var(--neon-cyan)', fontWeight: 'bold' }}>KO</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          </div>

          {/* ACTIVE DIALOGUE DISPLAY STAGE */}
          <div className="glass-panel" style={{ padding: '1.5rem 2rem', backgroundColor: 'rgba(5,7,12,0.9)', minHeight: '150px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="mono-hud" style={{ fontSize: '0.7rem', color: 'var(--neon-purple)', marginBottom: '0.5rem', borderBottom: '1px solid rgba(161, 35, 255, 0.15)', paddingBottom: '3px' }}>
              &gt;_ DIALOGUE TRANSMISSION REEL
            </div>
            
            {loadingTurn ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--neon-purple)', padding: '1rem 0' }}>
                <div style={{ width: '15px', height: '15px', border: '2px solid rgba(255,255,255,0.05)', borderTopColor: 'var(--neon-purple)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span className="mono-hud" style={{ fontSize: '0.8rem' }}>AI AGENT SYNAPSE GENERATING ATTACK STRING...</span>
              </div>
            ) : (
              history.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <strong style={{ color: history[history.length - 1].side === 'A' ? 'var(--neon-red)' : 'var(--neon-cyan)', fontSize: '0.85rem' }} className="mono-hud">
                    [{history[history.length - 1].speaker.toUpperCase()}]
                  </strong>
                  <p style={{ color: '#fff', fontSize: '1rem', fontStyle: 'italic', lineHeight: '1.5' }}>
                    "{history[history.length - 1].text}"
                  </p>
                </div>
              )
            )}
          </div>

          {/* READING BUFFER PANEL */}
          {isBattleActive && !loadingTurn && readingBufferActive && (
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', border: '1px solid rgba(161, 35, 255, 0.25)', backgroundColor: 'rgba(161, 35, 255, 0.03)' }}>
              <div className="mono-hud" style={{ fontSize: '0.8rem', color: 'var(--neon-purple)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span className="pulse-purple" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--neon-purple)', animation: 'pulse-purple 1s infinite alternate' }} />
                READING INCOMING TRANSMISSION... SECURING INCOMING DIALOGUE ({readingBufferCountdown}s)
              </div>
              <div className="mono-hud" style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
                Emoji reaction matrix charging. Please read the response.
              </div>
            </div>
          )}

          {/* INTERACTIVE EMOJI FEEDBACK PANEL */}
          {isBattleActive && !loadingTurn && countdown > 0 && (
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', border: '1px solid rgba(0,255,102,0.2)', backgroundColor: 'rgba(0, 255, 102, 0.02)' }}>
              
              <div className="mono-hud" style={{ fontSize: '0.8rem', color: '#00ff66', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span className="pulse-cyan" style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#00ff66' }} />
                USER REACTION WINDOW OPEN! TIME REMAINING: {countdown}s
              </div>

              {/* Reaction indicators */}
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span className="mono-hud" style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                  ACCUMULATED POWER RATINGS: <strong style={{ color: '#00ff66' }}>+{userReactionScore}</strong>
                </span>
                {affinityGained > 0 && (
                  <span className="mono-hud" style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', animation: 'pulse-cyan 0.5s infinite' }}>
                    Affinity Gained!
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '2rem' }}>
                <button
                  onClick={() => handleReactionClick('fire', currentSpeakerSide)}
                  className="cyber-glitch-hover"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.5rem', border: '1px solid #ff2a5f', background: 'rgba(255,42,95,0.1)', color: '#fff', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}
                >
                  <Flame size={16} style={{ color: '#ff2a5f' }} />
                  🔥 FIRE (+10)
                </button>
                <button
                  onClick={() => handleReactionClick('sword', currentSpeakerSide)}
                  className="cyber-glitch-hover"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.5rem', border: '1px solid #ffb700', background: 'rgba(255,183,0,0.1)', color: '#fff', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}
                >
                  <Sword size={16} style={{ color: '#ffb700' }} />
                  ⚔️ SLAM (+15)
                </button>
                <button
                  onClick={() => handleReactionClick('heart', currentSpeakerSide)}
                  className="cyber-glitch-hover"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.5rem', border: '1px solid #00f0ff', background: 'rgba(0,240,255,0.1)', color: '#fff', cursor: 'pointer', borderRadius: '4px', fontWeight: 'bold' }}
                >
                  <Heart size={16} style={{ color: '#00f0ff' }} />
                  ❤️ HEAL (+5)
                </button>
              </div>

              {/* Manual Skip/Next Round Button */}
              <button
                onClick={handleSkipCountdown}
                className="mono-hud cyber-glitch-hover"
                style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem 1.5rem',
                  border: '1px solid rgba(255,255,255,0.15)',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  color: 'rgba(255,255,255,0.6)',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  letterSpacing: '1.5px',
                  fontWeight: 'bold'
                }}
                onMouseEnter={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.4)'; e.target.style.color = '#fff'; }}
                onMouseLeave={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.15)'; e.target.style.color = 'rgba(255,255,255,0.6)'; }}
              >
                [ REBUTTAL READY / SKIP COUNTDOWN ]
              </button>

            </div>
          )}

          {/* Diagnostics console history feed scroll */}
          <div className="glass-panel" style={{ padding: '1rem 1.5rem', borderLeft: '3px solid var(--neon-cyan)', maxHeight: '200px', overflowY: 'auto' }}>
            <span className="mono-hud" style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', display: 'block', marginBottom: '0.5rem' }}>BATTLE HISTORY REEL</span>
            <div className="mono-hud" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>
              {history.map((t, idx) => (
                <div key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '0.2rem' }}>
                  <span style={{ color: t.side === 'A' ? 'var(--neon-red)' : 'var(--neon-cyan)' }}>[{t.speaker}]</span>: {t.text}
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      <style>{`
        @keyframes shake {
          0% { transform: translate(1px, 1px) rotate(0deg); }
          10% { transform: translate(-1px, -2px) rotate(-1deg); }
          20% { transform: translate(-3px, 0px) rotate(1deg); }
          30% { transform: translate(0px, 2px) rotate(0deg); }
          40% { transform: translate(1px, -1px) rotate(1deg); }
          50% { transform: translate(-1px, 2px) rotate(-1deg); }
          60% { transform: translate(-3px, 1px) rotate(0deg); }
          70% { transform: translate(2px, 1px) rotate(-1deg); }
          80% { transform: translate(-1px, -1px) rotate(1deg); }
          90% { transform: translate(2px, 2px) rotate(0deg); }
          100% { transform: translate(1px, -2px) rotate(-1deg); }
        }
        @keyframes pulse-purple {
          0% { box-shadow: 0 0 5px rgba(161, 35, 255, 0.4); opacity: 0.7; }
          100% { box-shadow: 0 0 15px rgba(161, 35, 255, 0.9); opacity: 1; }
        }
      `}</style>

    </div>
  );
}
