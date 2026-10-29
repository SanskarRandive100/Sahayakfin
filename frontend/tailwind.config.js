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
        bg: '#F8FAFC',
        surface: '#FFFFFF',
        ink: '#0F172A',
        'ink-2': '#334155',
        muted: { DEFAULT: '#64748B', foreground: '#64748B' },
        line: '#E2E8F0',
        strong: '#1A7F37',
        good: '#2DA44E',
        fair: '#BF8700',
        building: '#6E7781',
        risk: '#CF222E',
        info: '#2563EB',
        marigold: '#F5B700',
        brand: {
          DEFAULT: '#0F766E',
          50: '#F0FDFA',
          100: '#CCFBF1',
          700: '#0F766E',
          800: '#115E59',
          900: '#0B2A3C',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
      },
      borderRadius: { card: '16px', lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)' },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,.06), 0 4px 16px rgba(15,23,42,.06)',
      },
    },
  },
  plugins: [animate],
}
