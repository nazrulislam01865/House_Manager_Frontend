import type { NextConfig } from "next";
const origin = process.env.API_ORIGIN || "http://127.0.0.1:4000";
if (!/^https?:\/\//.test(origin))
  throw Error("API_ORIGIN must be an HTTP(S) URL");
const config: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  async rewrites() {
    return [
      { source: "/api/v1/:path*", destination: `${origin}/api/v1/:path*` },
    ];
  },
};
export default config;
