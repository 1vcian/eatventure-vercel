// api/auth/logout.js
import { serialize } from 'cookie';

export default function handler(req, res) {
  // Crea un cookie con valore vuoto e maxAge negativo per forzarne la cancellazione
  const cookie = serialize('user_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    maxAge: -1, // <-- QUESTA È LA CORREZIONE FONDAMENTALE
    path: '/',
  });

  res.setHeader('Set-Cookie', cookie);
  res.status(200).json({ message: 'Logged out successfully' });
}