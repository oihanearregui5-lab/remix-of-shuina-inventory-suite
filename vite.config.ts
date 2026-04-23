import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createRequire } from "module";
import { componentTagger } from "lovable-tagger";

const require = createRequire(import.meta.url);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      { find: /^react$/, replacement: require.resolve("react") },
      { find: /^react-dom$/, replacement: require.resolve("react-dom") },
      { find: /^react\/jsx-runtime$/, replacement: require.resolve("react/jsx-runtime") },
      { find: /^react\/jsx-dev-runtime$/, replacement: require.resolve("react/jsx-dev-runtime") },
    ],
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
