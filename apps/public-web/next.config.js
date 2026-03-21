/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // NECESARIO para que Firebase App Hosting sirva los assets correctamente
  experimental: {
    // Esto es CRUCIAL para monorepos en Firebase App Hosting/Vercel
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
  images: {
    unoptimized: true, // Evitar errores de optimización en App Hosting
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
    // Configuración básica para monorepo
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
