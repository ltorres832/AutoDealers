/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  outputFileTracingIncludes: {
    '/**': [
      '../../node_modules/firebase-admin/**',
      '../../node_modules/google-auth-library/**',
      '../../node_modules/gcp-metadata/**',
      '../../node_modules/google-gax/**',
      '../../node_modules/@google-cloud/**',
      '../../node_modules/@grpc/**',
      '../../node_modules/sharp/**',
    ],
  },
  serverExternalPackages: [
    'firebase-admin',
    'google-auth-library',
    '@google-cloud/firestore',
    '@google-cloud/storage',
    'stripe',
    'sharp',
  ],
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
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.jsx': ['.tsx', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
      '.cjs': ['.cts', '.cjs'],
    };
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

