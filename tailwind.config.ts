import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					container: 'hsl(var(--primary-container))',
					fixed: 'hsl(var(--primary-fixed))',
					'fixed-dim': 'hsl(var(--primary-fixed-dim))',
					'on-fixed': 'hsl(var(--on-primary-fixed))',
					'on-fixed-variant': 'hsl(var(--on-primary-fixed-variant))',
					'on-container': 'hsl(var(--on-primary-container))',
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))',
					container: 'hsl(var(--secondary-container))',
					fixed: 'hsl(var(--secondary-fixed))',
					'fixed-dim': 'hsl(var(--secondary-fixed-dim))',
					'on-fixed': 'hsl(var(--on-secondary-fixed))',
					'on-fixed-variant': 'hsl(var(--on-secondary-fixed-variant))',
					'on-container': 'hsl(var(--on-secondary-container))',
				},
				tertiary: {
					DEFAULT: 'hsl(var(--tertiary))',
					foreground: 'hsl(var(--tertiary-foreground))',
					container: 'hsl(var(--tertiary-container))',
					fixed: 'hsl(var(--tertiary-fixed))',
					'fixed-dim': 'hsl(var(--tertiary-fixed-dim))',
					'on-fixed': 'hsl(var(--on-tertiary-fixed))',
					'on-fixed-variant': 'hsl(var(--on-tertiary-fixed-variant))',
					'on-container': 'hsl(var(--on-tertiary-container))',
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				surface: {
					DEFAULT: 'hsl(var(--surface))',
					bright: 'hsl(var(--surface-bright))',
					dim: 'hsl(var(--surface-dim))',
					'container-lowest': 'hsl(var(--surface-container-lowest))',
					'container-low': 'hsl(var(--surface-container-low))',
					container: 'hsl(var(--surface-container))',
					'container-high': 'hsl(var(--surface-container-high))',
					'container-highest': 'hsl(var(--surface-container-highest))',
					tint: 'hsl(var(--surface-tint))',
				},
				'on-surface': 'hsl(var(--on-surface))',
				'on-surface-variant': 'hsl(var(--on-surface-variant))',
				'on-background': 'hsl(var(--on-background))',
				'inverse-surface': 'hsl(var(--inverse-surface))',
				'inverse-on-surface': 'hsl(var(--inverse-on-surface))',
				'inverse-primary': 'hsl(var(--inverse-primary))',
				error: {
					DEFAULT: 'hsl(var(--error))',
					container: 'hsl(var(--error-container))',
					on: 'hsl(var(--on-error))',
					'on-container': 'hsl(var(--on-error-container))',
				},
				outline: 'hsl(var(--outline))',
				'outline-variant': 'hsl(var(--outline-variant))',
			},
			fontFamily: {
				headline: ['Manrope', 'sans-serif'],
				body: ['Inter', 'sans-serif'],
				label: ['Inter', 'sans-serif'],
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				xl: '0.75rem',
				'2xl': '1rem',
				'3xl': '1.5rem',
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
