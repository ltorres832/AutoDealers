/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Servidor Node empaquetado para Cloud Run / Firebase
  images: {
    unoptimized: true,
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
  // Configuración de Turbopack (vacía para usar webpack en build)
  turbopack: {},
  webpack: (config, { isServer }) => {
    // Resolver módulos del monorepo
    const inventorySrc = path.resolve(__dirname, '../../packages/inventory/src');
    const coreSrc = path.resolve(__dirname, '../../packages/core/src');
    
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './src'),
      '@autodealers/core': coreSrc,
      '@autodealers/inventory': inventorySrc,
      '@autodealers/crm': path.resolve(__dirname, '../../packages/crm/src'),
      '@autodealers/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@autodealers/billing': path.resolve(__dirname, '../../packages/billing/src'),
      '@autodealers/messaging': path.resolve(__dirname, '../../packages/messaging/src'),
      '@autodealers/ai': path.resolve(__dirname, '../../packages/ai/src'),
    };
    
    // Forzar resolución de archivos TypeScript primero
    config.resolve.extensions = ['.tsx', '.ts', '.jsx', '.js', '.json'];
    
    // Plugin para interceptar y corregir referencias a .js
    const webpack = require('webpack');
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /packages\/inventory\/src\/types\.js$/,
        (resource) => {
          resource.request = resource.request.replace(/\.js$/, '.ts');
        }
      )
    );
    
    // Configuración de caché mejorada
    if (!isServer) {
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      };
    }
    
    return config;
  },
};

module.exports = nextConfig;




