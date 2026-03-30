import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import * as api from '../services/api.js';
import { onNotification } from '../services/NotificationService.js';

const BLOOD_GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const URGENCY_LEVELS = ['standard','urgent','critical'];

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function HospitalDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [requests, setRequests] = useState([]);
  const [donors, setDonors] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [donations, setDonations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewReq, setShowNewReq] = useState(false);
  const [reqForm, setReqForm] = useState({ bloodGroup: '', urgency: 'urgent', notes: '', radiusKm: 15 });
  const [reqLoading, setReqLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((type, title, msg) => {
    setToast({ type, title, msg });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [reqs, dons, notifs, st, hist] = await Promise.all([
        api.getRequests(), api.getDonors(), api.getNotifications(), api.getStats(), api.getDonations()
      ]);
      setRequests(reqs);
      setDonors(dons);
      setNotifications(notifs);
      setStats(st);
      setDonations(hist);
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

  async function handleCreateRequest() {
    if (!reqForm.bloodGroup) { showToast('error', 'Missing Info', 'Please select a blood group.'); return; }
    setReqLoading(true);
    try {
      const result = await api.createRequest(reqForm);
      showToast('success', 'Request Created!', `Emergency request sent to ${result.matchedCount} compatible donor(s).`);
      setShowNewReq(false);
      setReqForm({ bloodGroup: '', urgency: 'urgent', notes: '', radiusKm: 15 });
      setTab('requests');
      await fetchData();
    } catch (err) {
      showToast('error', 'Error', err.message);
    } finally {
      setReqLoading(false);
    }
  }

  async function handleCloseRequest(reqId) {
    try {
      await api.closeRequest(reqId);
      showToast('info', 'Request Closed', 'The blood request has been marked as fulfilled.');
      await fetchData();
    } catch (err) {
      showToast('error', 'Error', err.message);
    }
  }

  if (!user) return null;

  const openReqs = requests.filter(r => r.status === 'active');
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const totalAccepted = requests.reduce((s, r) => s + (r.acceptedDonors?.length || 0), 0);

  const MENU = [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'requests', icon: '🩸', label: 'My Requests' },
    { id: 'donors', icon: '👥', label: 'Available Donors' },
    { id: 'notifications', icon: '🔔', label: `Notifications${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
    { id: 'profile', icon: '🏥', label: 'Hospital Profile' },
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
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏥</div>
          <div style={{ fontWeight: 700, fontFamily: 'Syne', fontSize: 15 }}>{user.name}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{user.email}</div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="pulse-dot green" /><span style={{ fontSize: 12, color: 'var(--muted)' }}>Online</span>
          </div>
        </div>
        {MENU.map(m => (
          <button key={m.id} className={`sidebar-item ${tab === m.id ? 'active' : ''}`} onClick={() => setTab(m.id)}>
            <span className="icon">{m.icon}</span>{m.label}
          </button>
        ))}
        <div className="sidebar-bottom">
          <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowNewReq(true)}>🚨 New Request</button>
        </div>
      </div>

      {/* Mobile tabs */}
      <div className="mobile-tabs">
        {MENU.map(m => (
          <button key={m.id} className={`tab ${tab === m.id ? 'active' : ''}`} style={{ whiteSpace: 'nowrap', flex: '0 0 auto' }} onClick={() => setTab(m.id)}>
            {m.icon}
          </button>
        ))}
        <button className="btn btn-primary btn-sm" style={{ flexShrink: 0, marginLeft: 'auto' }} onClick={() => setShowNewReq(true)}>🚨 New</button>
      </div>

      {/* Main */}
      <div style={{ padding: 24, overflowY: 'auto' }}>
        {tab === 'overview' && (
          <div className="fade-in">
            <div style={{ marginBottom: 24 }}>
              <div className="section-title">Dashboard Overview</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>Welcome back, {user.name}</div>
            </div>
            <div className="stats-grid" style={{ marginBottom: 24 }}>
              {[
                { icon: '🩸', value: requests.length, label: 'Total Requests', color: 'var(--red)' },
                { icon: '⚡', value: openReqs.length, label: 'Open Requests', color: 'var(--yellow)' },
                { icon: '✅', value: totalAccepted, label: 'Donors Responded', color: 'var(--green)' },
                { icon: '👥', value: stats?.availableDonors || 0, label: 'Available Donors', color: 'var(--blue)' },
              ].map(s => (
                <div key={s.label} className="stat-card">
                  <div style={{ fontSize: 28 }}>{s.icon}</div>
                  <div className="value" style={{ color: s.color }}>{s.value}</div>
                  <div className="label">{s.label}</div>
                </div>
              ))}
            </div>
            <button className="btn btn-primary" style={{ width: '100%', padding: 14 }} onClick={() => setShowNewReq(true)}>
              🚨 Create Emergency Blood Request
            </button>
          </div>
        )}

        {tab === 'requests' && (
          <div className="fade-in">
            <div className="section-header">
              <div className="section-title">Blood Requests</div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowNewReq(true)}>🚨 New Request</button>
            </div>
            {requests.length === 0 ? (
              <div className="empty-state">
                <div className="icon">🩸</div><h3>No Requests Yet</h3>
                <p>Create your first emergency blood request to find donors.</p>
                <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setShowNewReq(true)}>Create Request</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {requests.map(req => {
                  const accepted = req.acceptedDonors || [];
                  const rejected = req.rejectedDonors || [];
                  return (
                    <div key={req.id} className={`req-card ${req.urgency === 'critical' ? 'critical' : req.urgency === 'urgent' ? 'emergency' : ''}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                          <div className="bg-badge">{req.bloodGroup}</div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 17 }}>{req.bloodGroup} Blood Request</div>
                            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>
                              {timeAgo(req.createdAt)} {req.notes && ` • "${req.notes}"`}
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                              <span className={`badge ${req.urgency === 'critical' ? 'badge-red' : req.urgency === 'urgent' ? 'badge-yellow' : 'badge-muted'}`}>
                                {req.urgency === 'critical' ? '🚨' : req.urgency === 'urgent' ? '⚠️' : '📋'} {req.urgency}
                              </span>
                              <span className={`badge ${req.status === 'active' ? 'badge-green' : 'badge-muted'}`}>
                                {req.status === 'active' ? '● Open' : '✓ Closed'}
                              </span>
                              {accepted.length > 0 && <span className="badge badge-green">✅ {accepted.length} accepted</span>}
                              {rejected.length > 0 && <span className="badge badge-muted">❌ {rejected.length} rejected</span>}
                            </div>
                          </div>
                        </div>
                        {req.status === 'active' && (
                          <button className="btn btn-secondary btn-sm" onClick={() => handleCloseRequest(req.id)}>Mark Fulfilled</button>
                        )}
                      </div>
                      {accepted.length > 0 && (
                        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border2)' }}>
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Donors who accepted</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {accepted.map(r => (
                              <div key={r.donorId} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 12px', background: 'rgba(22,163,74,0.06)', borderRadius: 8, border: '1px solid rgba(22,163,74,0.12)' }}>
                                <span className="bg-badge" style={{ width: 30, height: 30, fontSize: 10 }}>{r.bloodGroup}</span>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 600, fontSize: 14 }}>{r.donorName}</div>
                                </div>
                                <span className="badge badge-green">✅</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'donors' && (
          <div className="fade-in">
            <div className="section-header">
              <div className="section-title">Available Donors</div>
              <span className="badge badge-green">{donors.filter(d => d.isAvailable && d.canDonate).length} available</span>
            </div>
            {donors.length === 0 ? (
              <div className="empty-state"><div className="icon">👥</div><h3>No donors registered yet</h3></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {donors.map(d => (
                  <div key={d.id} className="req-card">
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div className="bg-badge" style={{ width: 44, height: 44, fontSize: 12 }}>{d.bloodGroup}</div>
                      <div style={{ flex: 1, minWidth: 150 }}>
                        <div style={{ fontWeight: 600 }}>{d.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                          {d.gender} • Age {d.age} • {d.contact}
                        </div>
                      </div>
                      <span className={`badge ${d.isAvailable && d.canDonate ? 'badge-green' : 'badge-muted'}`}>
                        {d.isAvailable && d.canDonate ? '✅ Available' : !d.canDonate ? `⏳ Cooldown: ${d.cooldownDays}d` : '❌ Unavailable'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'notifications' && (
          <div className="fade-in">
            <div className="section-header"><div className="section-title">Notifications</div></div>
            {notifications.length === 0 ? (
              <div className="empty-state"><div className="icon">🔔</div><h3>No Notifications</h3><p>Donor responses will appear here.</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {notifications.map(n => (
                  <div key={n.id} className="req-card" style={{ background: !n.isRead ? 'rgba(215,38,61,0.05)' : undefined }}>
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
            <div className="section-header"><div className="section-title">Hospital Profile</div></div>
            <div className="card">
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 20 }}>
                <span style={{ fontSize: 48 }}>🏥</span>
                <div>
                  <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 22 }}>{user.name}</div>
                  <div style={{ color: 'var(--muted)' }}>{user.email}</div>
                </div>
              </div>
              <hr className="divider" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16 }}>
                {[
                  { label: 'Address', value: user.address || '—', icon: '📍' },
                  { label: 'Contact', value: user.contact || '—', icon: '📞' },
                  { label: 'Location', value: user.location ? `${user.location.lat?.toFixed(3)}, ${user.location.lng?.toFixed(3)}` : 'Not set', icon: '🗺' },
                  { label: 'Registered', value: new Date(user.createdAt).toLocaleDateString('en-IN'), icon: '📅' },
                  { label: 'Total Requests', value: requests.length, icon: '🩸' },
                  { label: 'Donors Reached', value: totalAccepted, icon: '✅' },
                ].map(f => (
                  <div key={f.label} style={{ padding: 12, background: 'var(--bg2)', borderRadius: 12, border: '1px solid var(--border2)' }}>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{f.icon} {f.label}</div>
                    <div style={{ fontWeight: 600 }}>{f.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Request Modal */}
      {showNewReq && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowNewReq(false); }}>
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 22 }}>🚨 Emergency Blood Request</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowNewReq(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label>Blood Group Required *</label>
                <select className="input" value={reqForm.bloodGroup} onChange={e => setReqForm(f => ({ ...f, bloodGroup: e.target.value }))}>
                  <option value="">Select blood group</option>
                  {BLOOD_GROUPS.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Urgency Level *</label>
                  <select className="input" value={reqForm.urgency} onChange={e => setReqForm(f => ({ ...f, urgency: e.target.value }))}>
                    {URGENCY_LEVELS.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Search Radius (km)</label>
                  <input className="input" type="number" min={5} max={50} value={reqForm.radiusKm} onChange={e => setReqForm(f => ({ ...f, radiusKm: parseInt(e.target.value) || 15 }))} />
                </div>
              </div>
              <div className="form-group">
                <label>Additional Notes</label>
                <input className="input" placeholder="e.g. Surgery at 6 PM, urgent platelet donation..." value={reqForm.notes} onChange={e => setReqForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowNewReq(false)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleCreateRequest} disabled={reqLoading}>
                  {reqLoading ? <span className="spinner" /> : '🚨 Send Emergency Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
