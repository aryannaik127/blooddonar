import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); setError(''); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email.trim() || !form.password) {
      setError('Email and password are required'); return;
    }
    setLoading(true);
    try {
      const data = await login(form.email, form.password);
      const role = data.user?.role;
      navigate(role === 'hospital' ? '/hospital-dashboard' : '/donor-dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
      {/* Abstract background shapes */}
      <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: 300, height: 300, borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%', background: 'rgba(215,38,61,0.05)', animation: 'morphShape1 12s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-5%', left: '-5%', width: 200, height: 200, borderRadius: '70% 30% 30% 70% / 70% 70% 30% 30%', background: 'rgba(215,38,61,0.04)', animation: 'morphShape2 15s ease-in-out infinite', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }} className="fade-in">
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 10, filter: 'drop-shadow(0 4px 12px rgba(215,38,61,0.25))' }}>🩸</div>
          <h2 style={{ fontSize: 28, fontWeight: 800 }}>Welcome Back</h2>
          <p style={{ color: 'var(--muted)', marginTop: 6 }}>Sign in to your account</p>
        </div>

        <form className="card card-glow" onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label>Email Address</label>
              <input
                className="input" type="email" placeholder="your@email.com"
                value={form.email} onChange={e => set('email', e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                className="input" type="password" placeholder="Enter your password"
                value={form.password} onChange={e => set('password', e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error && <div className="form-error" style={{ textAlign: 'center' }}>{error}</div>}

            <button className="btn btn-primary" style={{ width: '100%', padding: 14 }} disabled={loading}>
              {loading ? <span className="spinner" /> : 'Sign In →'}
            </button>

            <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
              Don't have an account?{' '}
              <Link to="/register" className="btn btn-ghost btn-sm" style={{ padding: '2px 8px' }}>
                Sign Up
              </Link>
            </div>

            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginTop: 4, lineHeight: 1.6 }}>
              <strong>Demo Accounts:</strong><br />
              Donor: aryan@demo.com / demo123<br />
              Hospital: siem@hospital.com / hospital123
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
