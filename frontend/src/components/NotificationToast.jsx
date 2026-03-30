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

export default function NotificationToast() {
  const { user } = useAuth();
  const [showPanel, setShowPanel] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [toasts, setToasts] = useState([]);

  const fetchNotifs = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch {}
  }, [user]);

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 15000);
    const unsub = onNotification((notif) => {
      fetchNotifs();
      // Show toast for new notification
      if (notif.title) {
        const id = Date.now();
        setToasts(t => [...t, { id, title: notif.title, msg: notif.message || '' }]);
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 5000);
      }
    });
    return () => { clearInterval(interval); unsub(); };
  }, [fetchNotifs]);

  async function markAllRead() {
    try {
      await api.markAllNotifsRead();
      await fetchNotifs();
    } catch {}
  }

  if (!user) return null;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <>
      {/* Real-time toast notifications */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map(t => (
            <div key={t.id} className="toast info">
              <span style={{ fontSize: 18 }}>🔔</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{t.title}</div>
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>{t.msg}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bell */}
      <button
        className="btn btn-ghost notif-bell"
        onClick={() => setShowPanel(v => !v)}
        style={{ padding: 8, fontSize: 20 }}
      >
        🔔
        {unreadCount > 0 && <span className="notif-count">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {/* Panel */}
      {showPanel && (
        <div className="notif-panel-overlay" onClick={e => { if (e.target === e.currentTarget) setShowPanel(false); }}>
          <div className="notif-panel">
            <div className="notif-panel-header">
              <span style={{ fontFamily: 'Syne', fontWeight: 700 }}>Notifications</span>
              <button className="btn btn-ghost btn-sm" onClick={markAllRead}>Mark all read</button>
            </div>
            <div className="notif-panel-body">
              {notifications.length === 0 ? (
                <div className="empty-state" style={{ padding: 32 }}>
                  <div className="icon">🔔</div>
                  <p>No notifications</p>
                </div>
              ) : (
                notifications.slice(0, 20).map(n => (
                  <div key={n.id} className={`notif-item ${!n.isRead ? 'unread' : ''}`}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <span style={{ fontSize: 20, flexShrink: 0 }}>
                        {n.type === 'blood_request' ? '🩸' : n.type === 'donor_accepted' ? '✅' : '🔔'}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{n.title}</div>
                        <div style={{ fontSize: 13, color: 'var(--muted)', wordBreak: 'break-word' }}>{n.message}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{timeAgo(n.createdAt)}</div>
                      </div>
                      {!n.isRead && <span className="notif-unread-dot" />}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
