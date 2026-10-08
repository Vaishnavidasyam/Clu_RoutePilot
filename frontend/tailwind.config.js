/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#123A55',
          'primary-dark': '#0D2536',
          accent: '#FF7A18',
          success: '#10A88A',
          warning: '#E9A23B',
          danger: '#D94B4B',
          info: '#3B82F6',
          bg: '#F5F8FA',
          surface: '#FFFFFF',
          border: '#DDE7ED',
          text: '#12324A',
          'text-secondary': '#71869A',
          'text-muted': '#94A3B8',
        },
        navy: {
          DEFAULT: '#123A55',
          light: '#1d4b6c',
          deep: '#0D2536',
          darkest: '#081a26'
        },
        mint: {
          DEFAULT: '#c8ebe7',
          light: '#e3f5f2',
          soft: '#bfe3de'
        },
        teal: {
          DEFAULT: '#10A88A',
          slate: '#57989f',
          dark: '#0c856d'
        },
        gold: {
          DEFAULT: '#E9A23B',
          dark: '#d18c28'
        },
        orange: {
          DEFAULT: '#FF7A18',
          dark: '#e06509'
        },
        ink: '#12324A'
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
