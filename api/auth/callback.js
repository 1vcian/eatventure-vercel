// api/auth/callback.js
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

        // --- QUESTA È LA PARTE CHE AVEVO OMESSO ---
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.DISCORD_CLIENT_ID,
                client_secret: process.env.DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code,
                redirect_uri,
            }),
        });
        
        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok || !tokenData.access_token) {
            throw new Error(`Discord ha risposto con un errore: ${JSON.stringify(tokenData)}`);
        }

        const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const guilds = await guildsResponse.json();

        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const userData = await userResponse.json();
        // --- FINE DELLA PARTE OMESSA ---

        const targetGuildId = process.env.TARGET_GUILD_ID;
        const isMemberOfBannedServer = Array.isArray(guilds) && guilds.some(guild => guild.id === targetGuildId);

        const sessionData = {
            isLoggedIn: true,
            isMember: isMemberOfBannedServer,
            user: {
                id: userData.id,
                username: userData.username,
                avatar: `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png`
            }
        };

        const signedSession = sign(sessionData, process.env.SESSION_SECRET);


        const cookie = serialize('user_session', signedSession, {
            httpOnly: true,
            secure: process.env.NODE_ENV !== 'development',
            // maxAge: 60 * 60 * 24 * 7, // Commenta o cancella la riga vecchia (1 settimana)
            maxAge: 60 * 30, // NUOVO VALORE: 30 minuti
            path: '/',
        });

        res.setHeader('Set-Cookie', cookie);
        res.redirect('/');


        res.setHeader('Set-Cookie', cookie);
        res.redirect('/');

    } catch (error) {
        console.error('ERRORE CRITICO in /api/auth/callback:', error);
        res.status(500).send(`Authentication failed. Dettagli: ${error.message}`);
    }
}