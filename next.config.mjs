/** @type {import('next').NextConfig} */
const privateNetworkDevOrigins = [
  'localhost',
  '*.localhost',
  '10.*.*.*',
  '192.168.*.*',
  ...Array.from({ length: 16 }, (_, index) => `172.${16 + index}.*.*`),
]

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: privateNetworkDevOrigins,
}

export default nextConfig
