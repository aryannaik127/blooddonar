import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket = null;
const listeners = new Set();

export function initializeSocket(userId) {
  if (socket) disconnectSocket();

  // Don't try to connect to localhost from a deployed site
  if (SOCKET_URL.includes('localhost') && typeof window !== 'undefined' && !window.location.hostname.includes('localhost')) {
    console.warn('⚠️ Socket.io: Skipping connection — VITE_SOCKET_URL not configured for production');
    return;
  }

  try {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 10000
    });

    socket.on('connect', () => {
      console.log('🔌 Socket connected:', socket.id);
      socket.emit('register-user', userId);
    });

    // Listen for personal notifications
    socket.on(`notification_${userId}`, (notification) => {
      console.log('🔔 Notification received:', notification);
      listeners.forEach(cb => cb(notification));
    });

    // Listen for new requests (global broadcast)
    socket.on('new-request', (data) => {
      listeners.forEach(cb => cb({ type: 'new-request', ...data }));
    });

    // Listen for request updates
    socket.on('request-closed', (data) => {
      listeners.forEach(cb => cb({ type: 'request-closed', ...data }));
    });

    socket.on('connect_error', (err) => {
      console.warn('🔌 Socket connection error:', err.message);
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });
  } catch (err) {
    console.warn('🔌 Failed to initialize socket:', err.message);
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function onNotification(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function isConnected() {
  return socket?.connected || false;
}
