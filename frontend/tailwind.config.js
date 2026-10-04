/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    './stores/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        paper: '#F4F0E6',
        ink: '#0A0A0A',
        'acid-yellow': '#FFE600',
        'hot-pink': '#FF3EA5',
        'electric-blue': '#1D4ED8',
        'signal-red': '#DC2626',
        'toxic-green': '#19E36B',
        'hazard-orange': '#FF8A00',
        'hyper-violet': '#7C3AED',
        'neon-cyan': '#00E5FF',
        status: {
          todo: '#F4F0E6',
          in_progress: '#2B4BFF',
          in_review: '#8B5CF6',
          done: '#19E36B',
        },
        priority: {
          low: '#00E5FF',
          medium: '#FFE600',
          high: '#FF8A00',
          urgent: '#DC2626',
        },
        risk: {
          low: '#19E36B',
          medium: '#FFE600',
          high: '#FF8A00',
          critical: '#DC2626',
        },
      },
      boxShadow: {
        'brutal-sm': '2px 2px 0px #0A0A0A',
        'brutal': '4px 4px 0px #0A0A0A',
        'brutal-md': '6px 6px 0px #0A0A0A',
        'brutal-lg': '8px 8px 0px #0A0A0A',
        'brutal-xl': '12px 12px 0px #0A0A0A',
        'brutal-dark-sm': '2px 2px 0px #FFE600',
        'brutal-dark': '4px 4px 0px #FFE600',
        'brutal-dark-md': '6px 6px 0px #FFE600',
        'brutal-dark-lg': '8px 8px 0px #FFE600',
        'brutal-dark-xl': '12px 12px 0px #FFE600',
        'brutal-white': '4px 4px 0px #FFFFFF',
        'brutal-white-lg': '8px 8px 0px #FFFFFF',
      },
      fontFamily: {
        display: ['var(--font-archivo-black)', 'Impact', 'sans-serif'],
        body: ['var(--font-space-grotesk)', 'sans-serif'],
        mono: ['var(--font-space-mono)', 'monospace'],
      },
      borderWidth: {
        '3': '3px',
        '4': '4px',
        '5': '5px',
        '6': '6px',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        marqueeReverse: {
          '0%': { transform: 'translateX(-50%)' },
          '100%': { transform: 'translateX(0%)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-6px)' },
          '40%, 80%': { transform: 'translateX(6px)' },
        },
        stamp: {
          '0%': { transform: 'scale(1.5) rotate(-10deg)', opacity: '0' },
          '70%': { transform: 'scale(0.95) rotate(2deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        flashYellow: {
          '0%': { backgroundColor: '#FFE600' },
          '100%': { backgroundColor: 'transparent' },
        },
        pulseBorder: {
          '0%, 100%': { borderColor: '#0A0A0A' },
          '50%': { borderColor: '#FF2E2E' },
        },
      },
      animation: {
        marquee: 'marquee 25s linear infinite',
        'marquee-fast': 'marquee 12s linear infinite',
        'marquee-reverse': 'marqueeReverse 25s linear infinite',
        shake: 'shake 0.3s steps(4) 1',
        stamp: 'stamp 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        flash: 'flashYellow 1.5s ease-out',
        'pulse-border': 'pulseBorder 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
