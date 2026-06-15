import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Users, Zap, Shield, Flame, Activity, ShieldAlert, ArrowLeft, LogIn } from 'lucide-react';

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


const API_URL = import.meta.env.VITE_API_URL || 'https://backend-drab-seven-84.vercel.app';

export default function Multiplayer() {
  const navigate = useNavigate();
  
  // Authentication states
  const [token] = useState(localStorage.getItem('token'));
  const [currentUser] = useState(JSON.parse(localStorage.getItem('user')));

  // Socket and matchmaking states
  const [playersList, setPlayersList] = useState([]);
  const [matchState, setMatchState] = useState(null); // private game room payload
  const [lobbyStatus, setLobbyStatus] = useState('idle'); // 'idle' | 'challenging' | 'incoming' | 'combat'
  
  // Modals overlays
  const [challengeTarget, setChallengeTarget] = useState(null); // who we are challenging
  const [incomingChallenger, setIncomingChallenger] = useState(null); // who challenged us

  // Combat details logs
  const [actionLog, setActionLog] = useState('Secure connection synced. Standing by...');
  const [winnerVerdict, setWinnerVerdict] = useState(null);

  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    // Connect to backend sockets
    socketRef.current = io(API_URL);

    // Register player in lobby pool
    socketRef.current.emit('register_player', {
      username: currentUser?.username || 'Guest_' + Math.random().toString(36).substring(2, 6),
      userId: currentUser?.id || 'GUEST'
    });

    // Listen to players lobby updates
    socketRef.current.on('lobby_update', (idlePlayers) => {
      // Exclude ourselves
      const others = idlePlayers.filter(p => p.socketId !== socketRef.current?.id);
      setPlayersList(others);
    });

    // Listen to incoming challenges
    socketRef.current.on('incoming_challenge', (data) => {
      playCyberBeep(650, 'sawtooth', 0.25);
      setIncomingChallenger(data);
      setLobbyStatus('incoming');
    });

    // Listen to challenge declines
    socketRef.current.on('challenge_declined', (data) => {
      playCyberBeep(350, 'sine', 0.15);
      setChallengeTarget(null);
      setLobbyStatus('idle');
      alert(`${data.username} declined your challenge request.`);
    });

    // Listen to match start
    socketRef.current.on('match_start', (roomContext) => {
      playCyberBeep(1200, 'sawtooth', 0.3);
      setMatchState(roomContext);
      setLobbyStatus('combat');
      setWinnerVerdict(null);
      setChallengeTarget(null);
      setIncomingChallenger(null);
      setActionLog('Combat stage initialized. Turn: ' + (roomContext.turn === socketRef.current?.id ? 'YOURS' : 'OPPONENT'));
    });

    // Listen to combat updates
    socketRef.current.on('game_state_update', (updatedContext) => {
      setMatchState(updatedContext);
      if (updatedContext.lastMoveLog) {
        setActionLog(updatedContext.lastMoveLog);
      }
      playCyberBeep(900, 'sine', 0.08);

      if (updatedContext.winner) {
        const isMeWinner = updatedContext.winner === socketRef.current?.id;
        playCyberBeep(isMeWinner ? 1400 : 300, 'sine', 0.35);
        setWinnerVerdict(isMeWinner ? 'VICTORY SECURED!' : 'DEFEAT CONCLUDED');
        setTimeout(() => {
          setLobbyStatus('idle');
          setMatchState(null);
          setWinnerVerdict(null);
        }, 5000);
      }
    });

    // Listen to opponent disconnection alerts
    socketRef.current.on('opponent_disconnected', (data) => {
      playCyberBeep(300, 'sawtooth', 0.3);
      setActionLog(data.message);
      setWinnerVerdict('VICTORY BY DISCONNECT!');
      setTimeout(() => {
        setLobbyStatus('idle');
        setMatchState(null);
        setWinnerVerdict(null);
      }, 4000);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token, currentUser]);

  const handleInitiateChallenge = (target) => {
    if (!socketRef.current) return;
    playCyberBeep(850, 'sine', 0.06);
    setChallengeTarget(target);
    setLobbyStatus('challenging');
    socketRef.current.emit('send_challenge', target.socketId);
  };

  const handleAcceptChallenge = () => {
    if (!socketRef.current || !incomingChallenger) return;
    playCyberBeep(1100, 'sawtooth', 0.15);
    socketRef.current.emit('accept_challenge', incomingChallenger.fromSocketId);
  };

  const handleDeclineChallenge = () => {
    if (!socketRef.current || !incomingChallenger) return;
    playCyberBeep(450, 'sine', 0.08);
    socketRef.current.emit('decline_challenge', incomingChallenger.fromSocketId);
    setIncomingChallenger(null);
    setLobbyStatus('idle');
  };

  const handleExecuteMove = (moveType) => {
    if (!socketRef.current || !matchState) return;
    // Check if it's our turn
    const isMyTurn = matchState.turn === socketRef.current.id;
    if (!isMyTurn || winnerVerdict) return;

    playCyberBeep(1000, 'sine', 0.05);
    socketRef.current.emit('execute_move', {
      roomId: matchState.roomId,
      moveType
    });
  };

  if (!token) {
    return (
      <div style={{ display: 'flex', minHeight: '80vh', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '2.5rem', border: '1px solid rgba(161, 35, 255, 0.25)', textAlign: 'center', boxShadow: 'var(--glow-purple)' }}>
          <LogIn size={40} style={{ color: 'var(--neon-purple)', marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.8rem', color: '#fff' }}>AUTHENTICATION REQUIRED</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
            Please authenticate at the central portal to connect to the P2P multiplayer server.
          </p>
          <button
            onClick={() => navigate('/login')}
            style={{ padding: '0.8rem 2rem', background: 'linear-gradient(135deg, var(--neon-purple) 0%, #000 100%)', border: '1px solid var(--neon-purple)', color: '#fff', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', letterSpacing: '1px' }}
          >
            GO TO LOGIN
          </button>
        </div>
      </div>
    );
  }

  const isMyTurn = matchState && matchState.turn === socketRef.current?.id;
  const isP1 = matchState && socketRef.current && matchState.p1 === socketRef.current.id;
  const myHp = matchState ? (isP1 ? matchState.hp1 : matchState.hp2) : 100;
  const oppHp = matchState ? (isP1 ? matchState.hp2 : matchState.hp1) : 100;
  const myName = matchState ? (isP1 ? matchState.username1 : matchState.username2) : '';
  const oppName = matchState ? (isP1 ? matchState.username2 : matchState.username1) : '';
  
  // Ultimate cooldown check
  const ultimateCooldownActive = matchState 
    ? (isP1 ? matchState.cooldown1 > 0 : matchState.cooldown2 > 0)
    : false;
  const ultimateCooldownTurns = matchState
    ? (isP1 ? matchState.cooldown1 : matchState.cooldown2)
    : 0;

  return (
    <div style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1.5rem', position: 'relative' }}>
      
      {/* Header back navigation */}
      {lobbyStatus !== 'combat' && (
        <button 
          onClick={() => { playCyberBeep(600, 'sine', 0.08); navigate('/arena'); }}
          className="glass-panel mono-hud"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', border: '1px solid var(--glass-border)', color: '#fff', cursor: 'pointer', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '2rem' }}
        >
          <ArrowLeft size={14} />
          BACK TO GATEWAYS
        </button>
      )}

      {/* VIEW A: THE COMBAT RADAR LOBBY */}
      {lobbyStatus !== 'combat' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '2.5rem' }}>
          
          {/* Main matchmaking board */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem' }}>
              <span className="mono-hud" style={{ color: 'var(--neon-cyan)', fontSize: '0.8rem', letterSpacing: '2px' }}>
                [ ACTIVE ONLINE COMBATANTS ]
              </span>
              <h2 style={{ fontSize: '2.2rem', marginTop: '0.4rem', fontWeight: '950', textTransform: 'uppercase' }}>
                Tactical Matchmaker Lobby
              </h2>
            </div>

            {playersList.length === 0 ? (
              <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <Activity size={32} style={{ margin: '0 auto 1rem auto', opacity: 0.2, animation: 'spin 4s linear infinite' }} />
                <p className="mono-hud" style={{ fontSize: '0.85rem' }}>
                  SEARCHING FOR HOSTILE SIGNALS... NO UNENGAGED CONTENDERS IN RANGE.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {playersList.map((player) => (
                  <div 
                    key={player.socketId}
                    className="glass-panel"
                    style={{ padding: '1.2rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(10,11,20,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#00ff66', boxShadow: '0 0 8px #00ff66' }} />
                      <span className="mono-hud" style={{ fontSize: '1rem', color: '#fff', fontWeight: 'bold' }}>{player.username}</span>
                    </div>

                    <button
                      onClick={() => handleInitiateChallenge(player)}
                      disabled={lobbyStatus !== 'idle'}
                      style={{
                        padding: '0.5rem 1.5rem',
                        backgroundColor: 'rgba(255, 42, 95, 0.1)',
                        border: '1px solid var(--neon-red)',
                        color: 'var(--neon-red)',
                        borderRadius: '4px',
                        cursor: lobbyStatus === 'idle' ? 'pointer' : 'not-allowed',
                        fontWeight: 'bold',
                        fontSize: '0.8rem',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 0 10px rgba(255, 42, 95, 0.15)'
                      }}
                    >
                      INITIATE CHALLENGE
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right quick stats panel */}
          <aside className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'rgba(5,7,12,0.9)', height: 'fit-content' }}>
            <span className="mono-hud" style={{ fontSize: '0.75rem', color: 'var(--neon-purple)', fontWeight: 'bold' }}>
              RESONANCE CONFIG
            </span>
            <div className="mono-hud" style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div>USER: <span style={{ color: '#fff' }}>{currentUser?.username || 'GUEST'}</span></div>
              <div>SOCKET ID: <span style={{ color: 'var(--neon-cyan)' }}>{socketRef.current?.id?.substring(0, 8) || 'SYNCING'}</span></div>
              <div>LOBBY STATUS: <span style={{ color: '#00ff66' }}>ONLINE</span></div>
            </div>
          </aside>

        </div>
      )}

      {/* MODAL OVERLAYS */}
      
      {/* 1. Outgoing Challenge Modal */}
      {lobbyStatus === 'challenging' && challengeTarget && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ padding: '3rem', maxWidth: '480px', width: '100%', textAlign: 'center', border: '1px solid var(--neon-red)', boxShadow: 'var(--glow-red)', backgroundColor: 'rgba(5,7,12,0.95)' }}>
            <Activity size={36} className="terminal-amber-text" style={{ margin: '0 auto 1.5rem auto', animation: 'spin 2s linear infinite' }} />
            <h3 className="mono-hud" style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '0.8rem', letterSpacing: '1px' }}>
              TRANSMITTING CHALLENGE MATRIX...
            </h3>
            <p className="mono-hud" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              Encrypting connection package for user: <strong style={{ color: 'var(--neon-red)' }}>{challengeTarget.username}</strong>. Waiting for target response...
            </p>
            <button
              onClick={() => { playCyberBeep(300, 'sine', 0.08); setLobbyStatus('idle'); setChallengeTarget(null); }}
              style={{ padding: '0.6rem 2rem', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', borderRadius: '4px' }}
            >
              Abort Signal
            </button>
          </div>
        </div>
      )}

      {/* 2. Incoming Challenge Modal */}
      {lobbyStatus === 'incoming' && incomingChallenger && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel" style={{ padding: '3rem', maxWidth: '480px', width: '100%', textAlign: 'center', border: '1px solid var(--neon-purple)', boxShadow: 'var(--glow-purple)', backgroundColor: 'rgba(5,7,12,0.95)' }}>
            <ShieldAlert size={36} style={{ color: 'var(--neon-purple)', margin: '0 auto 1.5rem auto', animation: 'pulse-purple 1s infinite alternate' }} />
            <h3 className="mono-hud" style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '0.8rem', letterSpacing: '1px' }}>
              INCOMING CLASH DETECTED!
            </h3>
            <p className="mono-hud" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '2.2rem' }}>
              Contender <strong style={{ color: 'var(--neon-cyan)' }}>{incomingChallenger.username}</strong> has initiated a challenge matrix with your node.
            </p>
            
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={handleAcceptChallenge}
                style={{ padding: '0.75rem 2rem', backgroundColor: 'var(--neon-purple)', border: '1px solid var(--neon-purple)', color: '#fff', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px', boxShadow: 'var(--glow-purple)' }}
              >
                ACCEPT CLASH
              </button>
              <button
                onClick={handleDeclineChallenge}
                style={{ padding: '0.75rem 2rem', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', borderRadius: '4px' }}
              >
                RETREAT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW B: THE STRATEGY CARD MATCHSTAGE */}
      {lobbyStatus === 'combat' && matchState && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          
          {/* Winner Concluded Overlay Banner */}
          {winnerVerdict && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', border: '2px solid var(--neon-cyan)', boxShadow: 'var(--glow-cyan)', backgroundColor: '#05060b' }}>
                <h1 className="mono-hud" style={{ fontSize: '2.5rem', color: '#fff', fontWeight: '950', marginBottom: '1rem' }}>
                  {winnerVerdict}
                </h1>
                <p className="mono-hud" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Returning back to target matchmaking lobby core...
                </p>
              </div>
            </div>
          )}

          {/* Side by Side Combatants status readouts */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
            
            {/* Player 1 (Left - Client) */}
            <div className="glass-panel" style={{ padding: '2rem', borderLeft: '4px solid var(--neon-red)', backgroundColor: isMyTurn ? 'rgba(255, 42, 95, 0.02)' : 'rgba(10,11,20,0.6)' }}>
              <span className="mono-hud" style={{ fontSize: '0.75rem', color: 'var(--neon-red)' }}>[ CLIENT COMPONENT ]</span>
              <h3 className="mono-hud" style={{ fontSize: '1.5rem', color: '#fff', marginTop: '0.2rem', fontWeight: 'bold' }}>{myName}</h3>
              
              {/* HP Bar */}
              <div style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }} className="mono-hud">
                  <span>HP Tracker:</span>
                  <span style={{ color: 'var(--neon-red)', fontWeight: 'bold' }}>{myHp} / 100</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', marginTop: '0.3rem' }}>
                  <div style={{ width: `${myHp}%`, height: '100%', backgroundColor: 'var(--neon-red)', transition: 'all 0.3s ease' }} />
                </div>
              </div>

              {/* Action flags */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }} className="mono-hud">
                {matchState.shield1 && isP1 && <span style={{ fontSize: '0.65rem', border: '1px solid var(--neon-cyan)', color: 'var(--neon-cyan)', padding: '2px 6px' }}>🛡️ SHIELD ACTIVE</span>}
                {matchState.shield2 && !isP1 && <span style={{ fontSize: '0.65rem', border: '1px solid var(--neon-cyan)', color: 'var(--neon-cyan)', padding: '2px 6px' }}>🛡️ SHIELD ACTIVE</span>}
                {ultimateCooldownActive && <span style={{ fontSize: '0.65rem', border: '1px solid var(--neon-red)', color: 'var(--neon-red)', padding: '2px 6px' }}>🌀 ULT COOLDOWN ({ultimateCooldownTurns})</span>}
              </div>
            </div>

            {/* Player 2 (Right - Opponent) */}
            <div className="glass-panel" style={{ padding: '2rem', borderRight: '4px solid var(--neon-cyan)', backgroundColor: !isMyTurn ? 'rgba(0, 240, 255, 0.02)' : 'rgba(10,11,20,0.6)' }}>
              <span className="mono-hud" style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', display: 'block', textAlign: 'right' }}>[ TARGET HOST ]</span>
              <h3 className="mono-hud" style={{ fontSize: '1.5rem', color: '#fff', marginTop: '0.2rem', fontWeight: 'bold', textAlign: 'right' }}>{oppName}</h3>
              
              {/* HP Bar */}
              <div style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }} className="mono-hud">
                  <span style={{ color: 'var(--neon-cyan)', fontWeight: 'bold' }}>{oppHp} / 100</span>
                  <span>HP Tracker:</span>
                </div>
                <div style={{ width: '100%', height: '8px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden', marginTop: '0.3rem' }}>
                  <div style={{ width: `${oppHp}%`, height: '100%', backgroundColor: 'var(--neon-cyan)', transition: 'all 0.3s ease' }} />
                </div>
              </div>

              {/* Action flags */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }} className="mono-hud">
                {matchState.shield2 && isP1 && <span style={{ fontSize: '0.65rem', border: '1px solid var(--neon-cyan)', color: 'var(--neon-cyan)', padding: '2px 6px' }}>🛡️ SHIELD ACTIVE</span>}
                {matchState.shield1 && !isP1 && <span style={{ fontSize: '0.65rem', border: '1px solid var(--neon-cyan)', color: 'var(--neon-cyan)', padding: '2px 6px' }}>🛡️ SHIELD ACTIVE</span>}
              </div>
            </div>

          </div>

          {/* ACTIVE GAME PLAY LOG STATUS BAR */}
          <div className="glass-panel" style={{ padding: '1.2rem 1.8rem', backgroundColor: 'rgba(5,7,12,0.95)', border: '1px solid rgba(0,255,102,0.15)', minHeight: '60px' }}>
            <span className="mono-hud" style={{ fontSize: '0.65rem', color: '#00ff66', display: 'block', marginBottom: '3px' }}>&gt;_ SYNC BATTLE LOGGER</span>
            <p className="mono-hud" style={{ fontSize: '0.9rem', color: '#fff' }}>{actionLog}</p>
          </div>

          {/* Turn status banner */}
          <div style={{ textAlign: 'center' }}>
            {isMyTurn ? (
              <div style={{ color: 'var(--neon-red)', animation: 'pulse-red 1s infinite alternate' }} className="mono-hud">
                YOUR DECK PORTAL LOCKED IN. SELECT AN ACTION CARD BELOW.
              </div>
            ) : (
              <div style={{ color: 'var(--neon-cyan)', animation: 'pulse-cyan 1s infinite alternate' }} className="mono-hud">
                OPPONENT IS CHARGING ENERGY... PREPARE REACTION HOOKS
              </div>
            )}
          </div>

          {/* THE TACTICAL POWER DECK ACTION BUTTONS */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2rem', marginTop: '1.5rem' }}>
            
            <button
              onClick={() => handleExecuteMove('basic_strike')}
              disabled={!isMyTurn || winnerVerdict}
              className="glass-panel cyber-glitch-hover"
              style={{
                padding: '2rem 1rem',
                border: '1px solid var(--neon-red)',
                background: isMyTurn ? 'rgba(255,42,95,0.08)' : 'rgba(255,255,255,0.01)',
                color: '#fff',
                cursor: isMyTurn ? 'pointer' : 'not-allowed',
                opacity: isMyTurn ? 1 : 0.4,
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.8rem',
                transition: 'all 0.3s ease'
              }}
            >
              <Flame size={24} style={{ color: 'var(--neon-red)' }} />
              <div className="mono-hud" style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>💥 STRIKE</div>
              <span className="mono-hud" style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>Deals 15 damage</span>
            </button>

            <button
              onClick={() => handleExecuteMove('shield_defend')}
              disabled={!isMyTurn || winnerVerdict}
              className="glass-panel cyber-glitch-hover"
              style={{
                padding: '2rem 1rem',
                border: '1px solid var(--neon-cyan)',
                background: isMyTurn ? 'rgba(0,240,255,0.08)' : 'rgba(255,255,255,0.01)',
                color: '#fff',
                cursor: isMyTurn ? 'pointer' : 'not-allowed',
                opacity: isMyTurn ? 1 : 0.4,
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.8rem',
                transition: 'all 0.3s ease'
              }}
            >
              <Shield size={24} style={{ color: 'var(--neon-cyan)' }} />
              <div className="mono-hud" style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>🛡️ BARRIER</div>
              <span className="mono-hud" style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>Absorbs 80% damage next turn</span>
            </button>

            <button
              onClick={() => handleExecuteMove('ultimate_burst')}
              disabled={!isMyTurn || ultimateCooldownActive || winnerVerdict}
              className="glass-panel cyber-glitch-hover"
              style={{
                padding: '2rem 1rem',
                border: ultimateCooldownActive ? '1px dashed rgba(255,255,255,0.15)' : '1px solid var(--neon-purple)',
                background: isMyTurn && !ultimateCooldownActive ? 'rgba(161,35,255,0.08)' : 'rgba(255,255,255,0.01)',
                color: '#fff',
                cursor: isMyTurn && !ultimateCooldownActive ? 'pointer' : 'not-allowed',
                opacity: isMyTurn && !ultimateCooldownActive ? 1 : 0.4,
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.8rem',
                transition: 'all 0.3s ease'
              }}
            >
              <Zap size={24} style={{ color: ultimateCooldownActive ? 'rgba(255,255,255,0.3)' : 'var(--neon-purple)' }} />
              <div className="mono-hud" style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>🌀 ULTIMATE</div>
              <span className="mono-hud" style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>
                {ultimateCooldownActive ? `Recharging (${ultimateCooldownTurns} turns)` : 'Deals 35 heavy damage'}
              </span>
            </button>

          </div>

        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

    </div>
  );
}
