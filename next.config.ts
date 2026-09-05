import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Allow development cross-origin requests from AI Studio Cloud Run preview origins
  allowedDevOrigins: [
    'ais-dev-tswxzbiiquaigoqntznvtr-24396562925.asia-southeast1.run.app',
    'ais-pre-tswxzbiiquaigoqntznvtr-24396562925.asia-southeast1.run.app',
    '*.*.run.app',
    '*.run.app',
    'localhost:3000',
  ],
  // Allow access to remote image placeholder.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**', // This allows any path under the hostname
      },
    ],
  },
  transpilePackages: ['motion'],
  webpack: (config, {dev}) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
