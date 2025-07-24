// src/routes/auth.js

const express = require('express');
const router = express.Router();

/**
 * @route   POST /login
 * @desc    Authenticates a user based on credentials from .env file
 * @access  Public
 */
router.post('/login', (req, res) => {
  // Get username and password from the request body
  const { username, password } = req.body;

  // Retrieve admin credentials from environment variables
  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASS;

  // Check if submitted credentials match the environment variables
  if (username === adminUser && password === adminPass) {
    // If credentials are correct, set a session variable to mark the user as authenticated.
    req.session.authenticated = true;
    // Redirect the user to the protected console page.
    res.redirect('/console');
  } else {
    // If credentials are incorrect, redirect back to the login page.
    // In a real app, you'd want to show an error message.
    res.redirect('/login');
  }
});

/**
 * @route   GET /logout
 * @desc    Logs the user out by destroying the session
 * @access  Private
 */
router.get('/logout', (req, res) => {
  // The session is destroyed.
  req.session.destroy(err => {
    if (err) {
      // Handle potential errors during session destruction
      console.error("Error destroying session:", err);
      return res.redirect('/console'); // Or an error page
    }
    // After destroying the session, redirect to the login page.
    res.redirect('/login');
  });
});

module.exports = router;
