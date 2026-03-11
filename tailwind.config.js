/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f6f8fb",
          100: "#eef2f7",
          200: "#d9e1ec",
          300: "#b7c5d9",
          400: "#8ca0bd",
          500: "#697f9d",
          600: "#4f647f",
          700: "#3b4d63",
          800: "#263445",
          900: "#17202c"
        },
        accent: {
          50: "#edf8f6",
          100: "#d5efe7",
          200: "#acdfd0",
          300: "#7cc9b4",
          400: "#49ad95",
          500: "#328f7a",
          600: "#267364",
          700: "#205d52",
          800: "#1c4a42",
          900: "#193d36"
        },
        sand: "#f4efe8",
        rose: "#eab7a0",
        amber: "#e6b35a"
      },
      boxShadow: {
        panel:
          "0 18px 50px -26px rgba(18, 26, 37, 0.45), 0 12px 22px -20px rgba(18, 26, 37, 0.4)"
      },
      fontFamily: {
        sans: ["'Manrope'", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["'Fraunces'", "ui-serif", "Georgia", "serif"]
      },
      animation: {
        float: "float 8s ease-in-out infinite",
        "fade-in": "fade-in 500ms ease-out"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" }
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      }
    }
  },
  plugins: []
};
