// api/auth/callback.js
import { serialize } from 'cookie';
import fetch from 'node-fetch';
import crypto from 'crypto';
import { kv } from '@vercel/kv';

// Funzione per firmare i dati
function sign(data, secret) {
    const dataString = JSON.stringify(data);
    const signature = crypto.createHmac('sha256', secret).update(dataString).digest('hex');
    const encodedData = Buffer.from(dataString).toString('base64');
    return `${encodedData}.${signature}`;
}

export default async function handler(req, res) {
    const { code } = req.query;
    if (!code) { 
        // Aggiungiamo un return anche qui per buona misura
        res.redirect('/');
        return res.status(400).send('Errore: Codice di autorizzazione mancante.'); // <-- AGGIUNTO
    }

    try {
        const isDevelopment = process.env.NODE_ENV === 'development';
        const redirect_uri = isDevelopment ? 'http://localhost:3000/api/auth/callback' : `${process.env.BASE_URL}/api/auth/callback`;

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
        
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const userData = await userResponse.json();

        const tokenInfo = {
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresAt: Date.now() + (tokenData.expires_in * 1000),
                username: userData.username // ✅ AGGIUNGI QUESTA RIGA
        };
        await kv.set(`user-tokens:${userData.id}`, tokenInfo);
        
        const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const guilds = await guildsResponse.json();

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
            maxAge: 60 * 30, // 30 minuti
            path: '/',
              sameSite: 'lax' 
        });

        res.setHeader('Set-Cookie', cookie);
        res.redirect('/');
        return; // <-- AGGIUNTO: Ferma l'esecuzione dopo il redirect

    } catch (error) {
        console.error('ERRORE CRITICO in /api/auth/callback:', error);
        res.status(500).send(`Authentication failed. Dettagli: ${error.message}`);
        return; // <-- AGGIUNTO: Ferma l'esecuzione dopo aver inviato l'errore
    }
}