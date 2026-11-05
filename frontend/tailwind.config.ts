import type { Config } from 'tailwindcss';
import rtl from 'tailwindcss-rtl';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        brand: {
          50: '#effcf8', 100: '#c9f7e9', 200: '#94edd7', 300: '#58ddc1',
          400: '#2bc4a7', 500: '#12a88e', 600: '#0b8674', 700: '#0d6b5f',
          800: '#10554d', 900: '#114740', 950: '#042b28'
        },
        navy: { 950: '#09121f', 900: '#0e1929', 850: '#142235', 800: '#1b2b40' },
      },
      fontFamily: {
        sans: ['Inter Variable', 'Noto Sans Arabic Variable', 'ui-sans-serif', 'system-ui'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,.025), 0 4px 16px rgba(15,23,42,.035)',
        lift: '0 16px 40px rgba(15,23,42,.12)',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(6px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'pulse-soft': { '0%,100%': { opacity: '1' }, '50%': { opacity: '.45' } },
      },
      animation: { 'fade-up': 'fade-up .35s ease-out both', 'pulse-soft': 'pulse-soft 2s ease-in-out infinite' },
    },
  },
  plugins: [rtl],
};
export default config;
