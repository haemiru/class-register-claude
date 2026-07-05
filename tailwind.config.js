/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // 브레인센트 테마 — 세이지(포인트) + 스카이블루(서브) + 해상 코랄(강조), 아이보리 배경
        sage: { DEFAULT: '#7C9070', dark: '#5f7256', light: '#e8efe3' },
        sky: { DEFAULT: '#A7C7E7', light: '#e7f0f9' },
        coral: { DEFAULT: '#E9A178', dark: '#d4835a' },
        paper: { DEFAULT: '#FBFAF6', 100: '#ffffff', 200: '#f2f0e8' },
        accent: '#E9A178',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
      },
      animation: {
        float: 'float 9s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
