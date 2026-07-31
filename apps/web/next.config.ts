import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@repo/ui'],
  typedRoutes: true,
  cacheComponents: true,
}

export default nextConfig
