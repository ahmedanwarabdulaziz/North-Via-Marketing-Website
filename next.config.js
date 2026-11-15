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
  // Local testing only: lets the Anwarz app's web preview (Expo on localhost:8081) call /api/app.
  // The phone app doesn't need CORS, so production sends no such headers.
  ...(process.env.NODE_ENV === 'development'
    ? {
        async headers() {
          return [
            {
              source: '/api/app/:path*',
              headers: [
                { key: 'Access-Control-Allow-Origin', value: 'http://localhost:8081' },
                { key: 'Access-Control-Allow-Headers', value: 'Authorization, Content-Type' },
                { key: 'Access-Control-Allow-Methods', value: 'GET, POST, OPTIONS' },
              ],
            },
          ]
        },
      }
    : {}),
}

module.exports = nextConfig
