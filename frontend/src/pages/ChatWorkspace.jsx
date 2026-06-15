import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Send, User as UserIcon, Users, Hash, ShieldAlert, Sparkles, MessageCircle, LogIn } from 'lucide-react';


const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export default function ChatWorkspace() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Authentication states
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });
  const [authError, setAuthError] = useState('');

  // Chat workspaces
  const [fanclubs, setFanclubs] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null); // { type: 'fanclub'|'dm', id, name, avatarUrl }
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  
  // HUD indicators
  const [typingIndicator, setTypingIndicator] = useState(null);
  const [affinityXP, setAffinityXP] = useState(0);
  const [affinityLevel, setAffinityLevel] = useState(1);
  const [triggerXPAnimation, setTriggerXPAnimation] = useState(false);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  const initialRoomSelected = useRef(false);

  // 1. Fetch available characters and fanclubs once on mount/auth state change
  useEffect(() => {
    // Fetch available characters
    fetch(`${API_URL}/api/characters`)
      .then(res => res.json())
      .then(data => {
        setCharacters(data);
        
        // Auto-select character DM if passed in state on mount
        if (!initialRoomSelected.current && location.state && location.state.characterId) {
          const matched = data.find(c => c._id === location.state.characterId);
          if (matched) {
            selectRoom('dm', matched._id, matched.name, matched.avatarUrl);
            initialRoomSelected.current = true;
          }
        }
      })
      .catch(err => console.log('Error loading characters:', err));

    // Fetch community channels
    fetch(`${API_URL}/api/fanclubs`)
      .then(res => res.json())
      .then(data => {
        setFanclubs(data);

        // Auto-select fanclub room if passed in state on mount
        if (!initialRoomSelected.current && location.state && location.state.fanclubId) {
          const matched = data.find(f => f._id === location.state.fanclubId);
          if (matched) {
            selectRoom('fanclub', matched._id, matched.name, matched.bannerUrl);
            initialRoomSelected.current = true;
            return;
          }
        }
        
        // Default select first fanclub if no room active
        if (data.length > 0 && !initialRoomSelected.current && !currentRoom && !(location.state && location.state.characterId)) {
          selectRoom('fanclub', data[0]._id, data[0].name, data[0].bannerUrl);
          initialRoomSelected.current = true;
        }
      })
      .catch(err => console.log('Error loading fanclubs:', err));
  }, [token]);

  // 2. Setup Socket connections when currentRoom.id changes
  useEffect(() => {
    if (!token || !currentRoom?.id) return;

    // Connect Socket.io client
    socketRef.current = io(API_URL);

    // Sync affinity update events
    if (user && user.id) {
      socketRef.current.on(`affinity_update_${user.id}`, (data) => {
        const updatedPoints = data.affinityPoints || {};
        const updatedUser = { ...user, affinityPoints: updatedPoints };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      });
    }

    // Join room
    socketRef.current.emit('join_room', currentRoom.id);

    // Capture standard room broadcasts
    socketRef.current.on('message', (message) => {
      const isCurrentFanclub = currentRoom.type === 'fanclub' && message.fanclubId === currentRoom.id;
      const isCurrentDM = currentRoom.type === 'dm' && message.characterId === currentRoom.id && !message.fanclubId;

      if (isCurrentFanclub || isCurrentDM) {
        setMessages(prev => [...prev, message]);
        setTypingIndicator(null);
      }
    });

    // Capture character typing signals
    socketRef.current.on('character_typing', (data) => {
      setTypingIndicator({ name: data.characterName });
      setTimeout(() => setTypingIndicator(null), 5000);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [token, currentRoom?.id]);

  // Handle scroll-lock syncing
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingIndicator]);

  // Track & animate Affinity Levels
  useEffect(() => {
    if (!currentRoom || !user) return;
    
    let activeCharName = '';
    if (currentRoom.type === 'dm') {
      activeCharName = currentRoom.name;
    } else {
      const club = fanclubs.find(f => f._id === currentRoom.id);
      if (club && club.associatedCharacters && club.associatedCharacters.length > 0) {
        activeCharName = club.associatedCharacters[0].name;
      }
    }

    if (activeCharName) {
      const xp = user.affinityPoints?.[activeCharName] || 0;
      setAffinityXP(xp);
      const level = Math.floor(xp / 500) + 1;
      setAffinityLevel(level);
    }
  }, [currentRoom, user, fanclubs]);

  // Select channel/room
  const selectRoom = (type, id, name, avatarUrl) => {
    setCurrentRoom({ type, id, name, avatarUrl });
    setMessages([]);
    setTypingIndicator(null);

    if (type === 'fanclub') {
      fetch(`${API_URL}/api/messages/${id}`)
        .then(res => res.json())
        .then(data => setMessages(data))
        .catch(err => console.log('Error loading history:', err));
    } else {
      // direct message welcome alert
      setMessages([
        {
          _id: 'welcome',
          senderType: 'SYSTEM',
          senderName: 'SYSTEM',
          text: `Neural connection established. Secure direct stream with ${name} online.`
        }
      ]);
    }
  };

  // Auth operations
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = authMode === 'login' ? 'login' : 'signup';

    try {
      const res = await fetch(`${API_URL}/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'Authentication failed');

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      
      window.location.reload(); // Refresh to bind sockets with active login ID
    } catch (err) {
      setAuthError(err.message);
    }
  };

  // Dispatch outgoing message
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (!user) {
      setAuthError('Authentication token missing.');
      return;
    }

    const payload = {
      text: inputText,
      senderType: 'USER',
      senderId: user.id,
      senderName: user.username || user.email || 'User',
      fanclubId: currentRoom.type === 'fanclub' ? currentRoom.id : null,
      characterId: currentRoom.type === 'dm' ? currentRoom.id : null
    };

    if (socketRef.current) {
      socketRef.current.emit('send_message', payload);
    } else {
      const mock = {
        _id: Math.random().toString(),
        senderType: 'USER',
        senderName: user.username,
        text: inputText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, mock]);
    }

    setInputText('');

    // Trigger visual XP animations
    setTriggerXPAnimation(true);
    setTimeout(() => setTriggerXPAnimation(false), 800);

    // Optimistically advance points
    setAffinityXP(prev => {
      const nextXP = prev + 25;
      const nextLvl = Math.floor(nextXP / 500) + 1;
      if (nextLvl > affinityLevel) setAffinityLevel(nextLvl);
      return nextXP;
    });
  };

  // Join group room
  const joinClub = async (clubId) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/fanclubs/${clubId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok) {
        const updated = { ...user, joinedFanclubs: data.joinedFanclubs };
        setUser(updated);
        localStorage.setItem('user', JSON.stringify(updated));
      }
    } catch (err) {
      console.log('Error joining club:', err);
    }
  };

  if (!token) {
    return (
      <div style={{ display: 'flex', minHeight: '80vh', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '2.5rem', border: '1px solid rgba(161, 35, 255, 0.25)', textAlign: 'center', boxShadow: 'var(--glow-purple)' }}>
          <LogIn size={40} style={{ color: 'var(--neon-purple)', marginBottom: '1rem' }} />
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.8rem', color: '#fff' }}>AUTHENTICATION REQUIRED</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
            Please authenticate at the central portal to establish active neural links with AI agents and joined community fanclubs.
          </p>
          <button
            onClick={() => navigate('/login')}
            style={{ padding: '0.8rem 2rem', background: 'linear-gradient(135deg, var(--neon-purple) 0%, #000 100%)', border: '1px solid var(--neon-purple)', color: '#fff', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', letterSpacing: '1px', transition: 'var(--transition-bezier)' }}
          >
            GO TO LOGIN
          </button>
        </div>
      </div>
    );
  }

  // Calculate Affinity Meter Progression percentage
  const currentXPPercent = Math.min(Math.round(((affinityXP % 500) / 500) * 100), 100);
  const barsCount = Math.floor(currentXPPercent / 10);
  const progressMeterVisual = `[${'='.repeat(barsCount)}${'>'}${'_'.repeat(Math.max(10 - barsCount - 1, 0))}] ${currentXPPercent}%`;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', height: 'calc(100vh - 100px)', gap: '1.5rem', padding: '1rem 0' }}>
      
      {/* LEFT SIDEBAR PANEL */}
      <aside className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem', overflowY: 'auto' }}>
        
        {/* User Info Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '1rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid var(--neon-cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 240, 255, 0.1)' }}>
            <UserIcon size={18} style={{ color: 'var(--neon-cyan)' }} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.95rem', color: '#fff' }}>{user?.username}</h4>
            <span className="mono-hud" style={{ fontSize: '0.65rem', color: 'var(--neon-cyan)' }}>NODE_ONLINE</span>
          </div>
          <button 
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--neon-red)', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}
          >
            Logout
          </button>
        </div>

        {/* Community Fanclubs Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
            <Users size={16} />
            <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>COMMUNITY FANCLUBS</h4>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {fanclubs.map(club => {
              const isJoined = user?.joinedFanclubs?.includes(club._id);
              const isActive = currentRoom?.type === 'fanclub' && currentRoom?.id === club._id;

              return (
                <div key={club._id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    onClick={() => selectRoom('fanclub', club._id, club.name, club.bannerUrl)}
                    style={{
                      flexGrow: 1,
                      textAlign: 'left',
                      padding: '0.6rem 0.8rem',
                      background: isActive ? 'rgba(0, 240, 255, 0.1)' : 'transparent',
                      border: isActive ? '1px solid var(--neon-cyan)' : '1px solid transparent',
                      borderRadius: '6px',
                      color: isActive ? '#fff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'var(--transition-bezier)'
                    }}
                  >
                    <Hash size={14} />
                    {club.name}
                  </button>
                  
                  {!isJoined && (
                    <button
                      onClick={() => joinClub(club._id)}
                      style={{
                        padding: '0.3rem 0.6rem',
                        fontSize: '0.7rem',
                        backgroundColor: 'rgba(161, 35, 255, 0.15)',
                        border: '1px solid var(--neon-purple)',
                        color: 'var(--neon-purple)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      JOIN
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Character Direct Channels Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
            <MessageCircle size={16} />
            <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>1-ON-1 COGNITIVE LINKS</h4>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {characters.map(char => {
              const isActive = currentRoom?.type === 'dm' && currentRoom?.id === char._id;
              return (
                <button
                  key={char._id}
                  onClick={() => selectRoom('dm', char._id, char.name, char.avatarUrl)}
                  style={{
                    textAlign: 'left',
                    padding: '0.6rem 0.8rem',
                    background: isActive ? 'rgba(161, 35, 255, 0.1)' : 'transparent',
                    border: isActive ? '1px solid var(--neon-purple)' : '1px solid transparent',
                    borderRadius: '6px',
                    color: isActive ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'var(--transition-bezier)'
                  }}
                >
                  <img src={char.avatarUrl} alt={char.name} referrerPolicy="no-referrer" style={{ width: '18px', height: '18px', borderRadius: '50%', objectFit: 'cover' }} />
                  {char.name}
                </button>
              );
            })}
          </div>
        </div>

      </aside>

      {/* RIGHT SIDE CHAT WORKSPACE */}
      <main className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        
        {/* Top Header & Affinity indicators */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', backgroundColor: 'rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            {currentRoom?.avatarUrl && currentRoom.type === 'dm' && (
              <img src={currentRoom.avatarUrl} alt={currentRoom.name} referrerPolicy="no-referrer" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--neon-purple)' }} />
            )}
            <div>
              <h3 style={{ fontSize: '1.1rem', color: '#fff' }}>{currentRoom?.name || 'Neural Matrix Standby...'}</h3>
              <span className="mono-hud" style={{ fontSize: '0.7rem', color: currentRoom?.type === 'dm' ? 'var(--neon-purple)' : 'var(--neon-cyan)' }}>
                {currentRoom?.type === 'dm' ? 'DIRECT_SECURE_LINK' : 'GROUP_FANCLUB_SPECTRUM'}
              </span>
            </div>
          </div>

          {/* Sticky Affinity tracker */}
          {currentRoom && (
            <div 
              style={{ 
                textAlign: 'right', 
                transition: 'transform 0.15s ease',
                transform: triggerXPAnimation ? 'scale(1.08)' : 'scale(1)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-end' }}>
                <Sparkles size={14} style={{ color: 'var(--neon-cyan)' }} />
                <span className="mono-hud" style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 'bold' }}>
                  Affinity Level: {affinityLevel}
                </span>
              </div>
              <div className="mono-hud" style={{ fontSize: '0.7rem', color: 'var(--neon-cyan)', marginTop: '0.15rem' }}>
                {progressMeterVisual}
              </div>
            </div>
          )}
        </header>

        {/* Scrollable logs */}
        <div style={{ flexGrow: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {messages.map((msg, idx) => {
            const isMe = msg.senderType === 'USER' && msg.senderId === user?.id;
            const isAgent = msg.senderType === 'AI_AGENT';
            const isSystem = msg.senderType === 'SYSTEM';

            return (
              <div 
                key={msg._id || idx} 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  alignSelf: isMe ? 'flex-end' : (isSystem ? 'center' : 'flex-start'),
                  maxWidth: isSystem ? '100%' : '75%'
                }}
              >
                {!isSystem && (
                  <span style={{ fontSize: '0.7rem', color: isMe ? 'var(--neon-cyan)' : (isAgent ? 'var(--neon-purple)' : 'var(--text-secondary)'), marginBottom: '2px', alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
                    {msg.senderName}
                  </span>
                )}

                <div 
                  className={!isSystem ? 'glass-panel' : ''}
                  style={{
                    padding: isSystem ? '0.2rem 1rem' : '0.8rem 1rem',
                    borderRadius: isSystem ? '4px' : '8px',
                    backgroundColor: isMe 
                      ? 'rgba(0, 240, 255, 0.08)' 
                      : (isAgent ? 'rgba(161, 35, 255, 0.08)' : (isSystem ? 'transparent' : 'rgba(255, 255, 255, 0.02)')),
                    border: isSystem ? 'none' : (
                      isMe ? '1px solid rgba(0, 240, 255, 0.3)' 
                      : (isAgent ? '1px solid rgba(161, 35, 255, 0.3)' : '1px solid var(--glass-border)')
                    ),
                    color: isSystem ? 'var(--text-secondary)' : '#fff',
                    fontSize: isSystem ? '0.75rem' : '0.9rem',
                    fontFamily: isSystem ? 'var(--font-mono)' : 'inherit'
                  }}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {typingIndicator && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', alignSelf: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '3px' }}>
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--neon-purple)', animation: 'pulse-purple 1s infinite alternate' }} />
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--neon-purple)', animation: 'pulse-purple 1s infinite alternate 0.2s' }} />
                <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: 'var(--neon-purple)', animation: 'pulse-purple 1s infinite alternate 0.4s' }} />
              </div>
              <span className="mono-hud" style={{ fontSize: '0.7rem', color: 'var(--neon-purple)' }}>
                {typingIndicator.name} sensing thoughts...
              </span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Message box */}
        <form 
          onSubmit={handleSendMessage}
          style={{ 
            display: 'flex', 
            gap: '0.75rem', 
            padding: '1.2rem 1.5rem', 
            borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            backgroundColor: 'rgba(0,0,0,0.3)'
          }}
        >
          <input
            type="text"
            placeholder={
              currentRoom?.type === 'fanclub'
                ? `Tag characters (e.g. @Gojo) to summon AI replies...`
                : `Say something to ${currentRoom?.name}... (auto-replies enabled)`
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={{
              flexGrow: 1,
              padding: '0.85rem 1rem',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              border: '1px solid var(--glass-border)',
              borderRadius: '6px',
              color: '#fff',
              outline: 'none',
              fontSize: '0.9rem',
              transition: 'var(--transition-bezier)'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = 'var(--neon-purple)'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--glass-border)'}
          />
          <button
            type="submit"
            style={{
              padding: '0.85rem 1.5rem',
              background: 'linear-gradient(135deg, var(--neon-purple) 0%, #000 100%)',
              border: '1px solid var(--neon-purple)',
              borderRadius: '6px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              transition: 'var(--transition-bezier)'
            }}
          >
            <Send size={16} />
          </button>
        </form>

      </main>
    </div>
  );
}
