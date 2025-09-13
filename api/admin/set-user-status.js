import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const providedSecret = req.headers['x-admin-secret'];
    const expectedSecret = process.env.ADMIN_SECRET_KEY;

    if (!providedSecret || providedSecret !== expectedSecret) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const { userId, status } = req.body;

    if (!userId || !['ban', 'whitelist', 'default'].includes(status)) {
        return res.status(400).json({ error: 'Missing or invalid parameters. Required: userId (string), status ("ban", "whitelist", or "default").' });
    }

    try {
        const banKey = `user-ban:${userId}`;
        const whitelistKey = `user-override:${userId}`;

        if (status === 'ban') {
            await kv.set(banKey, true);
            await kv.set(whitelistKey, false); // Assicura che non sia anche in whitelist
        } else if (status === 'whitelist') {
            await kv.set(banKey, false); // Assicura che non sia bannato
            await kv.set(whitelistKey, true);
        } else { // 'default'
            await kv.set(banKey, false);
            await kv.set(whitelistKey, false);
        }

        return res.status(200).json({ success: true, message: `User ${userId} status set to ${status}.` });
    } catch (error) {
        console.error('Failed to set user status:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}