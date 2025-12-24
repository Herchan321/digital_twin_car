/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/traccar-proxy/:path*',
        destination: 'https://gps.gounane.ovh/:path*',
      },
    ]
  },
}

export default nextConfig