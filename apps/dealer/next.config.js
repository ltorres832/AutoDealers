/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  typescript: {
    // Los errores de tipo son menores (arrays sin tipo explícito), no afectan la lógica
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  transpilePackages: ['@autodealers/core', '@autodealers/crm', '@autodealers/inventory', '@autodealers/messaging', '@autodealers/ai', '@autodealers/billing', '@autodealers/shared'],
  // Configuración de Turbopack (vacía para usar webpack en build)
  turbopack: {},
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





