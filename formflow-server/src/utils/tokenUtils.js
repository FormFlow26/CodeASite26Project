import jwt from 'jsonwebtoken';

export function signJWT(userId) {
  return jwt.sign(
    { userId: String(userId) },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

export function verifyJWT(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}
