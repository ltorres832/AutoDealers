/** @type {import('tailwindcss').Config} */
module.exports = {
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
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      boxShadow: {
        elegant: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'elegant-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
    },
  },
};
