/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          pink: '#ed2553',
          dark: '#1f1f23',
          card: '#2b2b31',
          border: '#3c3c43',
        }
      }
    },
  },
  plugins: [],
}
