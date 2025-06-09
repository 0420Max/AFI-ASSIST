/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'afi-orange': '#FFA500',
        'afi-dark': '#3B5793',
        'afi-grey': '#334155',
        'afi-dark-secondary': '#4B6FA1',
      },
      fontFamily: {
        jamjuree: ['Bai Jamjuree', 'sans-serif'],
      },
    },
  },
  plugins: [],
}