// api/admin/set-whitelist.js
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    // 1. Controlla il metodo della richiesta (accetta solo POST)
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 2. Controlla la chiave segreta per l'autorizzazione
    const providedSecret = req.headers['x-admin-secret'];
    const expectedSecret = process.env.ADMIN_SECRET_KEY;

    if (!providedSecret || providedSecret !== expectedSecret) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // 3. Estrai i dati dal corpo della richiesta
    const { userId, isWhitelisted } = req.body;

    if (!userId || typeof isWhitelisted !== 'boolean') {
        return res.status(400).json({ error: 'Missing or invalid parameters. Required: userId (string), isWhitelisted (boolean).' });
    }

    try {
        // 4. Imposta il valore nel database KV
        const key = `user-override:${userId}`;
        await kv.set(key, isWhitelisted);

        return res.status(200).json({ success: true, message: `User ${userId} whitelist status set to ${isWhitelisted}.` });
    } catch (error) {
        console.error('Failed to set whitelist status:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}