/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // 바이브 코딩 테마 — 보라(brand) + 시안(accent)
        brand: { DEFAULT: '#8b5cf6', dark: '#7c3aed', light: '#ede9fe' },
        accent: '#22d3ee',
        ink: { DEFAULT: '#0b0b12', 800: '#13131d', 700: '#1b1b28' },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
      },
      animation: {
        float: 'float 7s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
