export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '"Hind Siliguri"', 'system-ui', 'sans-serif'],
        arabic: ['Amiri', '"Noto Naskh Arabic"', '"Traditional Arabic"', 'serif'],
      },
      keyframes: {
        fadeUp: { '0%': { opacity: 0, transform: 'translateY(10px)' }, '100%': { opacity: 1, transform: 'none' } },
        pop: { '0%': { transform: 'scale(.97)' }, '55%': { transform: 'scale(1.02)' }, '100%': { transform: 'scale(1)' } },
        sheet: { '0%': { transform: 'translateY(40px)', opacity: 0 }, '100%': { transform: 'none', opacity: 1 } },
      },
      animation: {
        'fade-up': 'fadeUp .4s ease-out both',
        pop: 'pop .28s ease-out',
        sheet: 'sheet .28s ease-out both',
      },
    },
  },
  plugins: [],
};
