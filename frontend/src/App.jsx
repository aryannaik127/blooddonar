import { useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { initializeSocket, disconnectSocket } from './services/NotificationService.js';
import NotificationToast from './components/NotificationToast.jsx';
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import DonorDashboard from './pages/DonorDashboard.jsx';
import HospitalDashboard from './pages/HospitalDashboard.jsx';
import ProfilePage from './pages/ProfilePage.jsx';

function AppContent() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (user) {
      initializeSocket(user.id);
    }
    return () => {
      if (!user) disconnectSocket();
    };
  }, [user]);

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16, animation: 'floatDrop 2s ease-in-out infinite', filter: 'drop-shadow(0 4px 12px rgba(215,38,61,0.3))' }}>🩸</div>
          <span className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <nav className="nav">
        <Link to="/" className="nav-brand">
          <span className="drop">🩸</span>
          <span style={{ color: 'var(--red)' }}>Blood</span>
          <span>Donor Finder</span>
        </Link>

        <div className="nav-right">
          {user ? (
            <>
              <Link
                to={user.role === 'hospital' ? '/hospital-dashboard' : '/donor-dashboard'}
                className="btn btn-ghost btn-sm hide-mobile"
              >
                Dashboard
              </Link>

              <div style={{ position: 'relative' }}>
                <NotificationToast />
              </div>

              <div className="nav-user-info hide-mobile">
                <div className="nav-user-name">{user.name}</div>
                <div>{user.role === 'donor' ? 'Donor' : 'Hospital'}</div>
              </div>

              <Link to="/profile" className="btn btn-ghost btn-sm" style={{ padding: 8 }}>👤</Link>

              <button className="btn btn-secondary btn-sm" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">Sign In</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
            </>
          )}
        </div>
      </nav>

      {/* Routes */}
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/donor-dashboard" element={user?.role === 'donor' ? <DonorDashboard /> : <LoginPage />} />
          <Route path="/hospital-dashboard" element={user?.role === 'hospital' ? <HospitalDashboard /> : <LoginPage />} />
          <Route path="/profile" element={user ? <ProfilePage /> : <LoginPage />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="footer">
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          <div style={{ marginBottom: 8, fontWeight: 600, color: 'var(--text)' }}>Developed by</div>
          <div className="footer-devs">
            {['Aryan Naik', 'Hitesh Wagh', 'Vaibhav Bawaskar', 'Agastya Aher'].map(n => (
              <span key={n} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--red)' }}>♥</span> {n}
              </span>
            ))}
          </div>
          <p style={{ marginTop: 8, fontSize: 11, opacity: 0.5 }}>
            Blood Donor Finder — Bridging the Gap through Technology
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
