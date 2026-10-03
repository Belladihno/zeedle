import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Workspace package is symlinked ESM — compile it into the app bundle
  // instead of letting webpack resolve it as an external module.
  transpilePackages: ['@zeedle/shared-types'],
};

export default nextConfig;
