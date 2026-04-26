import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: [
          'Fraunces',
          'Tiempos Headline',
          'Iowan Old Style',
          'Georgia',
          'serif',
        ],
        serif: [
          'Newsreader',
          'Iowan Old Style',
          'Source Serif Pro',
          'Georgia',
          'serif',
        ],
        sans: [
          'Newsreader',
          'Iowan Old Style',
          'Source Serif Pro',
          'Georgia',
          'serif',
        ],
        mono: [
          'JetBrains Mono',
          'IBM Plex Mono',
          'ui-monospace',
          'SFMono-Regular',
          'monospace',
        ],
      },
      colors: {
        // Paper & ink semantic tokens
        paper: {
          DEFAULT: 'rgb(var(--paper) / <alpha-value>)',
          2: 'rgb(var(--paper-2) / <alpha-value>)',
          3: 'rgb(var(--paper-3) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          2: 'rgb(var(--ink-2) / <alpha-value>)',
          3: 'rgb(var(--ink-3) / <alpha-value>)',
          4: 'rgb(var(--ink-4) / <alpha-value>)',
        },
        grid: {
          DEFAULT: 'rgb(var(--grid) / <alpha-value>)',
          strong: 'rgb(var(--grid-strong) / <alpha-value>)',
        },
        blueprint: {
          DEFAULT: 'rgb(var(--blueprint) / <alpha-value>)',
          2: 'rgb(var(--blueprint-2) / <alpha-value>)',
        },
        terracotta: {
          DEFAULT: 'rgb(var(--terracotta) / <alpha-value>)',
          2: 'rgb(var(--terracotta-2) / <alpha-value>)',
        },
        sage: 'rgb(var(--sage) / <alpha-value>)',
        wine: 'rgb(var(--wine) / <alpha-value>)',
        gold: 'rgb(var(--gold) / <alpha-value>)',

        // shadcn token bridge — keep existing components working
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      letterSpacing: {
        wider: '0.08em',
        widest: '0.18em',
      },
    },
  },
  plugins: [],
};

export default config;
