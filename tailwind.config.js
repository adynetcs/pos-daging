/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#FBF1F2', 100: '#F6E0E2', 200: '#EDC0C4', 300: '#DE939A',
          400: '#C9606A', 500: '#B23A45', 600: '#9A2632', 700: '#841D28',
          800: '#6C1821', 900: '#59161E',
        },
        ink: { 900: '#1F1416', 800: '#2A1C1F', 700: '#3A2A2D' },
        canvas: '#F5F5F6',
      },
      boxShadow: {
        card: '0 1px 2px rgba(31,20,22,0.05), 0 1px 1px rgba(31,20,22,0.03)',
        pop: '0 12px 32px -8px rgba(31,20,22,0.25)',
      },
    },
  },
  plugins: [],
};
