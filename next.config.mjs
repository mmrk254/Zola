/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep Turbopack inside this nested app. Without an explicit root, it finds
  // the parent workspace lockfile and can serve mismatched development assets.
  turbopack: {
    root: process.cwd()
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" }
    ]
  }
};

export default nextConfig;
