// src/app.js

const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const session = require('express-session');

// Import your custom routes and middleware
const authRoutes = require('./routes/auth');
const controlRoutes = require('./routes/control'); // <-- 1. IMPORT the new control routes
const { requireAuth } = require('./middlewares/auth');

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware & Configuration
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // <-- IMPORTANT: Needed to parse JSON bodies from fetch requests

app.use(session({
  secret: process.env.SESSION_SECRET || 'a-default-fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24
  }
}));

// --- Routes ---

// Public auth routes (login/logout)
app.use('/', authRoutes);

// --- 2. REGISTER the new API routes ---
// Any request to /api/control/* will be handled by controlRoutes.
// The `requireAuth` middleware is applied here to protect ALL control routes at once.
app.use('/api/control', requireAuth, controlRoutes);

// Page-serving routes
app.get('/login', (req, res) => {
  res.render('login', { title: 'Login - Web Console', error: null });
});

app.get('/console', requireAuth, (req, res) => {
  res.render('console', { title: 'Web Console' });
});

app.get('/', (req, res) => {
  if (req.session && req.session.authenticated) {
    res.redirect('/console');
  } else {
    res.redirect('/login');
  }
});

// Server Startup
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});