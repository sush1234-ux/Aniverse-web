import React, { useState, useEffect } from 'react';
import { Film, CheckCircle, Sparkles, Play } from 'lucide-react';

const SHONEN_HYPE_NAMES = ['Luffy', 'Goku', 'Naruto', 'Zoro', 'Saitama', 'Gon', 'Sukuna', 'Edward'];
const DARK_ANTIHERO_NAMES = ['Levi', 'Lelouch', 'Light', 'Lawliet', 'Gojo', 'Itachi', 'Sasuke', 'Kaneki'];


const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export default function MovieEngine() {
  const [characters, setCharacters] = useState([]);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Clean Jikan names
  const cleanJikanName = (name) => {
    if (name.includes(',')) {
      const parts = name.split(',').map(p => p.trim());
      return `${parts[1]} ${parts[0]}`;
    }
    return name;
  };

  // Fetch characters directly
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
        console.log('Error loading characters for MovieEngine:', err.message);
        // Fallback characters
        setCharacters([
          { _id: 'char_luffy', name: 'Monkey D. Luffy', animeSource: 'One Piece', avatarUrl: 'https://images.unsplash.com/photo-1541562232579-512a21360020?w=200', vibeTag: 'hype', themeColor: '#ff2a5f' },
          { _id: 'char_gojo', name: 'Gojo Satoru', animeSource: 'Jujutsu Kaisen', avatarUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=200', vibeTag: 'dark', themeColor: '#a123ff' },
          { _id: 'char_kakashi', name: 'Kakashi Hatake', animeSource: 'Naruto', avatarUrl: 'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=200', vibeTag: 'chill', themeColor: '#00f0ff' }
        ]);
      });
  }, []);

  const handleSelectCharacter = async (char) => {
    setSelectedCharacter(char);
    setRecommendations([]);
    setLoading(true);
    setError('');

    try {
      // 1. Sync Jikan character with MongoDB to ensure character exists
      const syncRes = await fetch(`${API_URL}/api/characters/sync`, {
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
      const syncedChar = await syncRes.json();
      
      const dbId = syncedChar._id;

      // 2. Fetch film recommendations using MongoDB character ID
      const res = await fetch(`${API_URL}/api/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: dbId })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to generate recommendations');

      setRecommendations(data);
    } catch (err) {
      setError('Connection to cognitive synapse disrupted. Try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
      
      {/* Page Heading */}
      <div style={{ textAlign: 'center' }}>
        <span style={{ color: 'var(--neon-red)', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '2px' }}>Cognitive Cinema Filter</span>
        <h1 style={{ fontSize: '2.5rem', marginTop: '0.25rem', marginBottom: '0.5rem' }}>PERSONALITY-DRIVEN FILM MATCHING ENGINE</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '600px', margin: '0 auto' }}>
          Select an active anime character interface below to align their canonical moral framework and personality traits to suggest live-action films.
        </p>
      </div>

      {/* STEP 1: CHARACTER SELECT BOARD */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
        <h3 style={{ fontSize: '1.1rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.5rem' }}>
          Step 1: Choose Your Cognitive Lens
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
          {characters.map(char => {
            const isSelected = selectedCharacter?._id === char._id;
            const themeColor = char.themeColor || '#00f0ff';

            return (
              <button
                key={char._id}
                onClick={() => handleSelectCharacter(char)}
                className="glass-panel"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  border: isSelected ? `2px solid ${themeColor}` : '1px solid var(--glass-border)',
                  backgroundColor: isSelected ? `${themeColor}11` : 'var(--glass-surface)',
                  boxShadow: isSelected ? `0 0 15px ${themeColor}33` : 'none',
                  transition: 'var(--transition-bezier)'
                }}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', border: `1px solid ${themeColor}` }}>
                  <img src={char.avatarUrl} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                
                <div>
                  <h4 style={{ fontSize: '1rem', color: '#fff' }}>{char.name}</h4>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    {char.animeSource}
                  </span>
                </div>

                {isSelected && (
                  <CheckCircle size={16} style={{ marginLeft: 'auto', color: themeColor }} />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* STEP 2: MOVIE RESULTS STAGE */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: '300px' }}>
        <h3 style={{ fontSize: '1.1rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '0.5rem' }}>
          Step 2: Projected Film Output
        </h3>

        {/* Loading State */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', padding: '4rem 0' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.05)', borderTopColor: selectedCharacter?.themeColor || 'var(--neon-purple)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <span className="mono-hud" style={{ fontSize: '0.8rem', color: selectedCharacter?.themeColor || '#fff' }}>
              DECRYPTING SCRIPTS VIA {selectedCharacter?.name?.toUpperCase()}_COGNITIVE_ARRAY...
            </span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--neon-red)', border: '1px solid var(--neon-red)', backgroundColor: 'rgba(255,42,95,0.05)' }}>
            <p>{error}</p>
          </div>
        )}

        {/* Blank/Initial State */}
        {!selectedCharacter && !loading && !error && (
          <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Film size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p>Select a character interface above to transmit a cognitive request.</p>
          </div>
        )}

        {/* Display recommendations */}
        {!loading && !error && recommendations.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* HUD Status Header */}
            <div className="glass-panel" style={{ padding: '1rem 1.5rem', borderLeft: `3px solid ${selectedCharacter?.themeColor}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
              <div>
                <span className="mono-hud" style={{ fontSize: '0.75rem', color: selectedCharacter?.themeColor }}>
                  COG_ARRAY: SUCCESSFUL_MATCHES
                </span>
                <h4 style={{ fontSize: '1.2rem', color: '#fff', marginTop: '0.1rem' }}>
                  Recommendations filtered by {selectedCharacter?.name}
                </h4>
              </div>
              <Sparkles size={18} style={{ color: selectedCharacter?.themeColor }} />
            </div>

            {/* Movie Lists */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {recommendations.map((rec, idx) => {
                const themeColor = selectedCharacter?.themeColor || '#00f0ff';
                const confidence = rec.confidence || 85;

                return (
                  <div
                    key={idx}
                    className="glass-panel"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '80px 1fr',
                      gap: '1.5rem',
                      padding: '2rem',
                      backgroundColor: 'rgba(13, 14, 21, 0.5)',
                      border: '1px solid var(--glass-border)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRight: '1px solid rgba(255,255,255,0.05)', paddingRight: '1.5rem' }}>
                      <span className="mono-hud" style={{ fontSize: '1.5rem', color: themeColor, fontWeight: '800' }}>
                        0{idx + 1}
                      </span>
                      <Play size={16} style={{ color: 'var(--text-secondary)', marginTop: '0.4rem' }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem' }}>
                        <h4 style={{ fontSize: '1.5rem', color: '#fff' }}>{rec.title}</h4>
                        
                        <div style={{ minWidth: '150px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.2rem' }}>
                            <span className="mono-hud" style={{ color: 'var(--text-secondary)' }}>COGNITIVE_MATCH:</span>
                            <span className="mono-hud" style={{ color: themeColor, fontWeight: 'bold' }}>{confidence}%</span>
                          </div>
                          
                          <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${confidence}%`, height: '100%', backgroundColor: themeColor }} />
                          </div>
                        </div>
                      </div>

                      <p style={{ color: '#d1d5db', fontSize: '0.95rem', lineHeight: '1.6', borderLeft: `2px solid ${themeColor}66`, paddingLeft: '12px', fontStyle: 'italic' }}>
                        "{rec.explanation}"
                      </p>
                    </div>

                    <div style={{ position: 'absolute', right: 0, bottom: 0, top: 0, width: '250px', background: `radial-gradient(circle at bottom right, ${themeColor}09, transparent 75%)`, pointerEvents: 'none' }} />
                  </div>
                );
              })}
            </div>
            
          </div>
        )}
      </section>

    </div>
  );
}
