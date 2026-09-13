"use client";

import { useEffect, useRef, useState } from "react";
import { cargarMusica, guardarMusica } from "@/lib/almacenamiento";
import { IconoNota, IconoNotaApagada } from "./Iconos";

/** Los temas disponibles, en `public/evaluador/`. */
export type Tema = "tema" | "tema2";

/**
 * Musica de fondo del evaluador.
 *
 * Nunca arranca sola: el navegador lo impide y ademas es una decision del
 * estudiante. Si la dejo encendida la vez anterior, se intenta reanudar y, si
 * el navegador se niega, el boton queda en "apagada" hasta que la toque.
 *
 * `tema` permite cambiar de cancion a mitad del caso: si la musica esta
 * sonando, el cambio es inmediato y sigue sonando con la nueva.
 */
export default function Musica({ tema = "tema" }: { tema?: Tema }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [encendida, setEncendida] = useState(false);
  const fuente = "/evaluador/" + tema + ".mp3";

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    a.volume = 0.3;
    if (cargarMusica()) {
      a.play()
        .then(() => setEncendida(true))
        .catch(() => setEncendida(false));
    }
    // Solo al montar: el cambio de tema lo maneja el efecto de abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cambio de tema: React ya actualizo el atributo src; hay que recargar el
  // elemento y, si estaba sonando, volver a darle play.
  const primeraVez = useRef(true);
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    if (primeraVez.current) {
      primeraVez.current = false;
      return;
    }
    a.load();
    if (encendida) a.play().catch(() => setEncendida(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fuente]);

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
      <audio ref={audio} src={fuente} loop preload="none" />
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
