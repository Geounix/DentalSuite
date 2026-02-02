import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

export const signJwt = (payload: object, expiresIn = '7d') =>
  jwt.sign(payload, JWT_SECRET, { expiresIn });

export const verifyJwt = (token: string) => jwt.verify(token, JWT_SECRET);
