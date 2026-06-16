/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  typescript: {
    ignoreBuildErrors: true,
  },
  outputFileTracingRoot: path.join(__dirname, '../../'),
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
    unoptimized: true,
  },
  transpilePackages: [
    '@autodealers/core',
    '@autodealers/crm',
    '@autodealers/messaging',
    '@autodealers/ai',
    '@autodealers/shared',
    '@autodealers/billing',
    '@autodealers/inventory',
    '@autodealers/reports',
  ],
  webpack: (config, { isServer, webpack }) => {
    const sharedSrc = path.join(__dirname, '../../packages/shared/src');

    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js'],
      '.mjs': ['.mts', '.mjs'],
      '.cjs': ['.cts', '.cjs'],
    };

    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.join(__dirname, 'src'),
      '@autodealers/core': path.join(__dirname, '../../packages/core/src'),
      '@autodealers/shared/client': path.join(sharedSrc, 'client.ts'),
      '@autodealers/shared/firebase-server': path.join(sharedSrc, 'firebase-server.ts'),
      '@autodealers/shared/platform-branding-client': path.join(
        sharedSrc,
        'platform-branding-client.ts'
      ),
      '@autodealers/shared/components/PromoVideosEditor': path.join(
        sharedSrc,
        'components/PromoVideosEditor.tsx'
      ),
      '@autodealers/shared/components/TrustGalleryEditor': path.join(
        sharedSrc,
        'components/TrustGalleryEditor.tsx'
      ),
      '@autodealers/shared/promo-video-urls': path.join(sharedSrc, 'promo-video-urls.ts'),
      '@autodealers/shared/public-trust-gallery': path.join(sharedSrc, 'public-trust-gallery.ts'),
      '@autodealers/shared/firebase-storage-upload': path.join(
        sharedSrc,
        'firebase-storage-upload.ts'
      ),
      '@autodealers/crm': path.join(__dirname, '../../packages/crm/src'),
      '@autodealers/inventory': path.join(__dirname, '../../packages/inventory/src'),
      '@autodealers/billing': path.join(__dirname, '../../packages/billing/src'),
      '@autodealers/messaging': path.join(__dirname, '../../packages/messaging/src'),
      '@autodealers/ai': path.join(__dirname, '../../packages/ai/src'),
      '@autodealers/reports': path.join(__dirname, '../../packages/reports/src'),
    };

    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    if (isServer) {
      config.resolve.alias['@autodealers/shared'] = path.join(sharedSrc, 'index.ts');
    } else {
      config.resolve.alias['@autodealers/shared$'] = path.join(sharedSrc, 'client.ts');
      config.plugins = config.plugins || [];
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^node:|firebase-admin|@google-cloud\/firestore|@google-cloud\/storage/,
        })
      );
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
        events: false,
        process: false,
        util: false,
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
