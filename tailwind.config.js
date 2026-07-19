/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0e1a', surface: '#111827', card: '#1e293b',
        cyan: { DEFAULT: '#22d3ee', deep: '#06b6d4' },
        halal: '#34d399', caution: '#fbbf24', haram: '#f87171',
        text: '#e2e8f0', muted: '#94a3b8'
      },
      fontFamily: {
        body: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
