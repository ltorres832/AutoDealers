/// Base URL del backend (Next.js) de la app Advertiser.
/// En desarrollo: http://localhost:3001 (o el puerto donde corre la app advertiser).
/// En producción: configurar con --dart-define, p. ej.:
///   flutter build web --dart-define=ADVERTISER_API_BASE_URL=https://advertiser.tudominio.com
const String kAdvertiserApiBaseUrl = String.fromEnvironment(
  'ADVERTISER_API_BASE_URL',
  defaultValue: 'http://localhost:3001',
);

/// Base URL del backend (Next.js) de la app Admin. Usado para crear usuario/tenant/membresía vía REST.
/// En producción: --dart-define=ADMIN_API_BASE_URL=https://admin.tudominio.com
const String kAdminApiBaseUrl = String.fromEnvironment(
  'ADMIN_API_BASE_URL',
  defaultValue: 'http://localhost:3000',
);

/// Teléfono de contacto (solo dígitos, con código país). Para producción: --dart-define=CONTACT_PHONE=34600000000
const String kContactPhone = String.fromEnvironment(
  'CONTACT_PHONE',
  defaultValue: '1234567890',
);

/// Número WhatsApp (solo dígitos, con código país). Para producción: --dart-define=CONTACT_WHATSAPP=34600000000
const String kContactWhatsApp = String.fromEnvironment(
  'CONTACT_WHATSAPP',
  defaultValue: '1234567890',
);


