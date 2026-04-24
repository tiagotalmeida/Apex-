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
        display: ['Russo One', 'sans-serif'],
        mono:    ['Orbitron', 'monospace'],
      },
      colors: {
        racing: {
          red:    '#E8001A',
          orange: '#FF6B00',
          dark:   '#0f0f0f',
          card:   '#161616',
          panel:  '#1a1a1a',
          green:  '#00C853',
          yellow: '#FFD600',
          white:  '#F5F5F5',
        },
      },
      boxShadow: {
        'glow-red':   '0 0 20px rgba(232,0,26,0.5)',
        'glow-green': '0 0 20px rgba(0,200,83,0.5)',
        'glow-white': '0 0 15px rgba(245,245,245,0.2)',
      },
    },
  },
  plugins: [],
};
