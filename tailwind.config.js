/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#2C5F8D',
          dark: '#234c70',
          light: '#eaf2fa',
        },
        accent: '#FF9933',
      },
    },
  },
  plugins: [],
}
