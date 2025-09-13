import { serialize } from 'cookie';
import fetch from 'node-fetch';
import crypto from 'crypto';

// Funzione per firmare i dati
function sign(data, secret) {
    const dataString = JSON.stringify(data);
    const signature = crypto.createHmac('sha256', secret).update(dataString).digest('hex');
    const encodedData = Buffer.from(dataString).toString('base64');
    return `${encodedData}.${signature}`;
}

export default async function handler(req, res) {
    const { code } = req.query;
    if (!code) { return res.status(400).send('Errore: Codice di autorizzazione mancante.'); }

    try {
        const isDevelopment = process.env.NODE_ENV === 'development';
        const redirect_uri = isDevelopment ? 'http://localhost:3000/api/auth/callback' : `${process.env.BASE_URL}/api/auth/callback`;

        // ... (tutto il codice per scambiare il token e ottenere i dati utente rimane identico)
        const tokenResponse = await fetch(/* ... */);
        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok || !tokenData.access_token) {
            throw new Error(`Discord ha risposto con un errore: ${JSON.stringify(tokenData)}`);
        }
        const guildsResponse = await fetch(/* ... */);
        const guilds = await guildsResponse.json();
        const userResponse = await fetch(/* ... */);
        const userData = await userResponse.json();
        // ... (fine del codice esistente)

        const targetGuildId = process.env.TARGET_GUILD_ID;
        const isMemberOfBannedServer = guilds.some(guild => guild.id === targetGuildId);

        const sessionData = {
            isLoggedIn: true,
            isMember: isMemberOfBannedServer,
            user: {
                id: userData.id,
                username: userData.username,
                avatar: `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
            }
        };

        // --- CORREZIONE DI SICUREZZA ---
        const signedSession = sign(sessionData, process.env.SESSION_SECRET);

        const cookie = serialize('user_session', signedSession, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            maxAge: 60 * 60 * 24 * 7,
            path: '/',
        });

        res.setHeader('Set-Cookie', cookie);
        res.redirect('/');

    } catch (error) {
        console.error('ERRORE CRITICO in /api/auth/callback:', error);
        res.status(500).send(`Authentication failed. Dettagli: ${error.message}`);
    }
}