import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#070A12",
        panel: "#10151F",
        line: "#232A37",
        ember: "#F97316",
        amberSoft: "#FDBA74"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(249, 115, 22, 0.18), 0 18px 60px rgba(0,0,0,0.35)"
      }
    }
  },
  plugins: []
};

export default config;
