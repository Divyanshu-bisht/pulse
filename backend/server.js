require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const sourceRoutes = require('./routes/sources');
const ruleRoutes = require('./routes/rules');
const alertRoutes = require('./routes/alerts');
const buildEventRoutes = require('./routes/events');
const settingsRoutes = require('./routes/settings');
const { startRetentionJob } = require('./services/retention');

const app = express();
const server = http.createServer(app);

// CORS is locked to your actual frontend URL, not left open to any origin --
// important once this is deployed publicly, not just running on localhost.
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';
const io = new Server(server, { cors: { origin: CLIENT_URL } });

app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());
app.use(morgan('combined')); // structured request logging, useful for debugging in production

// Rate limiting: without this, anyone (or a leaked sourceKey, or a broken
// script) could hammer these endpoints. Ingest is limited per-IP fairly
// generously since a real agent posts every few seconds; auth is limited
// more strictly since login/signup abuse is a common attack vector.
const ingestLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, message: { error: 'Too many requests, slow down.' } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many attempts, try again later.' } });

app.use('/api/events/ingest', ingestLimiter);
app.use('/api/auth', authLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/sources', sourceRoutes);
app.use('/api/rules', ruleRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/events', buildEventRoutes(io));
app.use('/api/settings', settingsRoutes);

// Health check -- hosting platforms (and you, manually) can hit this to
// confirm the backend and its DB connection are actually alive.
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState; // 1 = connected
  res.json({
    status: dbState === 1 ? 'ok' : 'degraded',
    db: dbState === 1 ? 'connected' : 'not connected',
    uptimeSeconds: Math.round(process.uptime()),
  });
});

app.get('/', (req, res) => res.json({ status: 'Pulse backend running' }));

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('No token'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  socket.join(`user:${socket.userId}`);
  console.log(`Socket connected for user ${socket.userId}`);
  socket.on('disconnect', () => {
    console.log(`Socket disconnected for user ${socket.userId}`);
  });
});

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    startRetentionJob();
    server.listen(PORT, () => console.log(`Pulse backend listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
