/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
    formats: ['image/webp', 'image/avif'],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Build optimization - disable problematic features
  swcMinify: true,
  experimental: {
    // Disable build traces to prevent stack overflow
    buildTraces: false,
    // Disable other experimental features that might cause issues
    optimizeCss: false,
    optimizePackageImports: [],
  },
  // Disable static optimization for problematic pages
  trailingSlash: false,
  // Reduce memory usage during build
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Reduce memory usage
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'async',
          cacheGroups: {
            default: false,
            vendors: false,
          },
        },
      };
    }
    return config;
  },
}

module.exports = nextConfig
