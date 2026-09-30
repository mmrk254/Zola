import withPWAInit, { runtimeCaching as defaultCaching } from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  cacheOnFrontEndNav: false,
  cacheStartUrl: false,
  reloadOnOnline: false,
  workboxOptions: {
    runtimeCaching: [
      {
        // Auth redirects, API data and RSC payloads must always use the live session.
        urlPattern: ({ url, sameOrigin }) => url.pathname.startsWith("/auth/v1/") || (sameOrigin && !url.pathname.startsWith("/_next/static/") && !/\.(?:png|jpg|jpeg|svg|webp|ico|woff2?|css|js)$/.test(url.pathname)),
        handler: "NetworkOnly",
      },
      ...defaultCaching,
    ],
  },
  fallbacks: {
    document: "/offline"
  }
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: process.cwd()
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }]
  }
};

export default withPWA(nextConfig);
