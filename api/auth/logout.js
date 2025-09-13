// api/auth/logout.js
import { serialize } from 'cookie';

export default function handler(req, res) {
  // Crea un cookie scaduto per cancellarlo
  const cookie = serialize('user_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    expires: new Date(0), // Data nel passato
    path: '/',
  });

  res.setHeader('Set-Cookie', cookie);
  res.status(200).json({ message: 'Logged out' });
}