/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'Arial', 'sans-serif'],
      },
      colors: {
        colBlue: '#273d83',
        colBlue2: '#1f3170',
        colCyan: '#0d8eea',
        colYellow: '#ffd331',
      },
    },
  },
  plugins: [],
};
