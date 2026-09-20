import fs from 'fs';
import path from 'path';
import { URLS as BASE_URLS, TEST_USERS as BASE_USERS } from './env';

export const URLS = BASE_URLS;

const CREDS = path.join(process.cwd(), 'e2e', '.smoke-dealer-creds.json');

export function loadDealerCreds(): { email: string; password: string } {
  if (process.env.E2E_DEALER_EMAIL && process.env.E2E_DEALER_PASSWORD) {
    return {
      email: process.env.E2E_DEALER_EMAIL,
      password: process.env.E2E_DEALER_PASSWORD,
    };
  }
  if (fs.existsSync(CREDS)) {
    const raw = JSON.parse(fs.readFileSync(CREDS, 'utf8'));
    if (raw.email && raw.password) {
      return { email: raw.email, password: raw.password };
    }
  }
  return {
    email: BASE_USERS.dealer.email,
    password: BASE_USERS.dealer.password,
  };
}
