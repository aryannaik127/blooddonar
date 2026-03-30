// ============================================
// Blood Donor Finder — Centralized API Client
// ============================================

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('bdf_token');
}

export function setToken(token) {
  localStorage.setItem('bdf_token', token);
}

export function clearToken() {
  localStorage.removeItem('bdf_token');
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    // If the backend restarted or the token is invalid/expired
    if (res.status === 401 || res.status === 403) {
      const err = data.error;
      if (err === 'User session expired or user deleted.' || err === 'User not found' || err === 'Invalid or expired token.' || err === 'Access denied. No token provided.') {
        clearToken();
        window.location.href = '/login';
        return;
      }
    }
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}

// ── Auth ──────────────────────────────────
export async function login(email, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  if (data.token) setToken(data.token);
  return data;
}

export async function register(payload) {
  const data = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (data.token) setToken(data.token);
  return data;
}

export async function getMe() {
  return request('/auth/me');
}

// ── Profile ──────────────────────────────
export async function updateProfile(payload) {
  return request('/profile', {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

// ── Donors ───────────────────────────────
export async function getDonors(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return request(`/donors${qs ? '?' + qs : ''}`);
}

export async function toggleAvailability() {
  return request('/donors/availability', { method: 'PATCH' });
}

// ── Blood Requests ───────────────────────
export async function getRequests() {
  return request('/requests');
}

export async function getAllRequests() {
  return request('/requests/all');
}

export async function createRequest(payload) {
  return request('/requests', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function respondToRequest(requestId, action) {
  return request(`/requests/${requestId}/respond`, {
    method: 'POST',
    body: JSON.stringify({ action })
  });
}

export async function closeRequest(requestId) {
  return request(`/requests/${requestId}/close`, { method: 'PATCH' });
}

// ── Notifications ────────────────────────
export async function getNotifications() {
  return request('/notifications');
}

export async function markNotifRead(notifId) {
  return request(`/notifications/${notifId}/read`, { method: 'PATCH' });
}

export async function markAllNotifsRead() {
  return request('/notifications/read-all', { method: 'PATCH' });
}

// ── Donation History ─────────────────────
export async function getDonations() {
  return request('/donations');
}

// ── Stats ────────────────────────────────
export async function getStats() {
  return request('/stats');
}
