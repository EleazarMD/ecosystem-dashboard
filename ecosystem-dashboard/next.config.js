/** @type {import('next').NextConfig} */
const APPROVAL_SERVICE_URL =
  process.env.APPROVAL_SERVICE_URL || 'http://127.0.0.1:8407';

const PI_WORKSPACE_URL =
  process.env.PI_WORKSPACE_URL || 'http://127.0.0.1:8762';

const PCG_URL =
  process.env.PCG_URL || 'http://127.0.0.1:8765';

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  /**
   * JIT Zero-Tolerance Infrastructure Approvals is now a standalone microservice
   * running on port 8407. The Dashboard is only a UI consumer. All /api/approvals
   * and /api/notifications traffic is proxied to the approval-service so existing
   * web/iOS callers continue to work unchanged while the internals are decoupled.
   *
   * The legacy Next.js route handlers in pages/api/approvals and
   * pages/api/notifications have been superseded — these rewrites take precedence.
   */
  async redirects() {
    return [
      {
        source: '/tesla/nova',
        destination: '/tesla',
        permanent: false,
      },
    ];
  },

  async rewrites() {
    return {
      beforeFiles: [
        { source: '/api/approvals',              destination: `${APPROVAL_SERVICE_URL}/api/approvals` },
        { source: '/api/approvals/:path*',       destination: `${APPROVAL_SERVICE_URL}/api/approvals/:path*` },
        { source: '/api/notifications',          destination: `${APPROVAL_SERVICE_URL}/api/notifications` },
        { source: '/api/notifications/:path*',   destination: `${APPROVAL_SERVICE_URL}/api/notifications/:path*` },
        // Proxy Pi Workspace socket.io traffic
        { source: '/socket.io/:path*',           destination: `${PI_WORKSPACE_URL}/socket.io/:path*` },
        // Proxy PCG (Personal Context Graph) API
        { source: '/api/pcg/:path*',             destination: `${PCG_URL}/api/:path*` },
        { source: '/api/kg/:path*',              destination: `${PCG_URL}/api/kg/:path*` },
        { source: '/api/liam/:path*',            destination: `${PCG_URL}/api/liam/:path*` },
      ],
    };
  },

  async headers() {
    return [
      {
        source: '/audio/tts-cache/:file*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=2592000, immutable' },
        ],
      },
    ];
  },

  webpack: (config, { isServer }) => {
    // Fix for pg and other Node.js modules in client-side bundles
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
        'pg-native': false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
