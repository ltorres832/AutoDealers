/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Servidor Node empaquetado para Cloud Run / Firebase
  images: {
    unoptimized: true,
  },
  transpilePackages: ['@autodealers/core', '@autodealers/crm', '@autodealers/messaging', '@autodealers/ai', '@autodealers/shared'],
};

module.exports = nextConfig;





