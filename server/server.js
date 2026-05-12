const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect database
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

const app = express();

/* =========================
   CORS CONFIG
========================= */
const allowedOrigins = [
  'https://scheduler-1-d14j.onrender.com',
  'https://scheduler-6exa.onrender.com',
  'http://localhost:5173',
  'http://localhost:5001',
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin
    // (mobile apps, postman, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null,false);
    }
  },

  credentials: true,

  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],

  allowedHeaders: [
    'Content-Type',
    'Authorization',
  ],
};

// Apply CORS
app.use(cors(corsOptions));

// Handle preflight requests
app.options(/.*/, cors(corsOptions));

/* =========================
   MIDDLEWARE
========================= */
app.use(express.json());

/* =========================
   HEALTH CHECK
========================= */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server running',
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
app.use('/api/seed', require('./routes/seed'));

/* =========================
   FRONTEND SERVE
========================= */
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../client/dist');

  if (fs.existsSync(clientBuildPath)) {
    app.use(express.static(clientBuildPath));

    app.get('*', (req, res) => {
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
  } else {
    console.warn('⚠ client/dist not found');

    app.get('*', (req, res) => {
      res.status(404).json({
        message: 'Frontend build not found',
      });
    });
  }
}

/* =========================
   ERROR HANDLER
========================= */
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);

  res.status(500).json({
    success: false,
    message: err.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
    }),
  });
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
