/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'standalone', // NECESARIO para que Firebase App Hosting sirva los assets correctamente
  outputFileTracingRoot: path.join(__dirname, '../../'),
  // require('firebase-admin') es dinámico en @autodealers/shared; forzar inclusión en el trace standalone
  outputFileTracingIncludes: {
    '/**': [
      '../../node_modules/firebase-admin/**',
      '../../node_modules/google-auth-library/**',
      '../../node_modules/gcp-metadata/**',
      '../../node_modules/google-gax/**',
      '../../node_modules/@google-cloud/**',
      '../../node_modules/@grpc/**',
      '../../node_modules/teeny-request/**',
      '../../node_modules/proto3-json-serializer/**',
      '../../node_modules/google-logging-utils/**',
    ],
  },
  serverExternalPackages: [
    'firebase-admin',
    'google-auth-library',
    '@google-cloud/firestore',
    '@google-cloud/storage',
    'stripe',
  ],
  images: {
    unoptimized: true, // Evitar errores de optimización en App Hosting
  },
  env: {
    SKIP_FIREBASE: process.env.SKIP_FIREBASE || 'false',
  },
  transpilePackages: [
    '@autodealers/core',
    '@autodealers/inventory',
    '@autodealers/crm',
    '@autodealers/shared',
    '@autodealers/billing',
    '@autodealers/messaging',
    '@autodealers/ai',
  ],
  /** Evita que /brand/* quede “pegado” meses en CDN/navegador al cambiar logo */
  async headers() {
    return [
      {
        source: '/brand/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
      {
        source: '/icon.png',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    // Configuración básica para monorepo - Mejor usar dependencias estándar
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.join(__dirname, 'src'),
      '@autodealers/core': path.join(__dirname, '../../packages/core/src'),
      '@autodealers/shared': path.join(__dirname, '../../packages/shared/src'),
      '@autodealers/crm': path.join(__dirname, '../../packages/crm/src'),
      '@autodealers/inventory': path.join(__dirname, '../../packages/inventory/src'),
      '@autodealers/billing': path.join(__dirname, '../../packages/billing/src'),
      '@autodealers/messaging': path.join(__dirname, '../../packages/messaging/src'),
      '@autodealers/ai': path.join(__dirname, '../../packages/ai/src'),
    };

    // serverExternalPackages ya maneja la mayoría de los casos en Next.js moderno.
    // Solo agregamos fallbacks para el lado del cliente si es necesario.
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        'firebase-admin': false,
        'google-auth-library': false,
        '@google-cloud/firestore': false,
        '@google-cloud/storage': false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
