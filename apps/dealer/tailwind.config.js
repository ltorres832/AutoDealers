/** @type {import('tailwindcss').Config} */
const base = require('../../packages/shared/tailwind.config.base.js');

module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      ...base.theme.extend,
    },
  },
  plugins: [],
};
