/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  transpilePackages: [
    '@autodealers/core',
    '@autodealers/billing',
    '@autodealers/crm',
    '@autodealers/messaging',
    '@autodealers/ai',
    '@autodealers/inventory',
    '@autodealers/shared',
  ],
  // Configuración de Turbopack (vacía para usar webpack en build)
  turbopack: {},
  webpack: (config, { isServer }) => {
    // Resolver alias para los paquetes del monorepo
    const path = require('path');
    config.resolve.alias = {
      ...config.resolve.alias,
      '@autodealers/core': path.resolve(__dirname, '../../packages/core/src'),
      '@autodealers/billing': path.resolve(__dirname, '../../packages/billing/src'),
      '@autodealers/crm': path.resolve(__dirname, '../../packages/crm/src'),
      '@autodealers/messaging': path.resolve(__dirname, '../../packages/messaging/src'),
      '@autodealers/ai': path.resolve(__dirname, '../../packages/ai/src'),
      '@autodealers/inventory': path.resolve(__dirname, '../../packages/inventory/src'),
      '@autodealers/shared': path.resolve(__dirname, '../../packages/shared/src'),
    };
    
    return config;
  },
};

module.exports = nextConfig;

