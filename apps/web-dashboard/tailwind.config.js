/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        jarvis: {
          bg: '#050505',
          panel: '#0a0a0a',
          border: '#1f2937',
          cyan: '#06b6d4',
          blue: '#3b82f6',
          purple: '#a855f7',
          red: '#ef4444',
          text: '#f3f4f6',
          textMuted: '#9ca3af',
        }
      }
    },
  },
  plugins: [],
}
