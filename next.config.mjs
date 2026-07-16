// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   turbopack: {
//     // CHANGED: Replaced './' with process.cwd() to provide an absolute path
//     root: process.cwd(), 
//   },
//   webpack: (config, { dev }) => {
//     if (dev) {
//       config.devtool = false;
//     }
//     return config;
//   },
//   onDemandEntries: {
//     maxInactiveAge: 60000,
//     pagesBufferLength: 2,
//   },
// };

// export default nextConfig;











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
  
  // 🚀 ADDED THIS SECTION FOR MULTI-DEVICE LOGIN SUPPORT
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        '127.0.0.1:3000',
        'https://dhd7ljlg-3000.inc1.devtunnels.ms' 
      ],
    },
  },
};

export default nextConfig;