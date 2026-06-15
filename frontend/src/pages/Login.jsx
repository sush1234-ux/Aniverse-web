import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, ShieldAlert } from 'lucide-react';


const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Login() {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const endpoint = authMode === 'login' ? 'login' : 'signup';

    try {
      const res = await fetch(`${API_URL}/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      
      if (!res.ok) {
        console.error('Authentication Error Details:', data);
        throw new Error(data.error || data.message || 'Authentication failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Navigate to home and trigger page reload to refresh top nav auth state
      navigate('/');
      window.location.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '80vh', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '2.5rem', border: '1px solid rgba(161, 35, 255, 0.25)', boxShadow: 'var(--glow-purple)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textTransform: 'uppercase' }}>
            <span style={{ color: 'var(--neon-purple)' }}>Cognitive</span> Portal
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.4rem' }}>Sync credentials to access the AniVerse Hub</p>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(255, 42, 95, 0.1)', border: '1px solid var(--neon-red)', color: 'var(--neon-red)', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.85rem' }}>
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {authMode === 'signup' && (
            <div>
              <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Username</label>
              <input 
                type="text" 
                value={form.username}
                onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
                required
                style={{ width: '100%', padding: '0.8rem', backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: '#fff', outline: 'none' }}
              />
            </div>
          )}
          
          <div>
            <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Email Address</label>
            <input 
              type="email" 
              value={form.email}
              onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
              required
              style={{ width: '100%', padding: '0.8rem', backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: '#fff', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>Password</label>
            <input 
              type="password" 
              value={form.password}
              onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
              required
              style={{ width: '100%', padding: '0.8rem', backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: '#fff', outline: 'none' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ padding: '0.85rem', background: 'linear-gradient(135deg, var(--neon-purple) 0%, #000 100%)', border: '1px solid var(--neon-purple)', color: '#fff', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '1px', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'var(--transition-bezier)' }}
            onMouseOver={(e) => e.currentTarget.style.boxShadow = 'var(--glow-purple)'}
            onMouseOut={(e) => e.currentTarget.style.boxShadow = 'none'}
          >
            {authMode === 'login' ? <LogIn size={16} /> : <UserPlus size={16} />}
            {loading ? 'SYNCHRONIZING...' : (authMode === 'login' ? 'INITIALIZE LINK' : 'GENERATE PROFILE')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            {authMode === 'login' ? "Don't have a profile? " : "Already registered? "}
          </span>
          <button 
            onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
            style={{ background: 'transparent', border: 'none', color: 'var(--neon-cyan)', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline' }}
          >
            {authMode === 'login' ? 'Create Profile' : 'Access Link'}
          </button>
        </div>
      </div>
    </div>
  );
}
