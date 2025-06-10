/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#7C3AED", // Purple
          dark: "#6D28D9",
          light: "#A78BFA",
        },
        secondary: {
          DEFAULT: "#0EA5E9", // Sky blue
          dark: "#0284C7",
          light: "#7DD3FC",
        },
        background: {
          DEFAULT: "#F9FAFB",
          dark: "#111827",
        },
        chat: {
          user: "#EEF2FF", // Indigo 50
          assistant: "#FFFFFF",
          system: "#F3F4F6", // Gray 100
        }
      },
      animation: {
        'bounce-slow': 'bounce 1.5s infinite',
      },
    },
  },
  plugins: [],
}; 