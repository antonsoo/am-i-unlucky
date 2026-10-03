import { defineConfig } from "vite";
import { contentSecurityPolicy } from "./vite.csp.ts";

export default defineConfig({
  base: "/am-i-unlucky/",
  plugins: [contentSecurityPolicy()],
  build: {
    target: "es2022",
    sourcemap: true,
  },
});
