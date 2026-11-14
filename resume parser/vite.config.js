import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// react() compiles JSX; tailwindcss() reads class names from your components.
export default defineConfig({
  plugins: [react(), tailwindcss()],
});
