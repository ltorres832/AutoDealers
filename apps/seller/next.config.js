/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  output: 'standalone', // Servidor Node empaquetado para Cloud Run / Firebase
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  transpilePackages: ['@autodealers/core', '@autodealers/crm', '@autodealers/messaging', '@autodealers/ai', '@autodealers/shared'],
  webpack: (config, { isServer }) => {
    const webpack = require('webpack');

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





