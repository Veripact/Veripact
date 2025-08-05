/** @type {import('next').NextConfig} */
const nextConfig = {
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