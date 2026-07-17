import jwt from 'jsonwebtoken';

export interface TokenPayload {
  userId: string;
  email: string;
}

export const generateAccessToken = (
  payload: TokenPayload,
  secret: string
): string => {
  return jwt.sign(payload, secret, {
    expiresIn: '15m',
  });
};

export const generateRefreshToken = (
  payload: TokenPayload,
  secret: string
): string => {
  return jwt.sign(payload, secret, {
    expiresIn: '7d',
  });
};

export const verifyToken = (
  token: string,
  secret: string
): TokenPayload => {
  return jwt.verify(token, secret) as TokenPayload;
};