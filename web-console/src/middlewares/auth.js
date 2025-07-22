// src/middlewares/auth.js

/**
 * Middleware to check if a user is authenticated.
 * If the user's session is not marked as authenticated, they are redirected to the /login page.
 * Otherwise, they are allowed to proceed to the next middleware or route handler.
 *
 * @param {object} req - The Express request object.
 * @param {object} res - The Express response object.
 * @param {function} next - The next middleware function in the stack.
 */
const requireAuth = (req, res, next) => {
  if (req.session && req.session.authenticated) {
    // If the session exists and the user is authenticated, proceed.
    return next();
  } else {
    // If not authenticated, redirect to the login page.
    res.redirect('/login');
  }
};

module.exports = { requireAuth };