/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#606C38', // Olive
          dark: '#283618',    // Dark Forest
        },
        forest: '#283618',
        ivory: '#FEFAE0',     // Warm Ivory
        gold: '#DDA15E',      // Sand Gold
        copper: '#BC6C25',    // Burnt Copper
        surface: {
          DEFAULT: '#FEFAE0',
          container: '#f2efd5',
          low: '#f8f4db',
          high: '#ede9cf',
          highest: '#e7e3ca',
          lowest: '#ffffff',
        },
        outline: '#77786b',
        'outline-variant': '#c7c8b9',
        'on-surface': '#283618',
        'on-surface-variant': '#586249',
      },
      fontFamily: {
        allura: ['Allura', 'cursive'],
        soria: ['Soria', 'serif'],
        inter: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.125rem', // 2px
        lg: '0.25rem',        // 4px
        xl: '0.5rem',         // 8px
        full: '9999px',
      },
    },
  },
  plugins: [],
}
