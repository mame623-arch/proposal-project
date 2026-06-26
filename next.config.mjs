/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // hwp.js(ESM 빌드)가 Node 전용 'fs'를 import 하므로 클라이언트 번들에서 비활성화한다.
    config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    return config;
  },
};

export default nextConfig;
