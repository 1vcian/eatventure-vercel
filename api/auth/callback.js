import fetch from 'node-fetch';
import { serialize } from 'cookie';

export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Missing authorization code');
  }

  try {
    // 1. Scambia il codice per un access token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: `https://${process.env.VERCEL_URL}/api/auth/callback`,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) {
        throw new Error('Failed to get access token');
    }

    // 2. Ottieni la lista dei server (guilds) dell'utente
    const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });
    const guilds = await guildsResponse.json();

    // 3. Controlla se l'utente è nel server da bloccare
    const targetGuildId = process.env.TARGET_GUILD_ID;
    const isMemberOfBannedServer = guilds.some(guild => guild.id === targetGuildId);

    // 4. Crea un cookie con lo stato dell'utente
    const sessionData = {
        isLoggedIn: true,
        isMember: isMemberOfBannedServer,
    };

    const cookie = serialize('user_session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      maxAge: 60 * 60 * 24 * 7, // 1 settimana
      path: '/',
    });

    res.setHeader('Set-Cookie', cookie);
    
    // 5. Reindirizza alla pagina principale
    res.redirect('/');

  } catch (error) {
    console.error(error);
    res.status(500).send('Authentication failed');
  }
}