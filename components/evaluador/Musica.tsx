"use client";

import { useEffect, useRef, useState } from "react";
import { cargarMusica, guardarMusica } from "@/lib/almacenamiento";
import { IconoNota, IconoNotaApagada } from "./Iconos";

/**
 * Musica de fondo del evaluador.
 *
 * Nunca arranca sola: el navegador lo impide y ademas es una decision del
 * estudiante. Si la dejo encendida la vez anterior, se intenta reanudar y, si
 * el navegador se niega, el boton queda en "apagada" hasta que la toque.
 */
export default function Musica() {
  const audio = useRef<HTMLAudioElement>(null);
  const [encendida, setEncendida] = useState(false);

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    a.volume = 0.3;
    if (cargarMusica()) {
      a.play()
        .then(() => setEncendida(true))
        .catch(() => setEncendida(false));
    }
  }, []);

  function alternar() {
    const a = audio.current;
    if (!a) return;
    if (encendida) {
      a.pause();
      setEncendida(false);
      guardarMusica(false);
      return;
    }
    // El archivo tarda en llegar: el boton cambia ya y se devuelve si falla.
    setEncendida(true);
    guardarMusica(true);
    a.play().catch(() => {
      setEncendida(false);
      guardarMusica(false);
    });
  }

  return (
    <>
      <audio ref={audio} src="/evaluador/tema.mp3" loop preload="none" />
      <button
        type="button"
        className="btn btn-mini"
        onClick={alternar}
        aria-pressed={encendida}
        title={encendida ? "Apagar la música" : "Encender la música del caso"}
      >
        {encendida ? <IconoNota /> : <IconoNotaApagada />}
        {encendida ? "Música" : "Sin música"}
      </button>
    </>
  );
}
