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
  res.status(200).setHeader('Content-Type', 'text/html').send(`
      <body style="font-family: sans-serif; background: #111; color: #eee; padding: 20px;">
          <h1>🕵️ Pagina di Debug per OAuth2</h1>
          <p>L'applicazione sta provando a usare i seguenti valori per il login con Discord.</p>
          <hr>
          <h3>Valori dall'Ambiente Vercel:</h3>
          <p><strong>Ambiente (NODE_ENV):</strong> <code>${process.env.NODE_ENV}</code></p>
          <p><strong>BASE_URL:</strong> <code>${baseUrl || 'NON IMPOSTATA!'}</code></p>
          <hr>
          <h3>URL Generato:</h3>
          <p>Questo è l'URL di reindirizzamento esatto che viene inviato a Discord:</p>
          <p style="background: #333; padding: 15px; border-radius: 5px; word-break: break-all;">
              <code>${redirect_uri}</code>
          </p>
          <hr>
          <p>Controlla che questo URL sia <strong>IDENTICO</strong> a quello nel Portale Sviluppatori di Discord.</p>
          <p>Se tutto sembra corretto, <a href="${discordAuthUrl}" style="color: #5865F2;">clicca qui per tentare il login con questo URL</a>.</p>
      </body>
  `);
}