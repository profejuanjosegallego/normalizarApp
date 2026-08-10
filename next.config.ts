import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Evita que Turbopack tome como raiz el directorio del usuario por un
  // package-lock.json suelto en C:\Users\<usuario>.
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
