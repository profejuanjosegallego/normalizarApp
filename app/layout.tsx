import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Taller de Normalizacion de Bases de Datos",
  description:
    "Espacio de trabajo guiado para llevar un enunciado hasta la tercera forma normal: entidades, 1FN, 2FN y 3FN.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
