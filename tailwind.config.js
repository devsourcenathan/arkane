/** @type {import('tailwindcss').Config} */

// Toutes les couleurs sont consommées via des variables CSS définies dans
// src/styles/tokens.css. Les composants n'utilisent QUE ces tokens sémantiques :
// changer la palette = éditer tokens.css (ou basculer [data-theme]) sans toucher aux composants.
const token = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: token("--bg"),
        "bg-deep": token("--bg-deep"),
        surface: token("--surface"),
        "surface-hover": token("--surface-hover"),
        "surface-strong": token("--surface-strong"),
        border: token("--border"),
        "border-strong": token("--border-strong"),
        fg: token("--text"),
        "fg-strong": token("--text-strong"),
        "fg-muted": token("--text-muted"),
        "fg-subtle": token("--text-subtle"),
        "fg-inverted": token("--text-inverted"),
        "btn-fg": token("--btn-primary-fg"),
        "btn-bg": token("--btn-primary-bg"),
        "btn-bg-hover": token("--btn-primary-bg-hover"),
        link: token("--link"),
        "link-hover": token("--link-hover"),
        ring: token("--ring"),
        overlay: token("--overlay"),
        neutral: {
          0: token("--c-black"),
          950: token("--c-neutral-950"),
          900: token("--c-neutral-900"),
          850: token("--c-neutral-850"),
          800: token("--c-neutral-800"),
          700: token("--c-neutral-700"),
          600: token("--c-neutral-600"),
          500: token("--c-neutral-500"),
          400: token("--c-neutral-400"),
          300: token("--c-neutral-300"),
          200: token("--c-neutral-200"),
          100: token("--c-neutral-100"),
          white: token("--c-white"),
        },
      },
      borderColor: {
        DEFAULT: token("--border"),
      },
      ringColor: {
        DEFAULT: token("--ring"),
      },
      fontFamily: {
        display: ["Archivo", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
      maxWidth: {
        content: "1280px",
        prose: "68ch",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.5s ease both",
        marquee: "marquee 32s linear infinite",
      },
    },
  },
  plugins: [],
};
