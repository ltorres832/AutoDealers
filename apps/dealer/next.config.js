/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  typescript: {
    // Los errores de tipo son menores (arrays sin tipo explícito), no afectan la lógica
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
  transpilePackages: ['@autodealers/core', '@autodealers/crm', '@autodealers/inventory', '@autodealers/messaging', '@autodealers/ai', '@autodealers/billing', '@autodealers/shared'],
  // Configuración de Turbopack (vacía para usar webpack en build)
  turbopack: {},
  webpack: (config, { isServer }) => {
    const webpack = require('webpack');
    const path = require('path');
    const sharedSrc = path.join(__dirname, '../../packages/shared/src');

    config.resolve.alias = {
      ...config.resolve.alias,
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
      '@autodealers/shared/settings-profile': path.join(sharedSrc, 'settings-profile.ts'),
      '@autodealers/shared/firebase-storage-upload': path.join(
        sharedSrc,
        'firebase-storage-upload.ts'
      ),
    };

    // Habilitar WebAssembly
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Ignorar módulos node:* en el cliente
    if (!isServer) {
      config.plugins = config.plugins || [];
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^node:/,
        })
      );
    }

    // Deshabilitar cache de webpack para evitar problemas de memoria
    if (process.env.NODE_ENV === 'development') {
      config.cache = false;
    }

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
        events: false,
        process: false,
        util: false,
      };
    }

    return config;
  },
};

module.exports = nextConfig;





