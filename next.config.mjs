/** @type {import('next').NextConfig} */
const privateNetworkDevOrigins = [
  'localhost',
  '*.localhost',
  '10.*.*.*',
  '192.168.*.*',
  ...Array.from({ length: 16 }, (_, index) => `172.${16 + index}.*.*`),
]

const nextConfig = {
  async redirects() {
    return [
      {
        source: '/LogIn',
        destination: '/superadmin',
        permanent: false,
      },
    ];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  allowedDevOrigins: privateNetworkDevOrigins,
}

export default nextConfig
