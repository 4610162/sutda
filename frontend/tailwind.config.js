/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        sutda: {
          dark:  "#1a0f0f",   // 어두운 목재
          brown: "#2c1a1a",   // 중간 목재 톤
          gold:  "#d4af37",   // 금색 포인트
          red:   "#8b0000",   // 포인트 레드
          green: "#1a5c2e",   // 게임 테이블 그린 (유지)
        },
      },
      fontFamily: {
        serif: ['"Noto Serif KR"', '"Nanum Myeongjo"', "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
