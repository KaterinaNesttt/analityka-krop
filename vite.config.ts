import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  server: {
    port: 8080,
    proxy: {
      "/api": {
        target: "https://analityka-krop-api.roman-v-shkurenko.workers.dev",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
  },
});
