import tailwindcss from "@tailwindcss/postcss";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  publicDir: "client/public",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    tanstackRouter({
      target: "react",
      routesDirectory: "./client/routes",
      generatedRouteTree: "./client/routeTree.gen.ts",
      autoCodeSplitting: true,
    }),
    react(),
  ],
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
  },
  server: {
    port: parseInt(process.env.PORT_CLIENT || "6391"),
    proxy: {
      "/trpc": {
        target: `http://localhost:${process.env.PORT_SERVER || "6390"}`,
        changeOrigin: true,
      },
      "/api": {
        target: `http://localhost:${process.env.PORT_SERVER || "6390"}`,
        changeOrigin: true,
      },
    },
  },
});
