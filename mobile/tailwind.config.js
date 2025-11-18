/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom colors from web app
        slate: {
          950: '#0f1729',
        },
        purple: {
          950: '#1e1b4b',
        },
      },
    },
  },
  plugins: [],
}
