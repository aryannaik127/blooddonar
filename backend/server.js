import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { db, findUserByEmail, findUserById, sanitizeUser } from './db.js';
import { hashPassword, verifyPassword, generateToken, authenticateToken } from './auth.js';
import { rankDonorsForRequest, filterDonors, canDonateAgain, cooldownDaysRemaining, calculateDistance } from './algorithms.js';
import { sendBloodRequestEmail, sendDonorAcceptedEmail } from './emailService.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH'] }
});

app.use(cors());
app.use(express.json());

// ==============================
// AUTH ROUTES
// ==============================

// POST /api/auth/register
app.post('/api/auth/register', (req, res) => {
  const { email, password, role, name, age, gender, bloodGroup, contact, location, address } = req.body;

  if (!email || !password || !role || !name) {
    return res.status(400).json({ error: 'Missing required fields: email, password, role, name' });
  }

  // Block donor registration if age < 18
  if (role === 'donor') {
    const parsedAge = parseInt(age);
    if (!parsedAge || parsedAge < 18) {
      return res.status(400).json({ error: 'You must be at least 18 years old to register as a blood donor.' });
    }
  }

  if (findUserByEmail(email)) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const id = `${role === 'hospital' ? 'HOSP' : 'DONOR'}_${Date.now()}`;
  const user = {
    id,
    role,
    email,
    password: hashPassword(password),
    name,
    createdAt: new Date().toISOString()
  };

  if (role === 'donor') {
    user.age = parseInt(age);
    user.gender = gender || '';
    user.bloodGroup = bloodGroup || '';
    user.contact = contact || '';
    user.location = location || { lat: 19.076, lng: 72.877, city: 'Mumbai' };
    user.isAvailable = true;
    user.lastActive = new Date().toISOString();
    user.lastDonation = null;
  } else if (role === 'hospital') {
    user.address = address || '';
    user.contact = contact || '';
    user.location = location || { lat: 19.076, lng: 72.877, city: 'Mumbai' };
  }

  db.users.push(user);
  const token = generateToken({ id: user.id, email: user.email, role: user.role });
  io.emit('new-donor', { id: user.id, name: user.name, role: user.role });

  res.status(201).json({ success: true, token, user: sanitizeUser(user) });
});

// POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const user = findUserByEmail(email);
  if (!user || !verifyPassword(password, user.password)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Update last active for donors
  if (user.role === 'donor') {
    user.lastActive = new Date().toISOString();
  }

  const token = generateToken({ id: user.id, email: user.email, role: user.role });
  res.json({ success: true, token, user: sanitizeUser(user) });
});

// GET /api/auth/me — get current user profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  const data = sanitizeUser(user);
  if (user.role === 'donor') {
    data.cooldownDays = cooldownDaysRemaining(user.lastDonation);
    data.canDonate = canDonateAgain(user.lastDonation);
  }
  res.json(data);
});

// ==============================
// PROFILE ROUTES
// ==============================

// PUT /api/profile — update user profile
app.put('/api/profile', authenticateToken, (req, res) => {
  const user = findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { name, age, bloodGroup, contact, location, address, isAvailable } = req.body;
  if (name !== undefined) user.name = name;
  if (contact !== undefined) user.contact = contact;
  if (location !== undefined) user.location = location;

  if (user.role === 'donor') {
    if (age !== undefined) user.age = age;
    if (bloodGroup !== undefined) user.bloodGroup = bloodGroup;
    if (isAvailable !== undefined) user.isAvailable = isAvailable;
    user.lastActive = new Date().toISOString();
  }

  if (user.role === 'hospital') {
    if (address !== undefined) user.address = address;
  }

  res.json({ success: true, user: sanitizeUser(user) });
});

// ==============================
// DONOR ROUTES
// ==============================

// GET /api/donors — list active donors (for hospitals)
app.get('/api/donors', (req, res) => {
  const { bloodGroup, city, radius, lat, lng } = req.query;

  let donors = db.users.filter(u => u.role === 'donor');

  if (bloodGroup || city || radius) {
    donors = filterDonors(donors, {
      bloodGroup,
      city,
      radiusKm: radius ? parseFloat(radius) : null,
      centerLat: lat ? parseFloat(lat) : null,
      centerLng: lng ? parseFloat(lng) : null
    });
  }

  const result = donors.map(d => {
    const safe = sanitizeUser(d);
    safe.canDonate = canDonateAgain(d.lastDonation);
    safe.cooldownDays = cooldownDaysRemaining(d.lastDonation);
    return safe;
  });

  res.json(result);
});

// PATCH /api/donors/availability — toggle availability
app.patch('/api/donors/availability', authenticateToken, (req, res) => {
  const user = findUserById(req.user.id);
  if (!user || user.role !== 'donor') return res.status(403).json({ error: 'Not a donor' });

  user.isAvailable = !user.isAvailable;
  user.lastActive = new Date().toISOString();
  res.json({ success: true, isAvailable: user.isAvailable });
});

