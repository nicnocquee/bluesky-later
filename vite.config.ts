import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  define: {
    "process.env.STORAGE_MODE": JSON.stringify(
      process.env.STORAGE_MODE || "local"
    ),
  },
  plugins: [react()],
  publicDir: "public", // This is already the default
  optimizeDeps: {
    exclude: ["lucide-react"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  worker: {
    format: "es",
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom"],
          "@atproto": ["@atproto/api"],
          "date-utils": ["date-fns"],
          "ui-components": [
            "react-hot-toast",
            "lucide-react",
            "class-variance-authority",
            "clsx",
            "tailwind-merge",
          ],
        },
      },
    },
  },
});
