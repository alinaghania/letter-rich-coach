/** @type {import('next').NextConfig} */
const nextConfig = {
  // En dev, proxy /api vers le backend FastAPI local (uvicorn :8000).
  // En prod (Vercel), c'est vercel.json qui route /api vers api/index.py.
  async rewrites() {
    if (process.env.NODE_ENV === "production") return [];
    return [
      { source: "/api/:path*", destination: "http://127.0.0.1:8000/api/:path*" },
    ];
  },
};
module.exports = nextConfig;
