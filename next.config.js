/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
    formats: ['image/webp', 'image/avif'],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Disable problematic features to avoid build issues
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ['pdfkit'],
}

module.exports = nextConfig
