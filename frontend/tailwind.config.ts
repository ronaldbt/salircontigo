import type { Config } from 'tailwindcss'

export default {
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Nunito', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        wine: '#6d3048',
      },
    },
  },
} satisfies Config
