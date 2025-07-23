const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const session = require('express-session');

const authRoutes = require('./routes/auth');
const { requireAuth } = require('./middlewares/auth');
const controlRoutes = require('./routes/control'); // ✅ Moved here

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Templating and static files
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.urlencoded({ extended: true }));

// Session config
app.use(session({
  secret: process.env.SESSION_SECRET || 'a-default-fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24
  }
}));

// Routes
app.use('/', authRoutes);
app.use('/api/control', controlRoutes); // ✅ Now app is defined before use

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

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});