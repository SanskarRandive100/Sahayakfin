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
        bg: '#FBFAF8',
        paper: '#FBFAF8',
        tint: '#F4F2EE',
        zebra: '#FAF9F6',
        surface: '#FFFFFF',
        ink: '#1A1D23',
        'ink-2': '#5F6470',
        muted: { DEFAULT: '#6B7079', foreground: '#6B7079' },
        line: '#E7E4DF',
        neutral: '#D5DAE3',
        terracotta: '#C2603A',
        strong: '#1A7F37',
        good: '#2DA44E',
        fair: '#BF8700',
        building: '#6E7781',
        risk: '#CF222E',
        info: '#1D3557',
        marigold: '#C2603A',
        brand: {
          DEFAULT: '#1D3557',
          50: '#EAF0F7',
          100: '#DCE5F0',
          700: '#1D3557',
          800: '#16294A',
          900: '#16294A',
        },
      },
      fontFamily: {
        sans: ['Inter', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
        serif: ['"Source Serif 4"', '"Noto Sans Devanagari"', 'Georgia', 'serif'],
      },
      borderRadius: { card: '12px', btn: '10px', lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)' },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,.04)',
        pop: '0 8px 24px rgba(16,24,40,.08)',
      },
    },
  },
  plugins: [animate],
}
