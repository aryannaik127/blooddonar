import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../services/api.js';

function BloodDropSVG() {
  return (
    <div className="blood-drop-3d">
      <svg viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="dropGrad" x1="20" y1="10" x2="80" y2="110" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FF4D63" />
            <stop offset="100%" stopColor="#A81C2E" />
          </linearGradient>
          <filter id="dropShadow">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#D7263D" floodOpacity="0.3" />
          </filter>
        </defs>
        <path
          d="M50 8 C50 8, 15 55, 15 75 C15 95, 30 112, 50 112 C70 112, 85 95, 85 75 C85 55, 50 8, 50 8Z"
          fill="url(#dropGrad)"
          filter="url(#dropShadow)"
        />
        <ellipse cx="38" cy="68" rx="10" ry="14" fill="rgba(255,255,255,0.2)" transform="rotate(-15 38 68)" />
      </svg>
    </div>
  );
}

export default function LandingPage() {
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const loadStats = useCallback(() => {
    setStatsLoading(true);
    api.getStats()
      .then(data => { setStats(data); setStatsLoading(false); })
      .catch(() => { setStats({ totalDonors: 0, activeRequests: 0, totalDonations: 0, availableDonors: 0 }); setStatsLoading(false); });
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div>
      {/* Hero */}
      <div className="hero">
        {/* 3D Abstract floating shapes */}
        <div className="hero-shape hero-shape-1" />
        <div className="hero-shape hero-shape-2" />
        <div className="hero-shape hero-shape-3" />
        <div className="hero-shape hero-shape-4" />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <BloodDropSVG />
          <h1>
            Save Lives With<br />
            <span style={{ color: 'var(--red)', textShadow: '0 2px 20px rgba(215,38,61,0.2)' }}>Every Drop</span>
          </h1>
          <p>
            Real-time blood donor matching system connecting donors with hospitals in emergency situations.
          </p>
          <div className="hero-ctas">
            <Link to="/register?role=donor" className="btn btn-primary btn-lg">
              🩸 Register as Donor
            </Link>
            <Link to="/register?role=hospital" className="btn btn-secondary btn-lg">
              🏥 Register as Hospital
            </Link>
          </div>
          <div style={{ marginTop: 24 }}>
            <Link to="/login" className="btn btn-ghost btn-sm">
              Already have an account? Login →
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ padding: '48px 24px', maxWidth: 900, margin: '0 auto' }}>
        <div className="stats-grid">
          {[
            { icon: '💉', value: statsLoading ? '...' : stats?.totalDonors ?? 0, label: 'Active Donors' },
            { icon: '🏥', value: statsLoading ? '...' : stats?.activeRequests ?? 0, label: 'Active Requests' },
            { icon: '❤️', value: statsLoading ? '...' : stats?.totalDonations ?? 0, label: 'Donations Made' },
            { icon: '⚡', value: statsLoading ? '...' : stats?.availableDonors ?? 0, label: 'Available Now' }
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div style={{ fontSize: 32 }}>{s.icon}</div>
              <div className="value" style={{ color: 'var(--red)' }}>{s.value}</div>
              <div className="label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div style={{ padding: '0 24px 60px', maxWidth: 900, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: 32, fontSize: 'clamp(22px,4vw,36px)' }}>
          How It <span style={{ color: 'var(--red)' }}>Works</span>
        </h2>
        <div className="features-grid">
          {[
            { icon: '📍', title: 'Location-Based Matching', desc: 'GPS-powered system finds nearest compatible donors within 5–20 km radius instantly.' },
            { icon: '⚡', title: 'Real-Time Alerts', desc: 'Donors receive instant in-app and email notifications when hospitals need blood.' },
            { icon: '🛡️', title: 'Smart Cooldown System', desc: '90-day donation cooldown ensures donor health and prevents over-donation.' },
            { icon: '📊', title: 'Live Dashboards', desc: 'Hospitals track donor responses in real time. Donors view their complete history.' },
            { icon: '🚨', title: 'Emergency Priority', desc: 'Critical requests get highest priority flagging and reach all available donors instantly.' },
            { icon: '🔒', title: 'Secure & Private', desc: 'JWT authentication with encrypted data. Multi-device login support included.' }
          ].map(f => (
            <div key={f.title} className="card feature-card">
              <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
              <h3 style={{ marginBottom: 8, fontSize: 17 }}>{f.title}</h3>
              <p style={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
