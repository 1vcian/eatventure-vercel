// api/auth/callback.js
import fetch from 'node-fetch';
import { serialize } from 'cookie';

export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Errore: Codice di autorizzazione mancante.');
  }

  try {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const redirect_uri = isDevelopment
      ? 'http://localhost:3000/api/auth/callback'
      : `${process.env.BASE_URL}/api/auth/callback`;

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
        redirect_uri,
      }),
    });

    const tokenData = await tokenResponse.json();

    // Miglioriamo il controllo dell'errore
    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Errore da Discord nello scambio del token:', tokenData);
      throw new Error(`Discord ha risposto con un errore: ${JSON.stringify(tokenData)}`);
    }

    // Da qui in poi il codice per ottenere guilds e user data rimane lo stesso...
    const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const guilds = await guildsResponse.json();

    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = await userResponse.json();

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

    const cookie = serialize('user_session', JSON.stringify(sessionData), {
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