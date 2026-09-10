/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#23262B",
        surface: "#2C3038",
        ink: "#F5F5F0",
        muted: "#9A9DA6",
        accent: "#D4FF3D",
        "accent-ink": "#1A1C1F",
      },
      fontFamily: {
        heading: ["Plus Jakarta Sans", "sans-serif"],
        body: ["Inter", "sans-serif"],
        arabic: ["Tajawal", "sans-serif"],
      },
      borderRadius: {
        card: "20px",
      },
    },
  },
  plugins: [],
};
