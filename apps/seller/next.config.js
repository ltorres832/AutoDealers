/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  // Sin standalone: Firebase App Hosting (mismo patrón que admin-app).
  // output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  transpilePackages: ['@autodealers/core', '@autodealers/crm', '@autodealers/messaging', '@autodealers/ai', '@autodealers/shared'],
  webpack: (config, { isServer, webpack }) => {
    const sharedSrc = path.join(__dirname, '../../packages/shared/src');

    config.resolve.alias = {
      ...config.resolve.alias,
      '@autodealers/shared/client': path.join(sharedSrc, 'client.ts'),
      '@autodealers/shared/firebase-server': path.join(sharedSrc, 'firebase-server.ts'),
    };

    if (isServer) {
      config.resolve.alias['@autodealers/shared'] = path.join(sharedSrc, 'index.ts');
    } else {
      config.resolve.alias['@autodealers/shared$'] = path.join(sharedSrc, 'client.ts');
      config.plugins = config.plugins || [];
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^node:|firebase-admin|@google-cloud\/firestore|@google-cloud\/storage/,
        })
      );
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
        'firebase-admin': false,
      };
    }

    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    return config;
  },
};

module.exports = nextConfig;





