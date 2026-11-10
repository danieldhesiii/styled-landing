/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["sharp"],
  outputFileTracingIncludes: {
    '/api/admin/crescent-moon-preview/*': ['./private/supplier-previews/crescent-moon/*.webp'],
  },
};

export default nextConfig;
