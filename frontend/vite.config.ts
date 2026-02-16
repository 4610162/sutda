import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // 뒤에 /index를 빼고 폴더 경로만 정확히 지정합니다.
      "@convex": fileURLToPath(new URL("../convex/_generated", import.meta.url)),
    },
    // 확장자가 없어도 찾을 수 있도록 설정 추가 (매우 중요)
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  },
  server: {
    port: 5173,
  },
});