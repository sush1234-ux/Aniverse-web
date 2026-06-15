import React, { useState, useEffect } from 'react';
import { Sparkles, Trophy, Shield, Play, HelpCircle, Activity } from 'lucide-react';

const SHONEN_HYPE_NAMES = ['Luffy', 'Goku', 'Naruto', 'Zoro', 'Saitama', 'Gon', 'Sukuna', 'Edward'];
const DARK_ANTIHERO_NAMES = ['Levi', 'Lelouch', 'Light', 'Lawliet', 'Gojo', 'Itachi', 'Sasuke', 'Kaneki'];


const API_URL = import.meta.env.VITE_API_URL || 'https://backend-drab-seven-84.vercel.app';

export default function DebateArena() {
  const [characters, setCharacters] = useState([]);
  const [contenderA, setContenderA] = useState(null); // Selected Jikan character A
  const [contenderB, setContenderB] = useState(null); // Selected Jikan character B
  const [topic, setTopic] = useState('Who is the most legendary hero?');
  
  // Debate status states
  const [debateData, setDebateData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [visibleRound, setVisibleRound] = useState(0); // 0: none, 1: Round 1, 2: Round 2, 3: Round 3, 4: Verdict/Badge

  // Clean Jikan names
  const cleanJikanName = (name) => {
    if (name.includes(',')) {
      const parts = name.split(',').map(p => p.trim());
      return `${parts[1]} ${parts[0]}`;
    }
    return name;
  };

  // Fetch characters on mount
  useEffect(() => {
    fetch(`${API_URL}/api/archetype-matrix`)
      .then(res => res.json())
      .then(data => {
        if (data && data.data) {
          const raw = data.data.slice(0, 25);
          const mapped = raw.map(item => {
            const cleaned = cleanJikanName(item.name);
            let vibeTag = 'chill';
            let themeColor = '#00f0ff';
            const isHype = SHONEN_HYPE_NAMES.some(h => cleaned.toLowerCase().includes(h.toLowerCase()));
            const isDark = DARK_ANTIHERO_NAMES.some(d => cleaned.toLowerCase().includes(d.toLowerCase()));
            
            if (isHype) {
              vibeTag = 'hype';
              themeColor = '#ff2a5f';
            } else if (isDark) {
              vibeTag = 'dark';
              themeColor = '#a123ff';
            }

            return {
              _id: item.mal_id.toString(),
              name: cleaned,
              animeSource: item.name_kanji ? `${item.name_kanji} Series` : 'Featured Series',
              avatarUrl: item.images.jpg.image_url,
              vibeTag,
              themeColor
            };
          });
          setCharacters(mapped);
        }
      })
      .catch(err => {
        console.log('Error loading characters for DebateArena:', err.message);
        // Fallback characters
        setCharacters([
          { _id: '1', name: 'Monkey D. Luffy', animeSource: 'One Piece', avatarUrl: 'https://images.unsplash.com/photo-1541562232579-512a21360020?w=200', vibeTag: 'hype', themeColor: '#ff2a5f' },
          { _id: '2', name: 'Gojo Satoru', animeSource: 'Jujutsu Kaisen', avatarUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=200', vibeTag: 'dark', themeColor: '#a123ff' },
          { _id: '3', name: 'Kakashi Hatake', animeSource: 'Naruto', avatarUrl: 'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=200', vibeTag: 'chill', themeColor: '#00f0ff' }
        ]);
      });
  }, []);

  const handleSelectCharacter = (char) => {
    if (!contenderA) {
      setContenderA(char);
    } else if (!contenderB && contenderA._id !== char._id) {
      setContenderB(char);
    } else {
      // Rotate selections
      setContenderA(char);
      setContenderB(null);
    }
  };

  const handleStartDebate = async () => {
    if (!contenderA || !contenderB || !topic.trim()) return;

    setLoading(true);
    setError('');
    setDebateData(null);
    setVisibleRound(0);

    try {
      // 1. Sync Contender A with database
      const syncARes = await fetch(`${API_URL}/api/characters/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contenderA.name,
          animeSource: contenderA.animeSource,
          avatarUrl: contenderA.avatarUrl,
          vibeTag: contenderA.vibeTag,
          themeColor: contenderA.themeColor
        })
      });
      const dbCharA = await syncARes.json();

      // 2. Sync Contender B with database
      const syncBRes = await fetch(`${API_URL}/api/characters/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contenderB.name,
          animeSource: contenderB.animeSource,
          avatarUrl: contenderB.avatarUrl,
          vibeTag: contenderB.vibeTag,
          themeColor: contenderB.themeColor
        })
      });
      const dbCharB = await syncBRes.json();

      // 3. Request debate dialogue
      const debateRes = await fetch(`${API_URL}/api/debate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          charAId: dbCharA._id,
          charBId: dbCharB._id,
          topic: topic
        })
      });
      const debateResult = await debateRes.json();
      
      if (!debateRes.ok) throw new Error(debateResult.message || 'Clash failed');

      setDebateData(debateResult);
      
      // 4. Animate debate rounds sequentially
      setTimeout(() => setVisibleRound(1), 1000);  // Round 1
      setTimeout(() => setVisibleRound(2), 5000);  // Round 2
      setTimeout(() => setVisibleRound(3), 9000);  // Round 3
      setTimeout(() => setVisibleRound(4), 13000); // Verdict & Winner Badge
    } catch (err) {
      setError(err.message || 'Neural link clash failed.');
    } finally {
      setLoading(false);
    }
  };

  const clearSelection = () => {
    setContenderA(null);
    setContenderB(null);
    setDebateData(null);
    setVisibleRound(0);
  };

  const getWinnerData = () => {
    if (!debateData || !debateData.winner) return null;
    if (contenderA && debateData.winner.toLowerCase().includes(contenderA.name.toLowerCase())) {
      return contenderA;
    }
    if (contenderB && debateData.winner.toLowerCase().includes(contenderB.name.toLowerCase())) {
      return contenderB;
    }
    return contenderA; // Default fallback
  };

  const winnerProfile = getWinnerData();

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      
      {/* CONTENDER CHOOSE STAGE */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', alignItems: 'center' }}>
        
        {/* Contender A slot */}
        <div className="glass-panel" style={{ height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', border: contenderA ? `2px solid ${contenderA.themeColor}` : '1px dashed var(--glass-border)', backgroundColor: contenderA ? `${contenderA.themeColor}11` : 'rgba(0,0,0,0.2)' }}>
          {contenderA ? (
            <>
              <img src={contenderA.avatarUrl} alt={contenderA.name} style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${contenderA.themeColor}` }} />
              <h4 style={{ fontSize: '1.2rem', color: '#fff' }}>{contenderA.name}</h4>
              <span style={{ fontSize: '0.75rem', color: contenderA.themeColor, textTransform: 'uppercase', fontWeight: 'bold' }}>{contenderA.animeSource}</span>
            </>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Select first contender from below</p>
          )}
        </div>

        {/* Center Versus trigger */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem' }}>
          <span className="mono-hud" style={{ fontSize: '1.5rem', color: 'var(--neon-cyan)', fontWeight: '800' }}>VS</span>
          
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Clash Topic..."
            style={{ width: '100%', padding: '0.6rem 0.8rem', backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: '#fff', textAlign: 'center', fontSize: '0.9rem', outline: 'none' }}
          />

          {contenderA && contenderB ? (
            <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
              <button
                onClick={handleStartDebate}
                disabled={loading}
                style={{ flexGrow: 1, padding: '0.75rem', background: 'linear-gradient(135deg, var(--neon-cyan) 0%, #000 100%)', border: '1px solid var(--neon-cyan)', borderRadius: '6px', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {loading ? 'CALCULATING CLASH...' : 'START DEBATE'}
              </button>
              <button
                onClick={clearSelection}
                style={{ padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}
              >
                Clear
              </button>
            </div>
          ) : (
            <p className="mono-hud" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
              Select 2 characters below to unlock clash portals.
            </p>
          )}
        </div>

        {/* Contender B slot */}
        <div className="glass-panel" style={{ height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', border: contenderB ? `2px solid ${contenderB.themeColor}` : '1px dashed var(--glass-border)', backgroundColor: contenderB ? `${contenderB.themeColor}11` : 'rgba(0,0,0,0.2)' }}>
          {contenderB ? (
            <>
              <img src={contenderB.avatarUrl} alt={contenderB.name} style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${contenderB.themeColor}` }} />
              <h4 style={{ fontSize: '1.2rem', color: '#fff' }}>{contenderB.name}</h4>
              <span style={{ fontSize: '0.75rem', color: contenderB.themeColor, textTransform: 'uppercase', fontWeight: 'bold' }}>{contenderB.animeSource}</span>
            </>
          ) : (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Select second contender from below</p>
          )}
        </div>

      </section>

      {/* CLASH RESPONSE WINDOW */}
      {error && (
        <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', border: '1px solid var(--neon-red)', color: 'var(--neon-red)', backgroundColor: 'rgba(255,42,95,0.05)' }}>
          <p>{error}</p>
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '3rem 0' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.05)', borderTopColor: 'var(--neon-purple)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <span className="mono-hud" style={{ fontSize: '0.8rem', color: 'var(--neon-purple)' }}>CONSTRUCTING DIALOGUE HISTORIES ON MATRIX...</span>
        </div>
      )}

      {/* DEBATE DISPLAY */}
      {debateData && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem', padding: '1rem' }}>
          
          <div className="glass-panel" style={{ padding: '1rem 1.5rem', borderLeft: '3px solid var(--neon-cyan)', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(0,0,0,0.2)' }}>
            <Activity size={16} style={{ color: 'var(--neon-cyan)' }} />
            <span className="mono-hud" style={{ fontSize: '0.85rem', color: 'var(--neon-cyan)', fontWeight: 'bold' }}>CLASH STREAM ACTIVE // DIALOGUE REEL</span>
          </div>

          {/* Round 1 */}
          {visibleRound >= 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '1.5rem' }}>
              <span className="mono-hud" style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', fontWeight: 'bold' }}>[ROUND 01 - INITIATION]</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1rem', borderLeft: `3px solid ${contenderA?.themeColor}` }}>
                  <strong style={{ fontSize: '0.8rem', color: contenderA?.themeColor }}>{contenderA?.name}</strong>
                  <p style={{ marginTop: '0.4rem', fontSize: '0.9rem', color: '#fff', fontStyle: 'italic' }}>"{debateData.round1.charA}"</p>
                </div>
                <div className="glass-panel" style={{ padding: '1rem', borderRight: `3px solid ${contenderB?.themeColor}`, textAlign: 'right' }}>
                  <strong style={{ fontSize: '0.8rem', color: contenderB?.themeColor }}>{contenderB?.name}</strong>
                  <p style={{ marginTop: '0.4rem', fontSize: '0.9rem', color: '#fff', fontStyle: 'italic' }}>"{debateData.round1.charB}"</p>
                </div>
              </div>
            </div>
          )}

          {/* Round 2 */}
          {visibleRound >= 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '1.5rem' }}>
              <span className="mono-hud" style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', fontWeight: 'bold' }}>[ROUND 02 - INTENSIFICATION]</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1rem', borderLeft: `3px solid ${contenderA?.themeColor}` }}>
                  <strong style={{ fontSize: '0.8rem', color: contenderA?.themeColor }}>{contenderA?.name}</strong>
                  <p style={{ marginTop: '0.4rem', fontSize: '0.9rem', color: '#fff', fontStyle: 'italic' }}>"{debateData.round2.charA}"</p>
                </div>
                <div className="glass-panel" style={{ padding: '1rem', borderRight: `3px solid ${contenderB?.themeColor}`, textAlign: 'right' }}>
                  <strong style={{ fontSize: '0.8rem', color: contenderB?.themeColor }}>{contenderB?.name}</strong>
                  <p style={{ marginTop: '0.4rem', fontSize: '0.9rem', color: '#fff', fontStyle: 'italic' }}>"{debateData.round2.charB}"</p>
                </div>
              </div>
            </div>
          )}

          {/* Round 3 */}
          {visibleRound >= 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '1.5rem' }}>
              <span className="mono-hud" style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', fontWeight: 'bold' }}>[ROUND 03 - FINAL CLIMAX]</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div className="glass-panel" style={{ padding: '1rem', borderLeft: `3px solid ${contenderA?.themeColor}` }}>
                  <strong style={{ fontSize: '0.8rem', color: contenderA?.themeColor }}>{contenderA?.name}</strong>
                  <p style={{ marginTop: '0.4rem', fontSize: '0.9rem', color: '#fff', fontStyle: 'italic' }}>"{debateData.round3.charA}"</p>
                </div>
                <div className="glass-panel" style={{ padding: '1rem', borderRight: `3px solid ${contenderB?.themeColor}`, textAlign: 'right' }}>
                  <strong style={{ fontSize: '0.8rem', color: contenderB?.themeColor }}>{contenderB?.name}</strong>
                  <p style={{ marginTop: '0.4rem', fontSize: '0.9rem', color: '#fff', fontStyle: 'italic' }}>"{debateData.round3.charB}"</p>
                </div>
              </div>
            </div>
          )}

          {/* Winner Badge and Verdict */}
          {visibleRound >= 4 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2.5rem', alignItems: 'center', marginTop: '1.5rem', animation: 'fadeIn 1s ease-in' }}>
              
              {/* Cute Winner Badge */}
              <div 
                className="glass-panel" 
                style={{ 
                  padding: '2rem', 
                  textAlign: 'center', 
                  border: `2px solid ${winnerProfile?.themeColor || '#ffc107'}`, 
                  boxShadow: `0 0 30px ${winnerProfile?.themeColor || '#ffc107'}77`,
                  position: 'relative',
                  backgroundImage: 'radial-gradient(ellipse at bottom, rgba(255, 193, 7, 0.08) 0%, transparent 70%)',
                  overflow: 'visible'
                }}
              >
                {/* Visual Crown icon floating */}
                <div style={{ position: 'absolute', top: '-20px', left: 'calc(50% - 20px)', width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#000', border: `2px solid ${winnerProfile?.themeColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trophy size={18} style={{ color: winnerProfile?.themeColor }} />
                </div>
                
                <h4 className="mono-hud" style={{ fontSize: '0.75rem', color: winnerProfile?.themeColor, letterSpacing: '2px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.8rem' }}>
                  CLASH CHAMPION
                </h4>
                
                {winnerProfile && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.8rem' }}>
                    <div style={{ width: '80px', height: '80px', borderRadius: '12px', border: `2px solid ${winnerProfile.themeColor}`, overflow: 'hidden', boxShadow: `0 0 15px ${winnerProfile.themeColor}` }}>
                      <img src={winnerProfile.avatarUrl} alt={winnerProfile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <h3 style={{ fontSize: '1.4rem', color: '#fff', fontWeight: 'bold' }}>{winnerProfile.name}</h3>
                  </div>
                )}

                <div 
                  className="mono-hud" 
                  style={{ 
                    marginTop: '1.2rem', 
                    fontSize: '0.65rem', 
                    border: '1px solid rgba(255,255,255,0.08)', 
                    padding: '4px 10px', 
                    borderRadius: '4px',
                    display: 'inline-block',
                    backgroundColor: 'rgba(0,0,0,0.4)',
                    color: winnerProfile?.themeColor
                  }}
                >
                  🏆 NEURAL CHAMPION BADGE
                </div>
              </div>

              {/* Verdict Text */}
              <div className="glass-panel" style={{ padding: '2rem', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span className="mono-hud" style={{ fontSize: '0.75rem', color: 'var(--neon-cyan)', fontWeight: 'bold' }}>[DECISION VERDICT]</span>
                <p style={{ marginTop: '0.8rem', fontSize: '1rem', color: '#e5e7eb', lineHeight: '1.6' }}>
                  {debateData.verdict}
                </p>
              </div>

            </div>
          )}

        </section>
      )}

      {/* STEP 2: CHARACTER GRID */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.5rem' }}>
          Select Portals (Choose 2 Contenders)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.5rem' }}>
          {characters.map(char => {
            const isSelectedA = contenderA?._id === char._id;
            const isSelectedB = contenderB?._id === char._id;
            const themeColor = char.themeColor;

            return (
              <button
                key={char._id}
                onClick={() => handleSelectCharacter(char)}
                className="glass-panel"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.8rem',
                  padding: '0.75rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  border: isSelectedA || isSelectedB 
                    ? `2px solid ${themeColor}` 
                    : '1px solid var(--glass-border)',
                  backgroundColor: isSelectedA || isSelectedB ? `${themeColor}11` : 'var(--glass-surface)',
                  transition: 'var(--transition-bezier)'
                }}
              >
                <img src={char.avatarUrl} alt={char.name} style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover', border: `1px solid ${themeColor}` }} />
                
                <div>
                  <h4 style={{ fontSize: '0.85rem', color: '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '120px' }}>{char.name}</h4>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{char.animeSource}</span>
                </div>

                {isSelectedA && (
                  <span className="mono-hud" style={{ marginLeft: 'auto', fontSize: '0.75rem', color: themeColor, fontWeight: 'bold' }}>A</span>
                )}
                {isSelectedB && (
                  <span className="mono-hud" style={{ marginLeft: 'auto', fontSize: '0.75rem', color: themeColor, fontWeight: 'bold' }}>B</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

    </div>
  );
}
