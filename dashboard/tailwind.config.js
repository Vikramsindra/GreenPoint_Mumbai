// filepath: dashboard/tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'sans-serif'] },
      colors: {
        primary: { DEFAULT: '#16a34a', dark: '#15803d', light: '#f0fdf4', muted: '#dcfce7' },
      },
    },
  },
  plugins: [],
};
