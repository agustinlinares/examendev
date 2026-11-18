import { useEffect, useId, useRef } from 'react';

// Ventana modal accesible basada en <dialog>: atrapa el foco, se cierra con Esc y devuelve el foco al cerrar.
// Se usa para confirmar acciones destructivas y para pedir un dato (p. ej. un nick nuevo).
export default function Dialogo({ abierto, titulo, children, onCerrar, acciones, peligro = false }) {
  const ref = useRef(null);
  const idTitulo = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      className={`dialogo ${peligro ? 'dialogo--peligro' : ''}`}
      aria-labelledby={idTitulo}
      onCancel={(e) => {
        e.preventDefault();
        onCerrar();
      }}
      onClick={(e) => e.target === ref.current && onCerrar()}
    >
      <div className="dialogo__cuerpo">
        <h2 id={idTitulo} className="dialogo__titulo">
          {titulo}
        </h2>
        {children}
        <div className="dialogo__acciones">{acciones}</div>
      </div>
    </dialog>
  );
}