// ==============================
// BLOOD REQUEST ROUTES
// ==============================

// POST /api/requests — hospital creates a blood request
app.post('/api/requests', authenticateToken, (req, res) => {
  const hospital = findUserById(req.user.id);
  if (!hospital || hospital.role !== 'hospital') {
    return res.status(403).json({ error: 'Only hospitals can create blood requests' });
  }

  const { bloodGroup, urgency, radiusKm, notes } = req.body;
  if (!bloodGroup) return res.status(400).json({ error: 'Blood group is required' });

  const request = {
    id: `REQ_${Date.now()}`,
    hospitalId: hospital.id,
    hospitalName: hospital.name,
    bloodGroup,
    urgency: urgency || 'standard',
    isEmergency: urgency === 'critical',
    location: hospital.location,
    radiusKm: radiusKm || 15,
    notes: notes || '',
    status: 'active',
    matchedDonors: [],
    acceptedDonors: [],
    rejectedDonors: [],
    createdAt: new Date().toISOString()
  };

  // Find matching donors
  const allDonors = db.users.filter(u => u.role === 'donor');
  const ranked = rankDonorsForRequest(request, allDonors, request.radiusKm);

  request.matchedDonors = ranked.map(d => ({
    donorId: d.id,
    donorName: d.name,
    bloodGroup: d.bloodGroup,
    distance: d.distance,
    status: 'pending'
  }));

  db.bloodRequests.push(request);

  // Send notifications to matched donors
  ranked.forEach(donor => {
    const notification = {
      id: `NOTIF_${Date.now()}_${donor.id}`,
      type: 'blood_request',
      recipientId: donor.id,
      requestId: request.id,
      title: `${urgency === 'critical' ? '🚨 EMERGENCY' : '🩸 Blood Request'}: ${bloodGroup} Needed`,
      message: `${hospital.name} needs ${bloodGroup} blood. You are ${donor.distance} km away.`,
      urgency: request.urgency,
      hospitalName: hospital.name,
      bloodGroup,
      distance: donor.distance,
      isRead: false,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    db.notifications.push(notification);

    // Real-time push via Socket.io
    io.emit(`notification_${donor.id}`, notification);

    // Send email notification
    sendBloodRequestEmail(donor.email, donor.name, hospital.name, bloodGroup, request.urgency);
  });

  // Broadcast to all dashboards
  io.emit('new-request', { requestId: request.id, bloodGroup, urgency: request.urgency, hospitalName: hospital.name });

  res.status(201).json({ success: true, request, matchedCount: ranked.length });
});

// GET /api/requests — get blood requests
app.get('/api/requests', authenticateToken, (req, res) => {
  const user = findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (user.role === 'hospital') {
    // Hospital sees their own requests
    const requests = db.bloodRequests.filter(r => r.hospitalId === user.id);
    return res.json(requests);
  }

  if (user.role === 'donor') {
    // Donor sees requests where they are matched
    const requests = db.bloodRequests
      .filter(r => r.status === 'active' && r.matchedDonors.some(m => m.donorId === user.id))
      .map(r => {
        const myMatch = r.matchedDonors.find(m => m.donorId === user.id);
        return { ...r, myStatus: myMatch?.status, myDistance: myMatch?.distance };
      });
    return res.json(requests);
  }

  res.json([]);
});

// GET /api/requests/all — get all active requests (public view)
app.get('/api/requests/all', (req, res) => {
  const active = db.bloodRequests
    .filter(r => r.status === 'active')
    .map(r => ({
      id: r.id,
      hospitalName: r.hospitalName,
      bloodGroup: r.bloodGroup,
      urgency: r.urgency,
      isEmergency: r.isEmergency,
      location: r.location,
      matchedCount: r.matchedDonors.length,
      acceptedCount: r.acceptedDonors.length,
      createdAt: r.createdAt
    }));
  res.json(active);
});

// POST /api/requests/:id/respond — donor accepts or rejects
app.post('/api/requests/:id/respond', authenticateToken, (req, res) => {
  const donor = findUserById(req.user.id);
  if (!donor || donor.role !== 'donor') return res.status(403).json({ error: 'Not a donor' });

  const { action } = req.body; // 'accept' or 'reject'
  if (!['accept', 'reject'].includes(action)) return res.status(400).json({ error: 'Action must be accept or reject' });

  const request = db.bloodRequests.find(r => r.id === req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });

  const matchEntry = request.matchedDonors.find(m => m.donorId === donor.id);
  if (!matchEntry) return res.status(403).json({ error: 'You are not matched to this request' });

  matchEntry.status = action === 'accept' ? 'accepted' : 'rejected';

  if (action === 'accept') {
    request.acceptedDonors.push({ donorId: donor.id, donorName: donor.name, bloodGroup: donor.bloodGroup, acceptedAt: new Date().toISOString() });
    
    // Add donation history entry
    const historyEntry = {
      id: `DH_${Date.now()}`,
      donorId: donor.id,
      bloodGroup: donor.bloodGroup,
      hospitalName: request.hospitalName,
      requestId: request.id,
      date: new Date().toISOString().split('T')[0],
      units: 1
    };
    db.donationHistory.push(historyEntry);

    // Update last donation date for cooldown
    donor.lastDonation = historyEntry.date;

    // Notify hospital
    const hospitalNotif = {
      id: `NOTIF_${Date.now()}_${request.hospitalId}`,
      type: 'donor_accepted',
      recipientId: request.hospitalId,
      requestId: request.id,
      title: '✅ Donor Accepted',
      message: `${donor.name} (${donor.bloodGroup}) accepted your blood request.`,
      donorName: donor.name,
      bloodGroup: donor.bloodGroup,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    db.notifications.push(hospitalNotif);
    io.emit(`notification_${request.hospitalId}`, hospitalNotif);

    // Send email notification to hospital
    const hospital = findUserById(request.hospitalId);
    if (hospital) {
      sendDonorAcceptedEmail(hospital.email, hospital.name, donor.name, donor.bloodGroup);
    }
  } else {
    request.rejectedDonors.push({ donorId: donor.id, rejectedAt: new Date().toISOString() });
  }

  // Notify the request channel
  io.emit(`request_${request.id}`, { requestId: request.id, donorId: donor.id, action });

  res.json({ success: true, action, requestId: request.id });
});

// PATCH /api/requests/:id/close — hospital closes a request
app.patch('/api/requests/:id/close', authenticateToken, (req, res) => {
  const hospital = findUserById(req.user.id);
  if (!hospital || hospital.role !== 'hospital') return res.status(403).json({ error: 'Not a hospital' });

  const request = db.bloodRequests.find(r => r.id === req.params.id && r.hospitalId === hospital.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });

  request.status = 'closed';
  request.closedAt = new Date().toISOString();

  io.emit('request-closed', { requestId: request.id });
  res.json({ success: true, request });
});

