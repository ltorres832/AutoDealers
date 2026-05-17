/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  // output: 'standalone', // Comentado para Firebase App Hosting
  images: {
    unoptimized: true,
  },
  transpilePackages: [
    '@autodealers/core',
    '@autodealers/crm',
    '@autodealers/billing',
    '@autodealers/shared',
    '@autodealers/inventory',
    '@autodealers/ai',
    '@autodealers/reports',
    '@autodealers/messaging',
  ],

  // Optimizaciones para desarrollo
  onDemandEntries: {
    // Período en ms que una página permanece en el buffer
    maxInactiveAge: 25 * 1000,
    // Número de páginas que deberían mantenerse simultáneamente sin ser desreferenciadas
    pagesBufferLength: 2,
  },

  // Evitar intentar ejecutar rutas API durante el build
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Headers: el logo en /brand no debe ir con caché “immutable” (si no, nunca se actualiza en el navegador).
  async headers() {
    return [
      {
        source: '/brand/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
      {
        source: '/:all*(svg|jpg|jpeg|png|webp|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=86400',
          },
        ],
      },
    ];
  },

  // Turbopack: No se necesita configuración adicional
  // Los módulos de Node.js se excluyen automáticamente del bundle del cliente

  // Configuración de webpack como fallback (si se usa --webpack flag)
  webpack: (config, { isServer }) => {
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

      // Excluir Firebase Admin y módulos relacionados del bundle del cliente
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
      } else {
        config.externals = [
          config.externals,
          {
            'firebase-admin': 'commonjs firebase-admin',
            '@google-cloud/firestore': 'commonjs @google-cloud/firestore',
            '@google-cloud/storage': 'commonjs @google-cloud/storage',
            'google-auth-library': 'commonjs google-auth-library',
            'gcp-metadata': 'commonjs gcp-metadata',
            'gtoken': 'commonjs gtoken',
          },
        ];
      }
    }
    return config;
  },
};

module.exports = nextConfig;

