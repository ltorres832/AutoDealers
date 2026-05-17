/**
 * Identity Toolkit vía Node https (fallback cuando el SDK del navegador falla con network-request-failed).
 */
import https from 'https';

const DEFAULT_PUBLIC_ORIGIN =
  'https://public-web-app--autodealers-7f62e.us-central1.hosted.app';

export async function identityToolkitSignInWithPassword(
  email: string,
  password: string,
  apiKey: string,
  originBase?: string
): Promise<{ idToken: string; localId: string }> {
  const base = (
    originBase ||
    process.env.NEXT_PUBLIC_APP_URL ||
    DEFAULT_PUBLIC_ORIGIN
  ).replace(/\/$/, '');

  const bodyStr = JSON.stringify({ email, password, returnSecureToken: true });
  const path = `/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`;

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'identitytoolkit.googleapis.com',
        port: 443,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(bodyStr, 'utf8'),
          Origin: base,
          Referer: `${base}/login`,
        },
      },
      (res) => {
        let buf = '';
        res.setEncoding('utf8');
        res.on('data', (c) => {
          buf += c;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(buf || '{}') as {
              error?: { message?: string };
              idToken?: string;
              localId?: string;
            };
            const sc = res.statusCode || 0;
            if (sc >= 400) {
              const err = new Error(parsed.error?.message || `HTTP ${sc}`);
              (err as Error & { body?: unknown }).body = parsed;
              reject(err);
            } else if (!parsed.idToken || !parsed.localId) {
              reject(new Error('Respuesta de Identity Toolkit incompleta'));
            } else {
              resolve({ idToken: parsed.idToken, localId: parsed.localId });
            }
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}
