import { defineConfig } from "vite";
export default defineConfig({
  root: "demo",
  build: { outDir: "../demo-dist", emptyOutDir: true },
  server: {
    host: "127.0.0.1",
    port: 5193,
    strictPort: true,
    fs: { allow: [".."] },
  },
});
