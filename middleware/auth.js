function requireLogin(req, res, next) {
  if (!req.session || (!req.session.userId && !req.session.guest)) {
    return res.redirect('/login');
  }
  next();
}

module.exports = { requireLogin };
