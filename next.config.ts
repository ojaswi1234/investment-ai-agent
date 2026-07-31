import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@xenova/transformers', 'sharp', 'pdf-parse', 'pdf2json'],
};

export default nextConfig;
