/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        jarvis: {
          bg: '#050505',        // Deep matte black background
          panel: '#111111',     // Slightly lighter for panels
          border: '#27272a',    // Subtle border
          cyan: '#06b6d4',      // Main accent
          blue: '#3b82f6',      // Highlight accent
          purple: '#a855f7',    // Thinking/Processing accent
          red: '#ef4444',       // Alert/Listening accent
          text: '#f4f4f5',      // Primary text
          textMuted: '#71717a'  // Secondary text
        }
      },
      fontFamily: {
        mono: ['"Share Tech Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
        'spin-reverse': 'spin 12s linear infinite reverse',
      }
    },
  },
  plugins: [],
}
