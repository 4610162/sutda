import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  // 아래 설정을 추가하세요
  envPrefix: ["VITE_", "CONVEX_"], 
  server: {
    port: 5173,
  },
});