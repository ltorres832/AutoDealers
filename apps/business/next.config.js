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
    ],
  },
  serverExternalPackages: [
    'firebase-admin',
    'google-auth-library',
    '@google-cloud/firestore',
    '@google-cloud/storage',
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
    '@autodealers/shared',
  ],
  webpack: (config, { isServer }) => {
    const webpack = require('webpack');
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.jsx': ['.tsx', '.jsx'],
    };
    config.resolve.alias = {
      ...config.resolve.alias,
      '@autodealers/core': path.resolve(__dirname, '../../packages/core/src'),
      '@autodealers/billing': path.resolve(__dirname, '../../packages/billing/src'),
      '@autodealers/crm': path.resolve(__dirname, '../../packages/crm/src'),
      '@autodealers/shared': path.resolve(__dirname, '../../packages/shared/src'),
    };
    if (!isServer) {
      config.plugins = config.plugins || [];
      config.plugins.push(new webpack.IgnorePlugin({ resourceRegExp: /^node:/ }));
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        http2: false,
        crypto: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
