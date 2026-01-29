/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0f172a',
        sand: '#f8f5f0',
        accent: '#ff6b35',
        accentSoft: '#ffe3d5'
      }
    }
  },
  plugins: []
}
