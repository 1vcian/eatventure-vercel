import { kv } from '@vercel/kv';
import { getSession } from '../../lib/session'; // Importa la nuova funzione

export default async function handler(req, res) {
    const session = getSession(req);
    if (!session?.isLoggedIn) return res.status(401).json({ error: 'Not authenticated' });
    
    try {
        const userId = session.user.id;
        const userState = await kv.get(`user-state:${userId}`);
        res.status(200).json(userState || {});
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch state' });
    }
}