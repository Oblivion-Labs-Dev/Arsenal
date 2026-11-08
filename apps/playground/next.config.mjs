/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@arsenal/ui',
    '@arsenal/motion',
    '@arsenal/fx',
    '@arsenal/sections',
    '@arsenal/layouts',
    '@arsenal/themes',
    '@arsenal/config',
    '@arsenal/adapters',
  ],
  serverExternalPackages: ['@arsenal/context-engine'],
  async redirects() {
    return [
      { source: '/features/:slug', destination: '/modules/:slug', permanent: true },
      { source: '/coming-soon', destination: '/labs#next', permanent: true },
    ];
  },
};

export default nextConfig;
