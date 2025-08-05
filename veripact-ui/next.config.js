/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '') || 'dohonxiumquaxrkhijth.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/validate/:linkUuid',
        destination: 'http://localhost:3001/api/validate/:linkUuid',
      },
      // Add more rewrites here if needed
    ];
  },
};

module.exports = nextConfig;