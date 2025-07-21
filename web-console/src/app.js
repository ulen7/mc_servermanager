// src/app.js

// Import necessary modules
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const session = require('express-session');

// --- 1. IMPORT YOUR NEW ROUTE HANDLER ---
const authRoutes = require('./routes/auth');
const { requireAuth } = require('./middlewares/auth');

// Load environment variables from .env file
dotenv.config();

// Initialize the Express application
const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware & Configuration ---

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// --- 2. ADD MIDDLEWARE TO SERVE CSS and PARSE THE FORM ---
// Serve static files (like style.css) from the "public" directory
app.use(express.static(path.join(__dirname, '../public')));
// Middleware to parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({ extended: true }));

// Session configuration
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

// --- 3. REGISTER THE AUTH ROUTES WITH THE APP ---
// This tells Express to use the handlers from auth.js (like POST /login)
app.use('/', authRoutes);

// This route now primarily serves the EJS template.
// The POST logic is handled by the router above.
app.get('/login', (req, res) => {
  // Pass an empty error object so the template doesn't crash
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

// --- Server Startup ---
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});