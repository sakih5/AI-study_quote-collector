import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#1a1a1a",
        card: "#2a2a2a",
        border: "#3a3a3a",
        text: {
          primary: "#ffffff",
          secondary: "#a0a0a0",
        },
      },
    },
  },
  plugins: [],
};
export default config;
