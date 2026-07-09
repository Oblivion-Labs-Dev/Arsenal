/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@arsenal/ui",
    "@arsenal/motion",
    "@arsenal/sections",
    "@arsenal/layouts",
    "@arsenal/themes",
    "@arsenal/config",
    "@arsenal/adapters",
  ],
  serverExternalPackages: ["@arsenal/context-engine"],
};

export default nextConfig;
