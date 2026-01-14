import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Keep chunking stable across OS path separators.
          const inNodeModules = /[\\/]node_modules[\\/]/.test(id);
          if (!inNodeModules) return;

          if (/[\\/]node_modules[\\/](react|react-dom|scheduler|use-sync-external-store)[\\/]/.test(id)) {
            return "react-vendor";
          }

          if (
            /[\\/]node_modules[\\/]@radix-ui[\\/]/.test(id) ||
            /[\\/]node_modules[\\/](cmdk|vaul|lucide-react|framer-motion|class-variance-authority|clsx)[\\/]/.test(id)
          ) {
            return "ui-vendor";
          }

          if (
            /[\\/]node_modules[\\/]@tanstack[\\/]/.test(id) ||
            /[\\/]node_modules[\\/](react-hook-form|date-fns)[\\/]/.test(id)
          ) {
            return "data-vendor";
          }

          if (
            /[\\/]node_modules[\\/](recharts|victory-vendor)[\\/]/.test(id) ||
            /[\\/]node_modules[\\/]d3-[^\\/]+[\\/]/.test(id)
          ) {
            return "charts-vendor";
          }

          if (/[\\/]node_modules[\\/]xlsx[\\/]/.test(id)) {
            return "xlsx";
          }

          return "vendor";
        },
      },
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
