/** @type {import('tailwindcss').Config} */
const brand = {
  primary: "#630ed4",
  "primary-container": "#7c3aed",
  "on-primary": "#ffffff",
  "on-primary-container": "#ede0ff",
  secondary: "#b5005d",
  "on-secondary": "#ffffff",
  "secondary-container": "#da2676",
  tertiary: "#8f1e62",
  surface: "#f8f9ff",
  background: "#f8f9ff",
  "on-background": "#121c2a",
  "on-surface": "#121c2a",
  "on-surface-variant": "#4a4455",
  outline: "#7b7487",
  "outline-variant": "#ccc3d8",
  "surface-container": "#e6eeff",
  "surface-container-low": "#eff4ff",
  "surface-container-high": "#dee9fc",
  "surface-container-highest": "#d9e3f6",
  "surface-container-lowest": "#ffffff",
  "surface-variant": "#d9e3f6",
  "surface-dim": "#d0dbed",
  "surface-bright": "#f8f9ff",
  "surface-tint": "#732ee4",
  "inverse-surface": "#27313f",
  "inverse-on-surface": "#eaf1ff",
  "inverse-primary": "#d2bbff",
  "primary-fixed": "#eaddff",
  "primary-fixed-dim": "#d2bbff",
  "on-primary-fixed": "#25005a",
  "secondary-fixed": "#ffd9e2",
  "secondary-fixed-dim": "#ffb1c7",
  "tertiary-fixed": "#ffd8e7",
  "tertiary-fixed-dim": "#ffafd3",
  "on-tertiary": "#ffffff",
  "on-tertiary-container": "#ffdce9",
  error: "#ba1a1a",
  "on-error": "#ffffff",
};

module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ...brand,
        // Intermediate slate steps used by the try-on studio chrome. Tailwind's default
        // slate scale jumps 500→600 and 800→900; without these, classes like
        // `bg-slate-850` silently emit nothing and the element renders unstyled.
        slate: {
          550: "#5b6779",
          850: "#172033",
        },
      },
      spacing: {
        // Tailwind's default scale has 3.5 but not 4.5; `h-4.5` was emitting no rule.
        4.5: "1.125rem",
        xs: "4px",
        sm: "12px",
        base: "8px",
        md: "24px",
        lg: "48px",
        xl: "80px",
        gutter: "24px",
        "margin-mobile": "16px",
        "container-max": "1280px",
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        headline: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        body: ['Inter', "system-ui", "sans-serif"],
        label: ['Inter', "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-lg": ["48px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["32px", { lineHeight: "1.3", letterSpacing: "-0.01em", fontWeight: "700" }],
        "headline-md": ["24px", { lineHeight: "1.4", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        "label-md": ["14px", { lineHeight: "1.2", letterSpacing: "0.05em", fontWeight: "600" }],
        "label-sm": ["12px", { lineHeight: "1.2", fontWeight: "500" }],
      },
      maxWidth: {
        "7xl": "80rem",
      },
      boxShadow: {
        card: "0px 4px 20px rgba(31,41,55,0.06)",
        "card-hover": "0px 12px 40px rgba(31,41,55,0.12)",
      },
      keyframes: {
        // Counter-rotation for the inner arc of LoadingSpinner. Tailwind ships only
        // `spin`, which turns one way, so the two rings would otherwise move together
        // and read as one thick ring rather than two.
        "spin-reverse": {
          to: { transform: "rotate(-360deg)" },
        },
        // The soft halo behind the rings: breathes rather than blinks.
        "spinner-glow": {
          "0%, 100%": { opacity: "0.35", transform: "scale(0.9)" },
          "50%": { opacity: "0.75", transform: "scale(1.08)" },
        },
      },
      animation: {
        "spin-slow": "spin 1.6s linear infinite",
        "spin-reverse": "spin-reverse 1.1s linear infinite",
        "spinner-glow": "spinner-glow 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
