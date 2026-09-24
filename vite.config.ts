import { defineConfig } from "vite";

export default defineConfig({
  base: "/am-i-unlucky/",
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
