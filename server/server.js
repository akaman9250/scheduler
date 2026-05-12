const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

const connectDB = require('./config/db');

// Load env vars
dotenv.config();

// Connect database
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

const app = express();

/* =========================
   MIDDLEWARE
========================= */

// Since frontend + backend are same domain on Render,
// simple CORS is enough
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   REQUEST LOGGER
========================= */

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

/* =========================
   HEALTH CHECK
========================= */

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'Server running',
    timestamp: new Date().toISOString(),
  });
});

/* =========================
   API ROUTES
========================= */

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/schedules', require('./routes/schedules'));
app.use('/api/leaves', require('./routes/leaves'));
app.use('/api/stats', require('./routes/stats'));
app.use('/api/notifications', require('./routes/notifications'));


/* =========================
   SERVE FRONTEND
========================= */

if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../client/dist');

  // Serve static frontend files
  app.use(express.static(clientBuildPath));

  // React routing support
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

/* =========================
   ERROR HANDLER
========================= */

app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', err);

  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

/* =========================
   GLOBAL ERROR CATCHERS
========================= */

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

/* =========================
   START SERVER
========================= */

const PORT = process.env.PORT || 5001;

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

module.exports = app;