// One-time script to get a Google OAuth refresh token for YouTube Analytics.
// Usage: node backend/scripts/get-refresh-token.js CLIENT_ID CLIENT_SECRET
//
// 1. Run this script with your Client ID and Secret
// 2. Open the URL shown in the browser, log in with the EN .REC account
// 3. Approve the permissions — the script captura el código automáticamente
// 4. Copy GOOGLE_REFRESH_TOKEN from the output and save it in backend/.env

const { google } = require('googleapis');
const http = require('http');
const { URL } = require('url');

const CLIENT_ID = process.argv[2];
const CLIENT_SECRET = process.argv[3];
const PORT = 8080;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Usage: node get-refresh-token.js CLIENT_ID CLIENT_SECRET');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  `http://localhost:${PORT}`,
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/yt-analytics.readonly'],
  prompt: 'consent',
});

console.log('\nAbrí esta URL en el navegador con la cuenta de EN .REC:\n');
console.log(authUrl);
console.log(`\nEsperando autorización en http://localhost:${PORT} ...\n`);

const server = http.createServer(async (req, res) => {
  const code = new URL(req.url, `http://localhost:${PORT}`).searchParams.get('code');

  if (!code) {
    res.end('No se encontró el código. Intentá de nuevo.');
    return;
  }

  res.end('<h1 style="font-family:sans-serif;color:green">✓ Autorización exitosa. Podés cerrar esta ventana.</h1>');
  server.close();

  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('✓ Refresh token obtenido:\n');
    console.log('GOOGLE_REFRESH_TOKEN=' + tokens.refresh_token);
    console.log('\nAgregalo al .env del servidor junto con estas vars:');
    console.log('GOOGLE_CLIENT_ID=' + CLIENT_ID);
    console.log('GOOGLE_CLIENT_SECRET=' + CLIENT_SECRET);
  } catch (err) {
    console.error('Error al obtener el token:', err.message);
  }
});

server.listen(PORT);
