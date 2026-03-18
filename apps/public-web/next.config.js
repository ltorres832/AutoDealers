/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  // output: 'standalone', // Comentado para Vercel (usa su propio servidor)
  images: {
    unoptimized: false, // Vercel optimiza imágenes automáticamente
  },
  // Configuración para producción estática
  generateBuildId: async () => {
    return 'production-build';
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
    // Plugin para interceptar y corregir referencias a .js
    const webpack = require('webpack');
    
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
    
    // Excluir módulos de Node.js del bundle del cliente
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        http2: false,
        stream: false,
        'firebase-admin': false,
      };
      
      // Excluir firebase-admin completamente del bundle del cliente
      config.externals = config.externals || [];
      if (typeof config.externals === 'function') {
        const originalExternals = config.externals;
        config.externals = [
          originalExternals,
          ({ request }, callback) => {
            if (request === 'firebase-admin' || request?.includes('firebase-admin')) {
              return callback(null, 'commonjs ' + request);
            }
            callback();
          },
        ];
      } else if (Array.isArray(config.externals)) {
        config.externals.push('firebase-admin');
      } else {
        config.externals = {
          ...config.externals,
          'firebase-admin': 'commonjs firebase-admin',
        };
      }
      
      // Ignorar firebase-admin y sus dependencias en el cliente
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^firebase-admin$/,
        })
      );
      
      // Habilitar WebAssembly para el cliente
      config.experiments = {
        ...config.experiments,
        asyncWebAssembly: true,
      };
      
      // Configuración de caché mejorada
      config.cache = {
        type: 'filesystem',
        buildDependencies: {
          config: [__filename],
        },
      };
    }
    
    // Plugin para interceptar y corregir referencias a .js
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /packages\/inventory\/src\/types\.js$/,
        (resource) => {
          resource.request = resource.request.replace(/\.js$/, '.ts');
        }
      )
    );
    
    return config;
  },
};

module.exports = nextConfig;




