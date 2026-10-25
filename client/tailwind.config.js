/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        surface: { DEFAULT: '#0f0f17', card: '#16161f', border: '#ffffff14' },
        accent: {
          purple: '#a855f7', green: '#22c55e', red: '#ef4444',
          amber: '#f59e0b', blue: '#3b82f6', cyan: '#06b6d4',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.32,0.72,0,1)',
        'fade-in': 'fadeIn 0.3s ease',
        'slide-right': 'slideRight 0.4s ease',
        'glow-red': 'glowRed 1s ease-in-out infinite alternate',
      },
      keyframes: {
        slideUp: { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideRight: { from: { opacity: 0, transform: 'translateX(40px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        glowRed: { from: { boxShadow: '0 0 6px #ef4444' }, to: { boxShadow: '0 0 20px #ef4444, 0 0 40px #ef444480' } },
      }
    }
  },
  plugins: []
}
