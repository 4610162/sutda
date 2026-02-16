import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url"; // 경로 계산을 위한 유틸리티

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      // @를 src 폴더로 매핑
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // @convex를 상위 폴더의 convex/_generated로 매핑 (가장 중요!)
      "@convex": fileURLToPath(new URL("../convex/_generated", import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
});