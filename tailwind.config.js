/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#effaf7",
          100: "#d8f2eb",
          200: "#b5e6d8",
          300: "#83d3bf",
          400: "#4db9a1",
          500: "#269b83",
          600: "#187d6c",
          700: "#176455",
          800: "#185045",
          900: "#174239",
        },
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.18s ease-out",
      },
    },
  },
  plugins: [],
};
