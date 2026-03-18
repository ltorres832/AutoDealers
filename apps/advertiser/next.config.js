/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
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

    // Excluir módulos de Node.js del bundle del cliente
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        http2: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        path: false,
        os: false,
      };

      // Excluir firebase-admin y módulos relacionados del bundle del cliente
      config.externals = config.externals || [];
      if (Array.isArray(config.externals)) {
        config.externals.push({
          'firebase-admin': 'commonjs firebase-admin',
          '@google-cloud/firestore': 'commonjs @google-cloud/firestore',
          '@google-cloud/storage': 'commonjs @google-cloud/storage',
          'google-auth-library': 'commonjs google-auth-library',
          'gcp-metadata': 'commonjs gcp-metadata',
          'gtoken': 'commonjs gtoken',
        });
      }
    }

    return config;
  },
};

module.exports = nextConfig;

