// api/status.js
import { parse } from 'cookie';
import { serialize } from 'cookie';
import crypto from 'crypto';
import fetch from 'node-fetch';
import { kv } from '@vercel/kv';

// ✅ ADDED: The sign function is needed for the force-refresh logic to update the cookie.
function sign(data, secret) {
    const dataString = JSON.stringify(data);
    const signature = crypto.createHmac('sha256', secret).update(dataString).digest('hex');
    const encodedData = Buffer.from(dataString).toString('base64');
    return `${encodedData}.${signature}`;
}

// ✅ ADDED: The complete verify function to decode the cookie.
function verify(cookieValue, secret) {
    if (!cookieValue) return null;

    try {
        const [encodedData, signature] = cookieValue.split('.');
        if (!encodedData || !signature) return null;

        const dataString = Buffer.from(encodedData, 'base64').toString('utf-8');
        const expectedSignature = crypto.createHmac('sha256', secret).update(dataString).digest('hex');

        if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
            return JSON.parse(dataString);
        }
        return null;
    } catch (error) {
        console.error("Cookie verification failed:", error);
        return null;
    }
}


export default async function handler(req, res) {
    if (!req.headers.cookie) {
        return res.json({ isLoggedIn: false });
    }

      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    if (!req.headers.cookie) {
        return res.json({ isLoggedIn: false });
    }

    const cookies = parse(req.headers.cookie);
    const sessionCookie = cookies.user_session;
    // This will now correctly verify the cookie
    const sessionData = verify(sessionCookie, process.env.SESSION_SECRET);

    if (!sessionData || !sessionData.isLoggedIn) {
        // Clear the invalid cookie if it exists
        const clearedCookie = serialize('user_session', '', { maxAge: -1, path: '/' });
        res.setHeader('Set-Cookie', clearedCookie);
        return res.json({ isLoggedIn: false });
    }


  


    // --- LOGICA DI AGGIORNAMENTO FORZATO ---
    if (req.query['force-refresh'] === 'true') {
        try {
            const tokenInfo = await kv.get(`user-tokens:${sessionData.user.id}`);
            if (!tokenInfo) throw new Error('Token not found');

            const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
                headers: { Authorization: `Bearer ${tokenInfo.accessToken}` },
            });
            const guilds = await guildsResponse.json();

            const targetGuildId = process.env.TARGET_GUILD_ID;
            const isMemberNow = Array.isArray(guilds) && guilds.some(guild => guild.id === targetGuildId);
            const isWhitelisted = await kv.get(`user-override:${sessionData.user.id}`);
            const isExplicitlyBanned = await kv.get(`user-ban:${sessionData.user.id}`);
            const finalIsMemberStatus = isExplicitlyBanned || (isMemberNow && !isWhitelisted);

            if (finalIsMemberStatus !== sessionData.isMember) {
                sessionData.isMember = finalIsMemberStatus; 

                // Re-sign the session and set the new cookie
                const signedSession = sign(sessionData, process.env.SESSION_SECRET);
                const newCookie = serialize('user_session', signedSession, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV !== 'development',
                    maxAge: 60 * 30, // 30 minutes
                    path: '/',
                    sameSite: 'lax'
                });
                res.setHeader('Set-Cookie', newCookie);
            }
        } catch (error) {
            console.error('Errore durante il force-refresh:', error);
            return res.status(200).json(sessionData);
        }
    }

    // Restituisci i dati della sessione (aggiornati o vecchi)
    res.status(200).json(sessionData);
}