import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#FFF3ED",
          100: "#FFE4D4",
          200: "#FFC5A8",
          300: "#FFA070",
          400: "#FF7037",
          500: "#F95100",
          600: "#EA3D00",
          700: "#C22D00",
          800: "#9A2500",
          900: "#7C2100",
        },
      },
    },
  },
  plugins: [],
};

export default config;
