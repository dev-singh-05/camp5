/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'happy-coral': '#FF6B6B',
        'happy-yellow': '#FFD93D',
        'happy-mint': '#6BCB77',
        'happy-periwinkle': '#4D96FF',
        'happy-dark-bg': '#121212',
        'happy-light-bg': '#F9F9F9', // Cream/Off-white
      },
      borderRadius: {
        'bento': '24px', // Highly rounded
      },
    },
  },
  plugins: [],
  
};
