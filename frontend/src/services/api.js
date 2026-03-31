// ============================================
// Blood Donor Finder — Centralized API Client
// ============================================

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Log the API base URL in development for debugging
if (import.meta.env.DEV) {
  console.log('🔗 API Base URL:', API_BASE);
}

function getToken() {
  return localStorage.getItem('bdf_token');
}

export function setToken(token) {
  localStorage.setItem('bdf_token', token);
}

export function clearToken() {
  localStorage.removeItem('bdf_token');
}

/**
 * Returns a user-friendly error message for network-level failures.
 */
function getFriendlyNetworkError(err) {
  const msg = err.message || '';
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('ERR_CONNECTION_REFUSED') || msg.includes('Load failed')) {
    // Check if we're hitting localhost in production
    if (API_BASE.includes('localhost') && typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
      return 'Backend server is not configured. The app is trying to reach localhost from a deployed site. Please set the VITE_API_URL environment variable in Vercel to your Render backend URL.';
    }
    return 'Cannot connect to the server. The backend may be starting up (takes ~30s on free tier) or is offline. Please try again in a moment.';
  }
  return null;
}

async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  } catch (err) {
    // Network-level error (server unreachable, CORS, DNS, etc.)
    const friendly = getFriendlyNetworkError(err);
    throw new Error(friendly || `Network error: ${err.message}`);
  }

  let data;
  try {
    data = await res.json();
  } catch {
    // Server returned non-JSON (e.g. HTML error page, 502 gateway)
    throw new Error(`Server returned an invalid response (HTTP ${res.status}). The backend may be restarting.`);
  }

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

// ── Health Check ─────────────────────────────
export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE}/stats`, { signal: AbortSignal.timeout(8000) });
    return res.ok;
  } catch {
    return false;
  }
}

export function getApiBaseUrl() {
  return API_BASE;
}

export function isUsingLocalhost() {
  return API_BASE.includes('localhost') && typeof window !== 'undefined' && !window.location.hostname.includes('localhost');
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
