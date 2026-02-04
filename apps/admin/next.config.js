/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
  
  // Configuración de compilación
  swcMinify: true,
  
  // Evitar intentar ejecutar rutas API durante el build
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  
  // Headers para mejorar el rendimiento
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

