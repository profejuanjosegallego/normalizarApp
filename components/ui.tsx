"use client";

import { useEffect, useRef, useState } from "react";
import type { Chequeo } from "@/lib/validaciones";

export function Seccion({
  titulo,
  descripcion,
  acciones,
  children,
}: {
  titulo: string;
  descripcion?: string;
  acciones?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="tarjeta p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{titulo}</h2>
          {descripcion ? <p className="suave mt-1 max-w-3xl text-sm">{descripcion}</p> : null}
        </div>
        {acciones ? <div className="flex flex-wrap gap-2">{acciones}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function Campo({
  etiqueta,
  ayuda,
  ...props
}: { etiqueta: string; ayuda?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="etiqueta">{etiqueta}</span>
      <input className="campo" {...props} />
      {ayuda ? <span className="suave mt-1 block text-xs">{ayuda}</span> : null}
    </label>
  );
}

export function Area({
  etiqueta,
  ayuda,
  ...props
}: { etiqueta: string; ayuda?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <span className="etiqueta">{etiqueta}</span>
      <textarea className="campo resize-y" {...props} />
      {ayuda ? <span className="suave mt-1 block text-xs">{ayuda}</span> : null}
    </label>
  );
}

export function ListaChequeos({ chequeos }: { chequeos: Chequeo[] }) {
  if (chequeos.length === 0) return null;
  return (
    <ul className="space-y-1.5">
      {chequeos.map((c) => (
        <li key={c.id} className="flex items-start gap-2 text-sm">
          <span
            aria-hidden
            className="mt-[3px] inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-black"
            style={{
              background: c.ok ? "var(--ok-suave)" : "var(--superficie-3)",
              color: c.ok ? "var(--ok)" : "var(--texto-suave)",
            }}
          >
            {c.ok ? "✓" : "·"}
          </span>
          <span>
            <span style={{ color: c.ok ? "var(--texto)" : "var(--texto-suave)" }}>{c.etiqueta}</span>
            {!c.ok && c.detalle ? (
              <span className="block text-xs" style={{ color: "var(--alerta)" }}>
                {c.detalle}
              </span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Aviso({
  tono = "info",
  titulo,
  children,
}: {
  tono?: "info" | "ok" | "alerta" | "error";
  titulo?: string;
  children: React.ReactNode;
}) {
  const paleta = {
    info: { fondo: "var(--acento-suave)", texto: "var(--acento)" },
    ok: { fondo: "var(--ok-suave)", texto: "var(--ok)" },
    alerta: { fondo: "var(--alerta-suave)", texto: "var(--alerta)" },
    error: { fondo: "var(--error-suave)", texto: "var(--error)" },
  }[tono];

  return (
    <div className="rounded-xl px-4 py-3 text-sm" style={{ background: paleta.fondo }}>
      {titulo ? (
        <p className="mb-1 font-bold" style={{ color: paleta.texto }}>
          {titulo}
        </p>
      ) : null}
      <div style={{ color: "var(--texto)" }}>{children}</div>
    </div>
  );
}

export function BotonCopiar({
  texto,
  etiqueta = "Copiar",
  className = "btn",
}: {
  texto: string;
  etiqueta?: string;
  className?: string;
}) {
  const [copiado, setCopiado] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (temporizador.current) clearTimeout(temporizador.current);
  }, []);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      const area = document.createElement("textarea");
      area.value = texto;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      document.body.removeChild(area);
    }
    setCopiado(true);
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = setTimeout(() => setCopiado(false), 1800);
  }

  return (
    <button type="button" className={className} onClick={copiar}>
      {copiado ? "Copiado" : etiqueta}
    </button>
  );
}

export function Interruptor({
  activo,
  onCambio,
  etiqueta,
}: {
  activo: boolean;
  onCambio: (v: boolean) => void;
  etiqueta: string;
}) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2 text-xs font-semibold">
      <input
        type="checkbox"
        checked={activo}
        onChange={(e) => onCambio(e.target.checked)}
        className="h-3.5 w-3.5 cursor-pointer accent-[var(--acento)]"
      />
      <span>{etiqueta}</span>
    </label>
  );
}

/** Dialogo modal simple, sin dependencias externas. */
export function Dialogo({
  abierto,
  titulo,
  onCerrar,
  children,
  pie,
  ancho = "max-w-xl",
}: {
  abierto: boolean;
  titulo: string;
  onCerrar: () => void;
  children: React.ReactNode;
  pie?: React.ReactNode;
  /** Clase de ancho maximo, por ejemplo "max-w-6xl" para el diagrama. */
  ancho?: string;
}) {
  useEffect(() => {
    if (!abierto) return;
    function alPresionar(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
    }
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10, 12, 22, 0.55)" }}
      onClick={onCerrar}
      role="presentation"
    >
      <div
        className={`tarjeta max-h-[90vh] w-full ${ancho} overflow-y-auto p-5`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-base font-bold">{titulo}</h3>
          <button type="button" className="btn btn-mini" onClick={onCerrar} aria-label="Cerrar">
            Cerrar
          </button>
        </div>
        {children}
        {pie ? <div className="mt-5 flex flex-wrap justify-end gap-2">{pie}</div> : null}
      </div>
    </div>
  );
}
