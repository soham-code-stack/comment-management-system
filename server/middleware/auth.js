import jwt from 'jsonwebtoken';

const read = (req) => {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return null;
  try { return jwt.verify(h.slice(7), process.env.JWT_SECRET); } catch { return null; }
};

export const optionalAuth = (req, res, next) => { req.user = read(req); next(); };

export const auth = (req, res, next) => {
  const user = read(req);
  if (!user) return res.status(401).json({ message: 'Sign in required' });
  req.user = user;
  next();
};

export const adminOnly = (req, res, next) =>
  req.user.role === 'admin' ? next() : res.status(403).json({ message: 'Admins only' });
