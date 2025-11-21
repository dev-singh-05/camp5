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
        // Mapped to CSS variables for theme switching
        'background': 'var(--background)',
        'foreground': 'var(--foreground)',
        'card-bg': 'var(--card-bg)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',

        // Happy Colors (Dynamic based on theme)
        'happy-coral': 'var(--happy-coral)',
        'happy-yellow': 'var(--happy-yellow)',
        'happy-mint': 'var(--happy-mint)',
        'happy-periwinkle': 'var(--happy-sky)', // Renaming key conceptually but keeping old name for compat if needed, or mapping to sky
        'happy-sky': 'var(--happy-sky)',
        'happy-lilac': 'var(--happy-lilac)',

        'happy-dark-bg': '#121212',
        'happy-light-bg': '#F9F9F9', // Cream/Off-white (Legacy?)
      },
      borderRadius: {
        'bento': '24px', // Highly rounded
      },
    },
  },
  plugins: [],
  
};
