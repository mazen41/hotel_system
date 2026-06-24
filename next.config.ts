import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Clean URLs — no trailing slashes
  trailingSlash: false,

  // Rewrites for API proxy in development (avoids CORS if needed)
  // async rewrites() {
  //   return [
  //     {
  //       source: '/api/:path*',
  //       destination: 'http://hotleios.xo.je/api/:path*',
  //     },
  //   ];
  // },
};

export default nextConfig;
