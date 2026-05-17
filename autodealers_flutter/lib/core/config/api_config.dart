/// Base URL del backend (Next.js) de la app Advertiser.
const String kAdvertiserApiBaseUrl = String.fromEnvironment(
  'ADVERTISER_API_BASE_URL',
  defaultValue: 'http://localhost:3001',
);

/// Base URL del backend (Next.js) de la app Admin.
const String kAdminApiBaseUrl = String.fromEnvironment(
  'ADMIN_API_BASE_URL',
  defaultValue: 'http://localhost:3000',
);

/// Base URL del backend Dealer (Next.js).
const String kDealerApiBaseUrl = String.fromEnvironment(
  'DEALER_API_BASE_URL',
  defaultValue: 'http://localhost:3002',
);

/// Base URL del backend Seller (Next.js).
const String kSellerApiBaseUrl = String.fromEnvironment(
  'SELLER_API_BASE_URL',
  defaultValue: 'http://localhost:3003',
);

const String kContactPhone = String.fromEnvironment(
  'CONTACT_PHONE',
  defaultValue: '1234567890',
);

const String kContactWhatsApp = String.fromEnvironment(
  'CONTACT_WHATSAPP',
  defaultValue: '1234567890',
);
