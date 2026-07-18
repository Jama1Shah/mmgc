/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    // CHANGED: Replaced './' with process.cwd() to provide an absolute path
    root: process.cwd(), 
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.devtool = false;
    }
    return config;
  },
  onDemandEntries: {
    maxInactiveAge: 60000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;