/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        krishi: {
          primary: '#2E7D32',
          dark: '#1B5E20',
          light: '#E8F5E9',
          bg: '#F6FBF4',
          accent: '#F9A825',
          danger: '#C62828',
          border: '#D7E7D5',
          card: '#FFFFFF',
          text: '#1E293B',
          muted: '#64748B',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      minHeight: {
        'touch': '48px',
      }
    },
  },
  plugins: [],
};
