/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Inter', 'sans-serif'],
        display: ['Bebas Neue', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
        orb:     ['Orbitron', 'monospace'],
      },
      colors: {
        racing: {
          red:    '#FF3B30',
          orange: '#FF9F0A',
          green:  '#30D158',
          yellow: '#FFD60A',
          cyan:   '#64D2FF',
          dark:   '#0C0C0E',
          card:   '#141418',
          panel:  '#1C1C22',
          border: 'rgba(255,255,255,0.07)',
          white:  '#F5F5F5',
        },
      },
      boxShadow: {
        'glow-red':    '0 0 20px rgba(255,59,48,0.4)',
        'glow-green':  '0 0 20px rgba(48,209,88,0.4)',
        'glow-yellow': '0 0 20px rgba(255,214,10,0.4)',
      },
    },
  },
  plugins: [],
};
