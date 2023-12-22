/// <reference types="vitest" />
import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  test: {
    setupFiles: "./src/tests/setup.ts",
    testTimeout: 10000,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "/index.html"),
        ppu: resolve(__dirname, "/ppu.html"),
      },
    },
  },
});
