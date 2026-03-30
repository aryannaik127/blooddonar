import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('role') || 'donor';

  const [role, setRole] = useState(initialRole);
  const [loading, setLoading] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    age: '', gender: '', bloodGroup: '', contact: '',
    address: '',
    lat: null, lng: null, locationLabel: ''
  });

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); }

  function getLocation() {
    if (!navigator.geolocation) {
      setErrors(e => ({ ...e, location: 'Geolocation not supported by your browser.' }));
      return;
    }
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setForm(f => ({ ...f, lat, lng, locationLabel: `${lat.toFixed(4)}, ${lng.toFixed(4)}` }));
        setErrors(e => ({ ...e, location: '' }));
        setLocLoading(false);
      },
      () => {
        setErrors(e => ({ ...e, location: 'Location access denied. Please allow GPS access.' }));
        setLocLoading(false);
      }
    );
  }

  function validate() {
    const e = {};
    if (role === 'donor') {
      if (!form.name.trim()) e.name = 'Name is required';
      if (!form.age) e.age = 'Age is required';
      else if (parseInt(form.age) < 18) e.age = 'You must be at least 18 years old to register as a donor';
      else if (parseInt(form.age) > 80) e.age = 'Please enter a valid age';
      if (!form.gender) e.gender = 'Gender is required';
      if (!form.bloodGroup) e.bloodGroup = 'Blood group is required';
      if (!form.contact.trim()) e.contact = 'Contact number is required';
    }
    if (role === 'hospital') {
      if (!form.name.trim()) e.name = 'Hospital name is required';
      if (!form.address.trim()) e.address = 'Address is required';
      if (!form.contact.trim()) e.contact = 'Contact number is required';
    }
    if (!form.email.trim() || !form.email.includes('@')) e.email = 'Valid email required';
    if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!form.lat || !form.lng) e.location = 'Location is required for accurate matching';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        email: form.email,
        password: form.password,
        role,
        name: form.name,
        contact: form.contact,
        location: { lat: form.lat, lng: form.lng, city: 'Auto-detected' }
      };
      if (role === 'donor') {
        payload.age = parseInt(form.age);
        payload.gender = form.gender;
        payload.bloodGroup = form.bloodGroup;
      }
      if (role === 'hospital') {
        payload.address = form.address;
      }
      const data = await register(payload);
      const userRole = data.user?.role;
      navigate(userRole === 'hospital' ? '/hospital-dashboard' : '/donor-dashboard');
    } catch (err) {
      setErrors({ email: err.message || 'Registration failed' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
      {/* Abstract background shapes */}
      <div style={{ position: 'absolute', top: '5%', left: '-8%', width: 280, height: 280, borderRadius: '40% 60% 60% 40% / 60% 40% 60% 40%', background: 'rgba(215,38,61,0.04)', animation: 'morphShape1 14s ease-in-out infinite', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-5%', right: '-5%', width: 220, height: 220, borderRadius: '70% 30% 30% 70%', background: 'rgba(215,38,61,0.05)', animation: 'morphShape2 18s ease-in-out infinite', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 520, position: 'relative', zIndex: 1 }} className="fade-in">
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 48, marginBottom: 10, filter: 'drop-shadow(0 4px 12px rgba(215,38,61,0.25))' }}>🩸</div>
          <h2 style={{ fontSize: 28, fontWeight: 800 }}>Join Blood Donor Finder</h2>
          <p style={{ color: 'var(--muted)', marginTop: 6 }}>Create your account today</p>
        </div>

        <div className="tabs" style={{ marginBottom: 24 }}>
          <button className={`tab ${role === 'donor' ? 'active' : ''}`} onClick={() => setRole('donor')} type="button">🩸 Donor</button>
          <button className={`tab ${role === 'hospital' ? 'active' : ''}`} onClick={() => setRole('hospital')} type="button">🏥 Hospital</button>
        </div>

        <form className="card card-glow" onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Donor-specific fields */}
            {role === 'donor' && (
              <>
                <div className="form-group">
                  <label>Full Name *</label>
                  <input className="input" placeholder="Enter your full name" value={form.name} onChange={e => set('name', e.target.value)} />
                  {errors.name && <div className="form-error">{errors.name}</div>}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Age * (must be 18+)</label>
                    <input className="input" type="number" placeholder="Age (18+)" value={form.age} onChange={e => set('age', e.target.value)} min={1} max={120} />
                    {errors.age && <div className="form-error">{errors.age}</div>}
                  </div>
                  <div className="form-group">
                    <label>Gender *</label>
                    <select className="input" value={form.gender} onChange={e => set('gender', e.target.value)}>
                      <option value="">Select</option>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                    {errors.gender && <div className="form-error">{errors.gender}</div>}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Blood Group *</label>
                    <select className="input" value={form.bloodGroup} onChange={e => set('bloodGroup', e.target.value)}>
                      <option value="">Select</option>
                      {BLOOD_GROUPS.map(b => <option key={b}>{b}</option>)}
                    </select>
                    {errors.bloodGroup && <div className="form-error">{errors.bloodGroup}</div>}
                  </div>
                  <div className="form-group">
                    <label>Contact Number *</label>
                    <input className="input" placeholder="+91 XXXXXXXXXX" value={form.contact} onChange={e => set('contact', e.target.value)} />
                    {errors.contact && <div className="form-error">{errors.contact}</div>}
                  </div>
                </div>
              </>
            )}

            {/* Hospital-specific fields */}
            {role === 'hospital' && (
              <>
                <div className="form-group">
                  <label>Hospital Name *</label>
                  <input className="input" placeholder="Enter hospital name" value={form.name} onChange={e => set('name', e.target.value)} />
                  {errors.name && <div className="form-error">{errors.name}</div>}
                </div>
                <div className="form-group">
                  <label>Address *</label>
                  <input className="input" placeholder="Full hospital address" value={form.address} onChange={e => set('address', e.target.value)} />
                  {errors.address && <div className="form-error">{errors.address}</div>}
                </div>
                <div className="form-group">
                  <label>Contact Number *</label>
                  <input className="input" placeholder="+91 XXXXXXXXXX" value={form.contact} onChange={e => set('contact', e.target.value)} />
                  {errors.contact && <div className="form-error">{errors.contact}</div>}
                </div>
              </>
            )}

            {/* Common fields */}
            <div className="form-group">
              <label>Email Address *</label>
              <input className="input" type="email" placeholder="your@email.com" value={form.email} onChange={e => set('email', e.target.value)} autoComplete="email" />
              {errors.email && <div className="form-error">{errors.email}</div>}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Password *</label>
                <input className="input" type="password" placeholder="Min 6 characters" value={form.password} onChange={e => set('password', e.target.value)} autoComplete="new-password" />
                {errors.password && <div className="form-error">{errors.password}</div>}
              </div>
              <div className="form-group">
                <label>Confirm Password *</label>
                <input className="input" type="password" placeholder="Repeat password" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} autoComplete="new-password" />
                {errors.confirmPassword && <div className="form-error">{errors.confirmPassword}</div>}
              </div>
            </div>

            {/* Location */}
            <div className="form-group">
              <label>📍 Location (GPS) *</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <input className="input" readOnly placeholder="Click to get your location" value={form.locationLabel} style={{ flex: 1, cursor: 'default' }} />
                <button className="btn btn-secondary btn-sm" type="button" style={{ flexShrink: 0 }} onClick={getLocation} disabled={locLoading}>
                  {locLoading ? <span className="spinner" /> : '📍 Get'}
                </button>
              </div>
              {errors.location && <div className="form-error">{errors.location}</div>}
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                📌 Location is used to match you with nearby {role === 'donor' ? 'requests' : 'donors'}. We ask for your permission before accessing GPS.
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%', padding: 14 }} disabled={loading}>
              {loading ? <span className="spinner" /> : 'Create Account →'}
            </button>

            <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
              Already have an account?{' '}
              <Link to="/login" className="btn btn-ghost btn-sm" style={{ padding: '2px 8px' }}>Sign In</Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
