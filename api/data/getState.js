// api/data/getState.js
import { kv } from '@vercel/kv';
import { parse } from 'cookie';

export default async function handler(req, res) {
  if (!req.headers.cookie) return res.status(401).json({ error: 'Not authenticated' });
  const cookies = parse(req.headers.cookie);
  const session = cookies.user_session ? JSON.parse(cookies.user_session) : null;

  if (!session?.isLoggedIn) return res.status(401).json({ error: 'Not authenticated' });
  
  try {
    const userId = session.user.id;
    const userState = await kv.get(`user-state:${userId}`);
    res.status(200).json(userState || {}); // Ritorna un oggetto vuoto se non c'è stato
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch state' });
  }
}