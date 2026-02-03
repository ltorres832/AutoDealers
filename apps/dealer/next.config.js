/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  transpilePackages: ['@autodealers/core', '@autodealers/crm', '@autodealers/inventory', '@autodealers/messaging', '@autodealers/ai', '@autodealers/billing', '@autodealers/shared'],
  // Configuración de Turbopack (vacía para usar webpack en build)
  turbopack: {},
  webpack: (config, { isServer }) => {
    // Deshabilitar cache de webpack para evitar problemas de memoria
    if (process.env.NODE_ENV === 'development') {
      config.cache = false;
    }
    return config;
  },
};

module.exports = nextConfig;