// ==============================
// NOTIFICATION ROUTES
// ==============================

// GET /api/notifications — get user's notifications
app.get('/api/notifications', authenticateToken, (req, res) => {
  const notifs = db.notifications
    .filter(n => n.recipientId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(notifs);
});

// PATCH /api/notifications/:id/read — mark as read
app.patch('/api/notifications/:id/read', authenticateToken, (req, res) => {
  const notif = db.notifications.find(n => n.id === req.params.id && n.recipientId === req.user.id);
  if (!notif) return res.status(404).json({ error: 'Notification not found' });
  notif.isRead = true;
  res.json({ success: true });
});

// PATCH /api/notifications/read-all — mark all as read
app.patch('/api/notifications/read-all', authenticateToken, (req, res) => {
  db.notifications
    .filter(n => n.recipientId === req.user.id)
    .forEach(n => { n.isRead = true; });
  res.json({ success: true });
});

// ==============================
// DONATION HISTORY
// ==============================

// GET /api/donations — get donation history
app.get('/api/donations', authenticateToken, (req, res) => {
  const user = findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (user.role === 'donor') {
    const history = db.donationHistory.filter(d => d.donorId === user.id);
    return res.json(history);
  }

  // Hospitals see all donations related to their requests
  const hospitalRequests = db.bloodRequests.filter(r => r.hospitalId === user.id).map(r => r.id);
  const history = db.donationHistory.filter(d => hospitalRequests.includes(d.requestId));
  res.json(history);
});

// ==============================
// STATS
// ==============================

app.get('/api/stats', (req, res) => {
  const totalDonors = db.users.filter(u => u.role === 'donor').length;
  const availableDonors = db.users.filter(u => u.role === 'donor' && u.isAvailable).length;
  const totalRequests = db.bloodRequests.length;
  const activeRequests = db.bloodRequests.filter(r => r.status === 'active').length;
  const totalDonations = db.donationHistory.length;
  res.json({ totalDonors, availableDonors, totalRequests, activeRequests, totalDonations });
});

// ==============================
// SOCKET.IO
// ==============================

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('register-user', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room`);
  });
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// ==============================
// START SERVER
// ==============================

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n  🩸 Blood Donor Finder API`);
  console.log(`  ========================`);
  console.log(`  Server running on http://localhost:${PORT}`);
  console.log(`  Demo accounts:`);
  console.log(`    Donor:    aryan@demo.com / demo123`);
  console.log(`    Hospital: siem@hospital.com / hospital123\n`);
});
