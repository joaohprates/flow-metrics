/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
  reactStrictMode: true,
  agentRules: false,
};

export default nextConfig;
