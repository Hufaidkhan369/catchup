/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#edfff4",
          100: "#c8f7d8",
          200: "#91edb3",
          300: "#59d989",
          400: "#29c765",
          500: "#17a957",
          600: "#128c4b",
          700: "#0d713c",
          800: "#105c35",
          900: "#0b482a",
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
