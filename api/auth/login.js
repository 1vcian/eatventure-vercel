// api/auth/login.js --- VERSIONE DI DEBUG

export default function handler(req, res) {
  const client_id = process.env.DISCORD_CLIENT_ID;
  const isDevelopment = process.env.NODE_ENV === 'development';
  const baseUrl = process.env.BASE_URL;

  const redirect_uri = isDevelopment
    ? 'http://localhost:3000/api/auth/callback'
    : `${baseUrl}/api/auth/callback`;

  const scope = ['identify', 'guilds'].join(' ');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id,
    scope,
    redirect_uri,
  });

  const discordAuthUrl = `https://discord.com/api/oauth2/authorize?${params}`;

  // --- PARTE DI DEBUG ---
  // Invece di reindirizzare, stampiamo a schermo i valori che stiamo usando.
  res.status(200).redirect(discordAuthUrl);
}