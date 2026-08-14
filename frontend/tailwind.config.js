export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#9baba5', // Sage green / soft neutral
          light: '#c8d4ce',
          dark: '#6d7c76'
        },
        background: '#fcfcfc',
        surface: '#ffffff',
      }
    },
  },
  plugins: [],
}
