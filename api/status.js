// api/status.js
import { parse } from 'cookie';
import { serialize } from 'cookie'; // <-- Importa serialize
import crypto from 'crypto';
import fetch from 'node-fetch'; // <-- Importa fetch
import { kv } from '@vercel/kv'; // <-- Importa KV

// La tua funzione verify e sign
function sign(data, secret) { /* ... (copia la funzione sign da callback.js) ... */ }
function verify(cookieValue, secret) { /* ... (la tua funzione verify esistente) ... */ }


export default async function handler(req, res) {
    if (!req.headers.cookie) { return res.json({ isLoggedIn: false }); }

    const cookies = parse(req.headers.cookie);
    const sessionCookie = cookies.user_session;
    const sessionData = verify(sessionCookie, process.env.SESSION_SECRET);

    if (!sessionData || !sessionData.isLoggedIn) {
        return res.json({ isLoggedIn: false });
    }

    // --- LOGICA DI AGGIORNAMENTO FORZATO ---
    if (req.query['force-refresh'] === 'true') {
        try {
            // 1. Recupera il token da KV
            const tokenInfo = await kv.get(`user-tokens:${sessionData.user.id}`);
            if (!tokenInfo) throw new Error('Token non trovato');
            
            // (Qui andrebbe la logica di refresh del token se è scaduto, per ora la omettiamo)

            // 2. Chiedi a Discord i server aggiornati
            const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
                headers: { Authorization: `Bearer ${tokenInfo.accessToken}` },
            });
            const guilds = await guildsResponse.json();

            // 3. Ricalcola lo stato di 'isMember'
            const targetGuildId = process.env.TARGET_GUILD_ID;
            const isMemberNow = Array.isArray(guilds) && guilds.some(guild => guild.id === targetGuildId);

            // 4. Se lo stato è cambiato, aggiorna la sessione e il cookie
            if (isMemberNow !== sessionData.isMember) {
                sessionData.isMember = isMemberNow;
                
                const signedSession = sign(sessionData, process.env.SESSION_SECRET);
                const newCookie = serialize('user_session', signedSession, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV !== 'development',
                    maxAge: 60 * 60 * 24 * 7, // Reimposta la durata
                    path: '/',
                });
                res.setHeader('Set-Cookie', newCookie);
            }
        } catch (error) {
            console.error('Errore durante il force-refresh:', error);
            // Non blocchiamo l'utente, restituiamo solo i dati vecchi
            return res.status(200).json(sessionData);
        }
    }
    
    // Restituisci i dati della sessione (aggiornati o vecchi)
    res.status(200).json(sessionData);
}