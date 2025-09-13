// lib/session.js
import { parse } from 'cookie';
import crypto from 'crypto';

function verify(cookieValue, secret) {
    if (!cookieValue) return null;
    const [encodedData, signature] = cookieValue.split('.');
    if (!encodedData || !signature) return null;

    try {
        const dataString = Buffer.from(encodedData, 'base64').toString('utf8');
        const expectedSignature = crypto.createHmac('sha256', secret).update(dataString).digest('hex');

        if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
            return JSON.parse(dataString);
        }
    } catch (error) {
        return null; // Errore nella decodifica o parsing, cookie non valido
    }
    return null;
}

export function getSession(req) {
    if (!req.headers.cookie) return null;
    const cookies = parse(req.headers.cookie);
    const sessionCookie = cookies.user_session;
    return verify(sessionCookie, process.env.SESSION_SECRET);
}