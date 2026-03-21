/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'standalone', // NECESARIO para que Firebase App Hosting sirva los assets correctamente
  outputFileTracingRoot: path.join(__dirname, '../../'),
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
  webpack: (config, { isServer }) => {
    // Configuración básica para monorepo - Mejor usar dependencias estándar
    config.resolve.alias = {
      ...config.resolve.alias,
      '@autodealers/core': path.join(__dirname, '../../packages/core/src'),
      '@autodealers/shared': path.join(__dirname, '../../packages/shared/src'),
      '@autodealers/crm': path.join(__dirname, '../../packages/crm/src'),
      '@autodealers/inventory': path.join(__dirname, '../../packages/inventory/src'),
      '@autodealers/billing': path.join(__dirname, '../../packages/billing/src'),
      '@autodealers/messaging': path.join(__dirname, '../../packages/messaging/src'),
      '@autodealers/ai': path.join(__dirname, '../../packages/ai/src'),
    };

    if (isServer) {
      config.externals.push(
        'firebase-admin',
        'google-auth-library',
        '@google-cloud/firestore',
        '@google-cloud/storage',
        'stripe'
      );
    }

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
