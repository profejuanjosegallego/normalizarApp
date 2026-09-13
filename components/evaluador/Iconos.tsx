/**
 * Iconos de trazo del evaluador. SVG en linea, sin emojis: heredan el color
 * del texto con `currentColor`.
 */

type Props = { className?: string; titulo?: string };

function base(props: Props, children: React.ReactNode) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={props.titulo ? undefined : true}
      role={props.titulo ? "img" : undefined}
      className={props.className}
    >
      {props.titulo ? <title>{props.titulo}</title> : null}
      {children}
    </svg>
  );
}

export function IconoLupa(p: Props) {
  return base(p, <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>);
}

export function IconoCheck(p: Props) {
  return base(p, <path d="m5 12 4.5 4.5L19 7" />);
}

export function IconoCandado(p: Props) {
  return base(
    p,
    <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>,
  );
}

export function IconoHuella(p: Props) {
  return base(
    p,
    <>
      <path d="M12 3a8 8 0 0 0-8 8v2" />
      <path d="M20 13v-2a8 8 0 0 0-2-5.3" />
      <path d="M8 21v-5a4 4 0 0 1 8 0v1" />
      <path d="M12 21v-9" />
      <path d="M16 21v-2" />
      <path d="M4 17v-1" />
    </>,
  );
}

export function IconoNota(p: Props) {
  return base(p, <><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></>);
}

export function IconoNotaApagada(p: Props) {
  return base(
    p,
    <><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /><path d="m3 3 18 18" /></>,
  );
}

export function IconoFlecha(p: Props) {
  return base(p, <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>);
}

export function IconoDescarga(p: Props) {
  return base(p, <><path d="M12 4v12" /><path d="m7 11 5 5 5-5" /><path d="M4 20h16" /></>);
}

export function IconoExpediente(p: Props) {
  return base(
    p,
    <><path d="M4 6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" /><path d="M4 10h16" /></>,
  );
}

export function IconoReiniciar(p: Props) {
  return base(p, <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></>);
}

export function IconoReloj(p: Props) {
  return base(p, <><circle cx="12" cy="13" r="8" /><path d="M12 9v4l2.5 2" /><path d="M9 3h6" /></>);
}
