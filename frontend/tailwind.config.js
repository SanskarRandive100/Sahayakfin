/** @type {import('tailwindcss').Config} */
import animate from 'tailwindcss-animate'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        bg: '#F3F6F9',
        tint: '#EDF1F5',
        zebra: '#F7F9FB',
        surface: '#FFFFFF',
        ink: '#0F1E2E',
        'ink-2': '#4B5B6B',
        muted: { DEFAULT: '#55616D', foreground: '#55616D' },
        line: '#E3E8EE',
        neutral: '#D5DAE3',
        mark: '#0E7C70',
        strong: '#1A7F37',
        good: '#2DA44E',
        fair: '#BF8700',
        'fair-ink': '#8A6100',
        building: '#6E7781',
        risk: '#CF222E',
        info: '#2F5BD3',
        marigold: '#0E7C70',
        brand: {
          DEFAULT: '#0E7C70',
          50: '#E7F2F1',
          100: '#CFE7E4',
          700: '#0E7C70',
          800: '#0A6359',
          900: '#0A6359',
        },
      },
      fontFamily: {
        sans: ['Inter', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
      },
      borderRadius: { card: '20px', btn: '14px', lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)' },
      boxShadow: {
        card: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 8px 30px rgba(15,35,60,0.08)',
        pop: 'inset 0 1px 0 rgba(255,255,255,0.8), 0 16px 40px rgba(15,35,60,0.14)',
        btn: '0 6px 16px rgba(14,124,112,0.25)',
      },
    },
  },
  plugins: [animate],
}
