"use client";

import { useEffect, useState } from "react";
import { Aviso, BotonCopiar, Campo } from "@/components/ui";
import { guardarConvocatorias, listarConvocatorias } from "@/lib/almacenamiento";
import {
  CONFIG_POR_DEFECTO,
  normalizarConfig,
  pruebaComoEjercicio,
  type Convocatoria,
} from "@/lib/evaluador/prueba";
import { nuevoId } from "@/lib/ids";
import {
  actualizarPrueba,
  eliminarEjercicio,
  ErrorBackend,
  hayBackend,
  publicarPrueba,
} from "@/lib/supabase";
import type { ConfigPrueba } from "@/lib/tipos";

/**
 * Panel del docente para habilitar el evaluador final.
 *
 * Habilitar genera un codigo de 6 caracteres con las reglas de la prueba. Los
 * estudiantes lo escriben en /evaluador y solo entonces pueden empezar un
 * caso. Cerrar la prueba impide que empiecen otros; quien ya arranco termina
 * con su reloj.
 */
export default function PanelPruebas() {
  const [config, setConfig] = useState<ConfigPrueba>(CONFIG_POR_DEFECTO);
  const [lista, setLista] = useState<Convocatoria[]>([]);
  const [ocupado, setOcupado] = useState("");
  const [error, setError] = useState("");
  const [reciente, setReciente] = useState<string | null>(null);

  useEffect(() => {
    setLista(listarConvocatorias());
  }, []);

  function persistir(nueva: Convocatoria[]) {
    setLista(nueva);
    guardarConvocatorias(nueva);
  }

  function fijar<K extends keyof ConfigPrueba>(campo: K, valor: ConfigPrueba[K]) {
    setConfig((c) => ({ ...c, [campo]: valor }));
  }

  async function habilitar() {
    setError("");
    setOcupado("nueva");
    try {
      const limpia = normalizarConfig({ ...config, abierta: true });
      const ejercicio = pruebaComoEjercicio(limpia, nuevoId("prueba"));
      const { codigo, claveEdicion } = await publicarPrueba(ejercicio);
      const conv: Convocatoria = {
        codigo,
        claveEdicion,
        config: limpia,
        creada: new Date().toISOString(),
      };
      persistir([conv, ...lista]);
      setReciente(codigo);
    } catch (e) {
      setError(e instanceof ErrorBackend ? e.message : "No se pudo habilitar la prueba.");
    } finally {
      setOcupado("");
    }
  }

  async function alternar(conv: Convocatoria) {
    setError("");
    setOcupado(conv.codigo);
    try {
      const nueva = { ...conv.config, abierta: !conv.config.abierta };
      await actualizarPrueba(
        conv.codigo,
        conv.claveEdicion,
        pruebaComoEjercicio(nueva, "prueba_" + conv.codigo),
      );
      persistir(lista.map((c) => (c.codigo === conv.codigo ? { ...c, config: nueva } : c)));
    } catch (e) {
      setError(e instanceof ErrorBackend ? e.message : "No se pudo cambiar la prueba.");
    } finally {
      setOcupado("");
    }
  }

  async function borrar(conv: Convocatoria) {
    setError("");
    setOcupado(conv.codigo);
    try {
      await eliminarEjercicio(conv.codigo, conv.claveEdicion);
      persistir(lista.filter((c) => c.codigo !== conv.codigo));
    } catch (e) {
      setError(e instanceof ErrorBackend ? e.message : "No se pudo borrar la prueba.");
    } finally {
      setOcupado("");
    }
  }

  if (!hayBackend()) {
    return (
      <Aviso tono="alerta" titulo="Sin servidor configurado">
        Habilitar la prueba necesita el servidor de códigos (Supabase). Esta copia no tiene las
        variables configuradas.
      </Aviso>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Campo
          etiqueta="Grupo o jornada (opcional)"
          value={config.grupo}
          onChange={(e) => fijar("grupo", e.target.value)}
          placeholder="BD I · noche"
        />
        <Campo
          etiqueta="Minutos por caso"
          type="number"
          min={10}
          max={300}
          value={config.minutos}
          onChange={(e) => fijar("minutos", Number(e.target.value))}
          ayuda="El reloj arranca cuando la pareja pulsa Empezar."
        />
        <Campo
          etiqueta="Décimas por intento fallido"
          type="number"
          min={0}
          max={1}
          step={0.1}
          value={config.descuento}
          onChange={(e) => fijar("descuento", Number(e.target.value))}
          ayuda="0,1 = una décima por intento."
        />
        <Campo
          etiqueta="Intentos libres por caso"
          type="number"
          min={0}
          max={50}
          value={config.intentosLibres}
          onChange={(e) => fijar("intentosLibres", Number(e.target.value))}
          ayuda="Los primeros fallos no descuentan."
        />
      </div>

      <p className="suave text-xs leading-relaxed">
        La nota sale de 5,0 por resolver el caso completo, menos las décimas de cada intento
        fallido que pase de los libres. Cuenta como intento fallido cada ejecución que no
        resuelve la pista en curso (errores incluidos) y cada acusación equivocada. Si el
        tiempo se acaba, la base es proporcional a las pistas resueltas.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn btn-primario"
          onClick={habilitar}
          disabled={ocupado !== ""}
        >
          {ocupado === "nueva" ? "Habilitando…" : "Habilitar la prueba y obtener código"}
        </button>
        <span className="suave text-xs">Cada vez que habilitas sale un código nuevo.</span>
      </div>

      {error ? <Aviso tono="error">{error}</Aviso> : null}

      {lista.length > 0 ? (
        <ul className="space-y-2">
          {lista.map((conv) => (
            <li key={conv.codigo} className="tarjeta-plana flex flex-wrap items-center gap-4 p-4">
              <div>
                <span className="etiqueta">
                  {conv.config.abierta ? "Prueba abierta" : "Prueba cerrada"}
                  {conv.config.grupo ? " · " + conv.config.grupo : ""}
                </span>
                <p className="font-mono text-3xl font-black tracking-[0.3em]">{conv.codigo}</p>
                <p className="suave mt-1 text-xs">
                  {conv.config.minutos} min por caso · −{conv.config.descuento
                    .toFixed(1)
                    .replace(".", ",")}{" "}
                  por intento fallido · {conv.config.intentosLibres} libres ·{" "}
                  {new Date(conv.creada).toLocaleString("es")}
                </p>
                {reciente === conv.codigo ? (
                  <p className="mt-1 text-xs font-semibold" style={{ color: "var(--ok)" }}>
                    Lista. Dicta este código: con él se destraban los dos casos.
                  </p>
                ) : null}
              </div>
              <div className="ml-auto flex flex-wrap gap-2">
                <BotonCopiar texto={conv.codigo} etiqueta="Copiar código" className="btn btn-mini" />
                <button
                  type="button"
                  className={conv.config.abierta ? "btn btn-mini btn-peligro" : "btn btn-mini"}
                  onClick={() => alternar(conv)}
                  disabled={ocupado !== ""}
                >
                  {ocupado === conv.codigo
                    ? "…"
                    : conv.config.abierta
                      ? "Cerrar la prueba"
                      : "Reabrir"}
                </button>
                <button
                  type="button"
                  className="btn btn-mini btn-peligro"
                  onClick={() => borrar(conv)}
                  disabled={ocupado !== ""}
                  title="Borra el código del servidor"
                >
                  Borrar
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="suave text-sm">Todavía no has habilitado ninguna prueba desde este navegador.</p>
      )}
    </div>
  );
}
