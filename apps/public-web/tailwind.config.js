/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/*/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#0A0A0A',
          'black-deep': '#050505',
          red: '#E10600',
          'red-bright': '#FF1A1A',
          silver: '#C0C0C0',
          white: '#FFFFFF',
        },
        primary: {
          50: '#fff1f1',
          100: '#ffe0df',
          200: '#ffb8b6',
          300: '#ff8a86',
          400: '#FF1A1A',
          500: '#f01510',
          600: '#E10600',
          700: '#b80500',
          800: '#8a0400',
          900: '#5c0300',
        },
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        marquee: 'marquee 40s linear infinite',
        shimmer: 'shimmer 2s infinite',
      },
    },
  },
  plugins: [],
};
