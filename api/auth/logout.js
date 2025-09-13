import { serialize } from 'cookie';

export default function handler(req, res) {
  // ✅ Versione più aggressiva per la cancellazione del cookie
  const cookie = serialize('user_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    maxAge: -1,                 // Dice al cookie di scadere subito
    expires: new Date(0),       // Imposta la data di scadenza al 1 Gen 1970
    path: '/',
    sameSite: 'lax'
  });

  // Aggiungiamo anche gli header per non mettere in cache questa risposta
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  res.setHeader('Set-Cookie', cookie);
  res.status(200).json({ message: 'Logged out successfully' });
}