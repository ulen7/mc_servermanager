// src/app.js

// Import necessary modules
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env file
// This will look for a .env file in the root of the project
dotenv.config();

// Initialize the Express application
const app = express();

// Set the port for the application.
// It will try to use the PORT from the .env file, otherwise it defaults to 3000.
const PORT = process.env.PORT || 3000;

// --- Middleware & Configuration ---

// Set EJS as the templating engine
app.set('view engine', 'ejs');

// Set the directory for the view files.
// This tells Express to look for template files in the 'views' directory.
app.set('views', path.join(__dirname, '../views'));

// Serve static files (like CSS, client-side JS) from a 'public' directory if you add one later.
// app.use(express.static(path.join(__dirname, '../public')));

// --- Routes ---

/**
 * @route GET /login
 * @description Serves the login page.
 */
app.get('/login', (req, res) => {
  // Renders the login.ejs file from the 'views' directory.
  res.render('login', {
    // You can pass variables to your EJS template like this
    title: 'Login Page'
  });
});

/**
 * @route GET /
 * @description A default route to redirect to the login page.
 */
app.get('/', (req, res) => {
  res.redirect('/login');
});

// --- Server Startup ---

// Start the server and listen for incoming requests on the specified port
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});