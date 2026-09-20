import fs from 'fs';
import path from 'path';

const CREDS = path.join(process.cwd(), 'e2e', '.smoke-all-creds.json');

export type AllCreds = {
  password: string;
  tenantId: string;
  admin: { email: string; password: string; uid: string; sessionId: string };
  dealer: { email: string; password: string; uid: string; tenantId: string };
  seller: { email: string; password: string; uid: string; tenantId: string };
  advertiser: { email: string; password: string; uid: string; sessionToken: string };
};

export function loadAllCreds(): AllCreds {
  if (!fs.existsSync(CREDS)) {
    throw new Error('Falta e2e/.smoke-all-creds.json — corre: node scripts/e2e-provision-all.mjs');
  }
  return JSON.parse(fs.readFileSync(CREDS, 'utf8')) as AllCreds;
}
