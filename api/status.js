import { parse } from 'cookie';
import crypto from 'crypto';

// Funzione per verificare la firma
function verify(cookieValue, secret) {
    if (!cookieValue) return null;
    const [encodedData, signature] = cookieValue.split('.');
    if (!encodedData || !signature) return null;

    const expectedSignature = crypto.createHmac('sha256', secret).update(Buffer.from(encodedData, 'base64').toString('utf8')).digest('hex');

    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return JSON.parse(Buffer.from(encodedData, 'base64').toString('utf8'));
    }
    return null;
}

export default function handler(req, res) {
    if (!req.headers.cookie) { return res.json({ isLoggedIn: false }); }

    const cookies = parse(req.headers.cookie);
    const sessionCookie = cookies.user_session;

    // --- CORREZIONE DI SICUREZZA ---
    const sessionData = verify(sessionCookie, process.env.SESSION_SECRET);

    if (!sessionData) {
        // Cookie non valido o manomesso!
        return res.json({ isLoggedIn: false });
    }
    
    res.status(200).json(sessionData);
}