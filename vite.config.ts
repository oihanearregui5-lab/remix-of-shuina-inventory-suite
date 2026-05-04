import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "apple-touch-icon.png", "robots.txt"],
      manifest: {
        name: "Transtubari · Control horario",
        short_name: "Transtubari",
        description: "Plataforma interna de fichajes, tareas y operación diaria.",
        theme_color: "#17355F",
        background_color: "#F4F7FB",
        display: "standalone",
        start_url: "/",
        scope: "/",
        lang: "es",
        orientation: "portrait",
        icons: [
          { src: "/favicon.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/favicon.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },
      workbox: {
        navigateFallbackDenylist: [/^\/auth/, /^\/~oauth/, /^\/api\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/data\/.*\.xlsx$/,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "transtubari-data",
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          {
            urlPattern: /\/assets\/.*\.(?:png|jpg|jpeg|webp|svg)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "transtubari-images",
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: ({ url, request }) =>
              url.hostname.endsWith(".supabase.co") &&
              url.pathname.startsWith("/rest/v1/") &&
              request.method === "GET",
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-rest-cache",
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 12 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.hostname.endsWith(".supabase.co") &&
              url.pathname.startsWith("/storage/v1/object/"),
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "supabase-storage-cache",
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ].filter(Boolean),
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          query: ["@tanstack/react-query"],
          ui: ["lucide-react", "sonner", "date-fns"],
          excel: ["xlsx"],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
}));
