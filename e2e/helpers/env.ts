export const URLS = {
  public: process.env.E2E_PUBLIC_URL || 'https://www.autodealers-online.com',
  admin: process.env.E2E_ADMIN_URL || 'https://admin.autodealers-online.com',
  seller: process.env.E2E_SELLER_URL || 'https://seller.autodealers-online.com',
  dealer: process.env.E2E_DEALER_URL || 'https://dealer.autodealers-online.com',
  advertiser: process.env.E2E_ADVERTISER_URL || 'https://advertiser.autodealers-online.com',
};

export const TEST_USERS = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || 'admin@autodealers.test',
    password: process.env.E2E_ADMIN_PASSWORD || 'Admin123!',
  },
  seller: {
    email: process.env.E2E_SELLER_EMAIL || 'seller@autodealers.test',
    password: process.env.E2E_SELLER_PASSWORD || 'Seller123!',
  },
  dealer: {
    email: process.env.E2E_DEALER_EMAIL || 'dealer@autodealers.test',
    password: process.env.E2E_DEALER_PASSWORD || 'Dealer123!',
  },
  advertiser: {
    email: process.env.E2E_ADVERTISER_EMAIL || 'advertiser@autodealers.test',
    password: process.env.E2E_ADVERTISER_PASSWORD || 'Advertiser123!',
  },
};

export function uniqueTestEmail(prefix = 'e2e'): string {
  const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return `${prefix}-${stamp}@autodealers-test.com`;
}

export function uniqueSubdomain(prefix = 'pw'): string {
  const stamp = Date.now().toString(36).slice(-8);
  return `${prefix}${stamp}`.replace(/[^a-z0-9]/g, '').slice(0, 20);
}
