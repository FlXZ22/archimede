import { defineConfig } from "vite";
export default defineConfig({
  root: "frontend",
  define: { __VERCEL__: JSON.stringify(process.env.VERCEL === "1") },
  build: { outDir: "../dist", emptyOutDir: true },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8787",
      "/assets": "http://127.0.0.1:8787",
      "/data/originals": "http://127.0.0.1:8787",
    },
  },
});
