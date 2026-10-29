/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#f6f7f9',
        ink: '#111827',
        muted: '#6b7280',
        line: '#e5e7eb',
        strong: '#1a7f37',
        good: '#2da44e',
        fair: '#bf8700',
        building: '#6e7781',
        brand: '#0f766e',
      },
      fontFamily: {
        sans: ['Noto Sans', 'Noto Sans Devanagari', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(17,24,39,0.04)',
      },
    },
  },
  plugins: [],
}
