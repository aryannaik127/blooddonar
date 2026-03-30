import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import * as api from '../services/api.js';
import { onNotification } from '../services/NotificationService.js';

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function DonorDashboard() {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState('overview');
  const [requests, setRequests] = useState([]);
  const [donations, setDonations] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((type, title, msg) => {
    setToast({ type, title, msg });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [reqs, donList, notifs, st, me] = await Promise.all([
        api.getAllRequests(),
        api.getDonations(),
        api.getNotifications(),
        api.getStats(),
        api.getMe()
      ]);
      setRequests(Array.isArray(reqs) ? reqs : []);
      setDonations(Array.isArray(donList) ? donList : []);
      setNotifications(Array.isArray(notifs) ? notifs : []);
      setStats(st);
      setProfile(me);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    const unsub = onNotification(() => fetchData());
    return () => { clearInterval(interval); unsub(); };
  }, [fetchData]);

  async function handleRespond(requestId, action) {
    try {
      await api.respondToRequest(requestId, action);
      showToast('success', action === 'accept' ? 'Accepted!' : 'Declined', action === 'accept' ? 'Thank you for volunteering to donate!' : 'Request declined.');
      await fetchData();
    } catch (err) {
      showToast('error', 'Error', err.message);
    }
  }

  async function toggleAvailability() {
    try {
      await api.toggleAvailability();
      await fetchData();
      await refreshUser();
      showToast('success', 'Updated', 'Availability status changed.');
    } catch (err) {
      showToast('error', 'Error', err.message);
    }
  }

  if (!user) return null;

  const pendingRequests = requests.filter(r => r.myStatus === 'pending');
  const respondedRequests = requests.filter(r => r.myStatus && r.myStatus !== 'pending');
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const MENU = [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'requests', icon: '🩸', label: 'Blood Requests' },
    { id: 'history', icon: '📋', label: 'Donation History' },
    { id: 'notifications', icon: '🔔', label: `Notifications${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
    { id: 'profile', icon: '👤', label: 'My Profile' },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 64px)' }}>
        <span className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            <span style={{ fontSize: 18 }}>{toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{toast.title}</div>
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>{toast.msg}</div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-user">
          <div className="bg-badge" style={{ width: 48, height: 48, fontSize: 16, marginBottom: 8 }}>{profile?.bloodGroup || '?'}</div>
          <div style={{ fontWeight: 700, fontFamily: 'Syne', fontSize: 15 }}>{user.name}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{user.email}</div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={`pulse-dot ${profile?.isAvailable ? 'green' : ''}`} />
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{profile?.isAvailable ? 'Available' : 'Unavailable'}</span>
          </div>
        </div>
        {MENU.map(m => (
          <button key={m.id} className={`sidebar-item ${tab === m.id ? 'active' : ''}`} onClick={() => setTab(m.id)}>
            <span className="icon">{m.icon}</span>{m.label}
          </button>
        ))}
        <div className="sidebar-bottom">
          <button
            className={`btn ${profile?.isAvailable ? 'btn-primary' : 'btn-secondary'}`}
            style={{ width: '100%' }}
            onClick={toggleAvailability}
          >
            {profile?.isAvailable ? '✅ Available' : '❌ Set Available'}
          </button>
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="mobile-tabs">
        {MENU.map(m => (
          <button key={m.id} className={`tab ${tab === m.id ? 'active' : ''}`} style={{ whiteSpace: 'nowrap', flex: '0 0 auto' }} onClick={() => setTab(m.id)}>
            {m.icon}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ padding: 24, overflowY: 'auto' }}>
        {tab === 'overview' && (
          <div className="fade-in">
            <div style={{ marginBottom: 24 }}>
              <div className="section-title">Donor Dashboard</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>Welcome back, {user.name}</div>
            </div>
            <div className="stats-grid" style={{ marginBottom: 24 }}>
              {[
                { icon: '🩸', value: profile?.bloodGroup || '—', label: 'Blood Group', color: 'var(--red)' },
                { icon: '⚡', value: pendingRequests.length, label: 'Pending Requests', color: 'var(--yellow)' },
                { icon: '❤️', value: donations.length, label: 'Total Donations', color: 'var(--red)' },
                { icon: '💉', value: profile?.canDonate !== false ? '✅ Ready' : `${profile?.cooldownDays || '?'}d left`, label: 'Cooldown Status', color: 'var(--blue)' },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div style={{ fontSize: 28 }}>{s.icon}</div>
                  <div className="value" style={{ color: s.color }}>{s.value}</div>
                  <div className="label">{s.label}</div>
                </div>
              ))}
            </div>

            {pendingRequests.length > 0 && (
              <div className="card" style={{ background: 'rgba(215,38,61,0.06)', border: '1px solid rgba(215,38,61,0.15)', marginBottom: 16, boxShadow: '0 4px 16px rgba(215,38,61,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 16 }}>
                  <span style={{ fontSize: 28 }}>🚨</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{pendingRequests.length} Pending Blood Request{pendingRequests.length > 1 ? 's' : ''}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Hospitals need your help! Check the Blood Requests tab.</div>
                  </div>
                  <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto', flexShrink: 0 }} onClick={() => setTab('requests')}>View →</button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'requests' && (
          <div className="fade-in">
            <div className="section-header">
              <div className="section-title">Blood Requests</div>
              {pendingRequests.length > 0 && <span className="badge badge-red">🚨 {pendingRequests.length} pending</span>}
            </div>

            {pendingRequests.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--yellow)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  ⚠️ Pending Requests
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {pendingRequests.map(req => (
                    <div key={req.id} className={`req-card ${req.urgency === 'critical' ? 'critical' : req.urgency === 'urgent' ? 'emergency' : ''}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                          <div className="bg-badge">{req.bloodGroup}</div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 17 }}>{req.hospitalName || 'Hospital'}</div>
                            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>
                              {timeAgo(req.createdAt)} {req.myDistance ? ` • ${req.myDistance} km away` : ''} {req.notes && ` • "${req.notes}"`}
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                              <span className={`badge ${req.urgency === 'critical' ? 'badge-red' : req.urgency === 'urgent' ? 'badge-yellow' : 'badge-muted'}`}>
                                {req.urgency === 'critical' ? '🚨' : req.urgency === 'urgent' ? '⚠️' : '📋'} {req.urgency}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-primary btn-sm" onClick={() => handleRespond(req.id, 'accept')}>✅ Accept</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleRespond(req.id, 'reject')}>❌ Decline</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {respondedRequests.length > 0 && (
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--muted)', marginBottom: 12 }}>Previous Responses</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {respondedRequests.map(req => (
                    <div key={req.id} className="req-card" style={{ opacity: 0.7 }}>
                      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div className="bg-badge" style={{ width: 40, height: 40, fontSize: 11 }}>{req.bloodGroup}</div>
                        <div style={{ flex: 1, minWidth: 150 }}>
                          <div style={{ fontWeight: 600 }}>{req.hospitalName || 'Hospital'}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{timeAgo(req.createdAt)}</div>
                        </div>
                        <span className={`badge ${req.myStatus === 'accepted' ? 'badge-green' : 'badge-muted'}`}>
                          {req.myStatus === 'accepted' ? '✅ Accepted' : '❌ Declined'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {requests.length === 0 && (
              <div className="empty-state">
                <div className="icon">❤️</div>
                <h3>No Blood Requests</h3>
                <p>No hospitals need your blood type at the moment. You'll be notified instantly when a match comes in.</p>
              </div>
            )}
          </div>
        )}

        {tab === 'history' && (
          <div className="fade-in">
            <div className="section-header"><div className="section-title">Donation History</div></div>
            {donations.length === 0 ? (
              <div className="empty-state">
                <div className="icon">📋</div>
                <h3>No Donation History</h3>
                <p>Your donation records will appear here after you donate blood.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {donations.map((d, i) => (
                  <div key={d.id || i} className="req-card">
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div className="bg-badge" style={{ width: 40, height: 40, fontSize: 11 }}>{d.bloodGroup}</div>
                      <div style={{ flex: 1, minWidth: 150 }}>
                        <div style={{ fontWeight: 600 }}>{d.hospitalName || 'Hospital'}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                          {new Date(d.date || d.createdAt).toLocaleDateString('en-IN')} {d.units ? `• ${d.units} unit(s)` : ''}
                        </div>
                      </div>
                      <span className="badge badge-green">✅ Donated</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'notifications' && (
          <div className="fade-in">
            <div className="section-header">
              <div className="section-title">Notifications</div>
              {unreadCount > 0 && (
                <button className="btn btn-secondary btn-sm" onClick={async () => { await api.markAllNotifsRead(); fetchData(); }}>
                  Mark All Read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="empty-state"><div className="icon">🔔</div><h3>No Notifications</h3><p>You'll be notified when hospitals need your blood type.</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {notifications.map(n => (
                  <div
                    key={n.id}
                    className="req-card"
                    style={{ background: !n.isRead ? 'rgba(215,38,61,0.05)' : undefined, cursor: !n.isRead ? 'pointer' : undefined }}
                    onClick={() => { if (!n.isRead) { api.markNotifRead(n.id); fetchData(); } }}
                  >
                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 22, flexShrink: 0 }}>{n.type === 'donor_accepted' ? '✅' : '🔔'}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, marginBottom: 2 }}>{n.title}</div>
                        <div style={{ fontSize: 13, color: 'var(--muted)' }}>{n.message}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 5 }}>{timeAgo(n.createdAt)}</div>
                      </div>
                      {!n.isRead && <span className="notif-unread-dot" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'profile' && (
          <div className="fade-in">
            <div className="section-header"><div className="section-title">My Profile</div></div>
            <div className="card">
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
                <div className="bg-badge" style={{ width: 56, height: 56, fontSize: 16 }}>{profile?.bloodGroup || '?'}</div>
                <div>
                  <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22 }}>{user.name}</div>
                  <div style={{ color: 'var(--muted)' }}>{user.email}</div>
                  <span className="badge badge-red" style={{ marginTop: 6 }}>🩸 Donor</span>
                </div>
              </div>
              <hr className="divider" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16 }}>
                {[
                  { label: 'Blood Group', value: profile?.bloodGroup, icon: '🩸' },
                  { label: 'Age', value: profile?.age ? `${profile.age} years` : '—', icon: '📅' },
                  { label: 'Gender', value: profile?.gender || '—', icon: '👤' },
                  { label: 'Contact', value: profile?.contact || '—', icon: '📞' },
                  { label: 'Location', value: profile?.location ? `${profile.location.lat?.toFixed(3)}, ${profile.location.lng?.toFixed(3)}` : 'Not set', icon: '📍' },
                  { label: 'Available', value: profile?.isAvailable ? 'Yes' : 'No', icon: '✅' },
                  { label: 'Can Donate', value: profile?.canDonate !== false ? 'Yes' : `No (${profile?.cooldownDays}d left)`, icon: '💉' },
                  { label: 'Member Since', value: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-IN') : '—', icon: '📆' },
                ].map(f => (
                  <div key={f.label} style={{ padding: 12, background: 'var(--bg2)', borderRadius: 12, border: '1px solid var(--border2)' }}>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{f.icon} {f.label}</div>
                    <div style={{ fontWeight: 600 }}>{f.value || '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
