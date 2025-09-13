export default function handler(req, res) {
  const client_id = process.env.DISCORD_CLIENT_ID;
  const redirect_uri = `https://${process.env.VERCEL_URL}/api/auth/callback`;
  
  // Scopes: 'identify' per i dati utente, 'guilds' per la lista dei server
  const scope = ['identify', 'guilds'].join(' ');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id,
    scope,
    redirect_uri,
  });

  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
}