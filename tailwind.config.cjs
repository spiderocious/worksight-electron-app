/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#22C55E',
          600: '#16A34A',
          700: '#15803D',
          800: '#166534',
          900: '#14532D',
        },
        ink: {
          DEFAULT: '#0F1B14',
          muted: '#4B5C53',
          soft: '#7B8B82',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          subtle: '#F7FAF8',
          sunken: '#EEF4F0',
        },
        line: '#E1ECE5',
        danger: '#B91C1C',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Newsreader', 'Inter', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '0.625rem',
        lg: '0.875rem',
        xl: '1.125rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15,27,20,0.04), 0 4px 12px rgba(15,27,20,0.04)',
        lift: '0 4px 16px rgba(20, 83, 45, 0.08)',
      },
    },
  },
  plugins: [],
};
