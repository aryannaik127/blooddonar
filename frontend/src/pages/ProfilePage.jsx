import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import * as api from '../services/api.js';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  if (!user) return null;

  function startEdit() {
    setForm({
      name: user.name || '',
      contact: user.contact || '',
      address: user.address || '',
      age: user.age || '',
      bloodGroup: user.bloodGroup || '',
    });
    setEditing(true);
  }

  async function save() {
    setLoading(true);
    try {
      await api.updateProfile(form);
      await refreshUser();
      setEditing(false);
      setToast({ type: 'success', msg: 'Profile updated successfully!' });
      setTimeout(() => setToast(null), 3000);
    } catch (err) {
      setToast({ type: 'error', msg: err.message });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
    }
  }

  const fields = user.role === 'donor' ? [
    { label: 'Blood Group', value: user.bloodGroup, icon: '🩸' },
    { label: 'Age', value: `${user.age} years`, icon: '📅' },
    { label: 'Gender', value: user.gender, icon: '👤' },
    { label: 'Contact', value: user.contact, icon: '📞' },
    { label: 'Location', value: user.location ? `${user.location.lat?.toFixed(3)}, ${user.location.lng?.toFixed(3)}` : 'Not set', icon: '📍' },
    { label: 'Member Since', value: new Date(user.createdAt).toLocaleDateString('en-IN'), icon: '📆' },
    { label: 'Available', value: user.isAvailable ? 'Yes' : 'No', icon: '✅' },
    { label: 'Can Donate', value: user.canDonate !== false ? 'Yes' : `No (${user.cooldownDays}d left)`, icon: '💉' },
  ] : [
    { label: 'Address', value: user.address, icon: '📍' },
    { label: 'Contact', value: user.contact, icon: '📞' },
    { label: 'Location', value: user.location ? `${user.location.lat?.toFixed(3)}, ${user.location.lng?.toFixed(3)}` : 'Not set', icon: '🗺' },
    { label: 'Member Since', value: new Date(user.createdAt).toLocaleDateString('en-IN'), icon: '📆' },
  ];

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 24 }} className="fade-in">
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            <span>{toast.type === 'success' ? '✅' : '❌'}</span>
            <div style={{ fontSize: 14 }}>{toast.msg}</div>
          </div>
        </div>
      )}

      <div className="section-header">
        <div className="section-title">My Profile</div>
        {!editing && <button className="btn btn-secondary btn-sm" onClick={startEdit}>✏️ Edit</button>}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {user.role === 'donor' ? (
            <div className="bg-badge" style={{ width: 64, height: 64, fontSize: 18 }}>{user.bloodGroup}</div>
          ) : (
            <span style={{ fontSize: 48 }}>🏥</span>
          )}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22 }}>{user.name}</div>
            <div style={{ color: 'var(--muted)', marginTop: 2 }}>{user.email}</div>
            <span className={`badge ${user.role === 'donor' ? 'badge-red' : 'badge-blue'}`} style={{ marginTop: 8 }}>
              {user.role === 'donor' ? '🩸 Donor' : '🏥 Hospital'}
            </span>
          </div>
        </div>

        <hr className="divider" />

        {!editing ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16 }}>
            {fields.map(f => (
              <div key={f.label} style={{ padding: 12, background: 'var(--bg2)', borderRadius: 12, border: '1px solid var(--border2)' }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{f.icon} {f.label}</div>
                <div style={{ fontWeight: 600 }}>{f.value || '—'}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="form-group">
              <label>Name</label>
              <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Contact</label>
              <input className="input" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} />
            </div>
            {user.role === 'hospital' && (
              <div className="form-group">
                <label>Address</label>
                <input className="input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setEditing(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={save} disabled={loading}>
                {loading ? <span className="spinner" /> : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
