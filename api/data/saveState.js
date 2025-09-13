// api/data/saveState.js
import { kv } from '@vercel/kv';
import { parse } from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!req.headers.cookie) return res.status(401).json({ error: 'Not authenticated' });
  
  const cookies = parse(req.headers.cookie);
  const session = cookies.user_session ? JSON.parse(cookies.user_session) : null;

  if (!session?.isLoggedIn) return res.status(401).json({ error: 'Not authenticated' });
  
  try {
    const userId = session.user.id;
    const stateToSave = req.body;
    await kv.set(`user-state:${userId}`, stateToSave);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save state' });
  }
}