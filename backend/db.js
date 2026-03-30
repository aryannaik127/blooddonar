// In-Memory Database for Blood Donor Finder
import { hashPassword } from './auth.js';

export const db = {
  users: [
    {
      id: 'DONOR_001',
      role: 'donor',
      email: 'aryan@demo.com',
      password: hashPassword('demo123'),
      name: 'Aryan Naik',
      age: 22,
      gender: 'male',
      bloodGroup: 'O-',
      contact: '9876543210',
      location: { lat: 19.0760, lng: 72.8777, city: 'Mumbai' },
      isAvailable: true,
      lastActive: new Date().toISOString(),
      lastDonation: '2025-10-01',
      createdAt: '2025-09-01T10:00:00Z'
    },
    {
      id: 'DONOR_002',
      role: 'donor',
      email: 'agastya@demo.com',
      password: hashPassword('demo123'),
      name: 'Agastya Aher',
      age: 21,
      gender: 'male',
      bloodGroup: 'A+',
      contact: '9876543211',
      location: { lat: 19.0800, lng: 72.8800, city: 'Mumbai' },
      isAvailable: true,
      lastActive: new Date().toISOString(),
      lastDonation: '2026-01-15',
      createdAt: '2025-08-15T10:00:00Z'
    },
    {
      id: 'DONOR_003',
      role: 'donor',
      email: 'vaibhav@demo.com',
      password: hashPassword('demo123'),
      name: 'Vaibhav Bawaskar',
      age: 23,
      gender: 'male',
      bloodGroup: 'B+',
      contact: '9876543212',
      location: { lat: 19.0650, lng: 72.8650, city: 'Mumbai' },
      isAvailable: true,
      lastActive: new Date().toISOString(),
      lastDonation: '2025-05-10',
      createdAt: '2025-07-01T10:00:00Z'
    },
    {
      id: 'HOSP_001',
      role: 'hospital',
      email: 'siem@hospital.com',
      password: hashPassword('hospital123'),
      name: 'SIEM General Hospital',
      address: 'Navi Mumbai, Maharashtra',
      contact: '022-27561234',
      location: { lat: 19.0700, lng: 72.8700, city: 'Mumbai' },
      createdAt: '2025-06-01T10:00:00Z'
    }
  ],

  bloodRequests: [],

  notifications: [],

  donationHistory: [
    { id: 'DH_001', donorId: 'DONOR_001', bloodGroup: 'O-', hospitalName: 'SIEM General Hospital', date: '2025-10-01', units: 1 },
    { id: 'DH_002', donorId: 'DONOR_002', bloodGroup: 'A+', hospitalName: 'City Hospital', date: '2026-01-15', units: 1 },
    { id: 'DH_003', donorId: 'DONOR_003', bloodGroup: 'B+', hospitalName: 'SIEM General Hospital', date: '2025-05-10', units: 1 }
  ]
};

// Helper to find user by email
export function findUserByEmail(email) {
  return db.users.find(u => u.email === email);
}

// Helper to find user by id
export function findUserById(id) {
  return db.users.find(u => u.id === id);
}

// Strip sensitive fields for API responses
export function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}
