import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// In development the API is proxied so the session cookie stays same-origin.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { "/api": process.env.VITE_API_PROXY ?? "http://localhost:8000" },
  },
});
