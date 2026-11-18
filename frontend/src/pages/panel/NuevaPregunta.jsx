import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EstadoError, Esqueleto, Spinner } from '../../components/estados/Estados.jsx';
import { useCatalogoAdmin, useTemas } from '../../hooks/useCatalogoAdmin.js';
import { adminApi, DIFICULTADES } from '../../api/admin.js';
import SelectorOrigen, { leerOrigen, valorOrigen } from './SelectorOrigen.jsx';

const MIN_OPCIONES = 2;
const MAX_OPCIONES = 6;
const LETRAS = 'ABCDEF';

const vacio = (origen = '') => ({
  origen,
  tema: '',
  enunciado: '',
  codigo: '',
  explicacion: '',
  dificultad: 'media',
  activa: true,
  opciones: [
    { texto: '', correcta: true },
    { texto: '', correcta: false },
    { texto: '', correcta: false },
    { texto: '', correcta: false },
  ],
});

// Mismas reglas que backend/src/schemas/admin.schema.js (crearPreguntaSchema).
function validar(f) {
  const e = {};
  if (!f.origen) e.origen = 'Elige el módulo o la certificación.';
  if (!f.tema) e.tema = 'Elige el tema.';
  if (f.enunciado.trim().length < 5) e.enunciado = 'El enunciado debe tener al menos 5 caracteres.';
  if (f.opciones.some((o) => !o.texto.trim())) e.opciones = 'Ninguna opción puede quedar vacía.';
  else if (f.opciones.filter((o) => o.correcta).length !== 1) e.opciones = 'Marca exactamente una opción como correcta.';
  return e;
}

export default function NuevaPregunta() {
  const [params] = useSearchParams();
  const inicial = params.get('modulo')
    ? valorOrigen('modulo', params.get('modulo'))
    : params.get('certificacion')
      ? valorOrigen('certificacion', params.get('certificacion'))
      : '';
  const catalogo = useCatalogoAdmin();
  const [f, setF] = useState(() => vacio(inicial));
  const [errores, setErrores] = useState({});
  const [estado, setEstado] = useState({ tipo: 'inicial' });
  const temas = useTemas(catalogo.datos, f.origen);
  const alertaRef = useRef(null);

  useEffect(() => {
    if (estado.tipo === 'ok' || estado.tipo === 'error') alertaRef.current?.focus();
  }, [estado]);

  const set = (campo, valor) => {
    setF((x) => ({ ...x, [campo]: valor }));
    setErrores((e) => ({ ...e, [campo]: undefined }));
    if (estado.tipo !== 'guardando') setEstado({ tipo: 'inicial' });
  };
  const setOpcion = (i, cambios) =>
    set(
      'opciones',
      f.opciones.map((o, j) => (j === i ? { ...o, ...cambios } : cambios.correcta ? { ...o, correcta: false } : o)),
    );
  const quitarOpcion = (i) => {
    const resto = f.opciones.filter((_, j) => j !== i);
    if (!resto.some((o) => o.correcta)) resto[0] = { ...resto[0], correcta: true };
    set('opciones', resto);
  };

  const enviar = async (ev) => {
    ev.preventDefault();
    const e = validar(f);
    setErrores(e);
    if (Object.keys(e).length) {
      document.getElementById(`np-${Object.keys(e)[0]}`)?.focus();
      return;
    }
    const { moduloId, certificacionId } = leerOrigen(f.origen);
    setEstado({ tipo: 'guardando' });
    try {
      const r = await adminApi.crearPregunta({
        modulo_id: moduloId || null,
        certificacion_id: certificacionId || null,
        tema_id: Number(f.tema),
        enunciado: f.enunciado.trim(),
        codigo: f.codigo.trim() || null,
        explicacion: f.explicacion.trim() || null,
        dificultad: f.dificultad,
        activa: f.activa,
        opciones: f.opciones.map((o) => ({ texto: o.texto.trim(), es_correcta: o.correcta })),
      });
      setEstado({ tipo: 'ok', pregunta: r.pregunta });
      // Mantiene módulo y tema para crear varias seguidas.
      setF((x) => ({ ...vacio(x.origen), tema: x.tema, dificultad: x.dificultad }));
    } catch (err) {
      if (err.campo) setErrores({ [err.campo === 'tema_id' ? 'tema' : err.campo]: err.message });
      setEstado({ tipo: 'error', mensaje: err.message });
    }
  };

  if (catalogo.cargando) return <Esqueleto filas={4} alto={70} etiqueta="Cargando el formulario" />;
  if (catalogo.error) return <EstadoError error={catalogo.error} onReintentar={catalogo.reintentar} titulo="No se ha podido cargar el catálogo" />;

  const guardando = estado.tipo === 'guardando';

  return (
    <div className="panel-seccion">
      <h2 className="subtitulo-seccion">Nueva pregunta</h2>

      {estado.tipo === 'ok' && (
        <div className="alerta alerta--ok" role="status" tabIndex={-1} ref={alertaRef}>
          ✓ Pregunta creada {estado.pregunta?.activa ? 'y publicada' : 'como oculta'}.
          <div className="alerta__acciones">
            <Link to={`/panel/preguntas?q=${encodeURIComponent(estado.pregunta?.id ?? '')}`} className="enlace">
              Ver en el banco
            </Link>
          </div>
        </div>
      )}
      {estado.tipo === 'error' && (
        <p className="alerta alerta--error" role="alert" tabIndex={-1} ref={alertaRef}>
          {estado.mensaje}
        </p>
      )}

      <form className="tarjeta form-pregunta" onSubmit={enviar} noValidate>
        <div className="form-pregunta__fila">
          <div className="campo">
            <label htmlFor="np-origen">Módulo o certificación</label>
            <SelectorOrigen
              id="np-origen"
              catalogo={catalogo.datos}
              value={f.origen}
              onChange={(v) => {
                set('origen', v);
                set('tema', '');
              }}
              todos="Elige uno…"
              required
              invalido={Boolean(errores.origen)}
              describedBy={errores.origen ? 'np-origen-error' : undefined}
            />
            {errores.origen && (
              <span className="campo__error" id="np-origen-error">
                {errores.origen}
              </span>
            )}
          </div>
          <div className="campo">
            <label htmlFor="np-tema">Tema</label>
            <select id="np-tema" value={f.tema} onChange={(e) => set('tema', e.target.value)} disabled={!f.origen} aria-invalid={Boolean(errores.tema) || undefined} aria-describedby={errores.tema ? 'np-tema-error' : undefined}>
              <option value="">{f.origen ? (temas.length ? 'Elige un tema…' : 'Sin temas') : 'Elige antes el módulo'}</option>
              {temas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.orden}. {t.nombre}
                </option>
              ))}
            </select>
            {errores.tema && (
              <span className="campo__error" id="np-tema-error">
                {errores.tema}
              </span>
            )}
          </div>
        </div>

        <div className="campo">
          <label htmlFor="np-enunciado">Enunciado</label>
          <textarea id="np-enunciado" rows={3} value={f.enunciado} onChange={(e) => set('enunciado', e.target.value)} aria-invalid={Boolean(errores.enunciado) || undefined} aria-describedby={errores.enunciado ? 'np-enunciado-error' : undefined} />
          {errores.enunciado && (
            <span className="campo__error" id="np-enunciado-error">
              {errores.enunciado}
            </span>
          )}
        </div>

        <div className="campo">
          <label htmlFor="np-codigo">
            Código <span className="texto-suave">(opcional)</span>
          </label>
          <textarea id="np-codigo" rows={3} className="campo__codigo" value={f.codigo} onChange={(e) => set('codigo', e.target.value)} spellCheck={false} placeholder="Fragmento de código que acompaña al enunciado" />
        </div>

        <fieldset className="opciones-editor" aria-describedby={errores.opciones ? 'np-opciones-error' : 'np-opciones-ayuda'}>
          <legend>Opciones</legend>
          <p className="campo__ayuda" id="np-opciones-ayuda">
            Entre {MIN_OPCIONES} y {MAX_OPCIONES}. Marca la correcta con el círculo.
          </p>
          {f.opciones.map((o, i) => (
            <div key={i} className={`opcion-editor ${o.correcta ? 'opcion-editor--correcta' : ''}`}>
              <label className="opcion-editor__radio">
                <input type="radio" name="np-correcta" checked={o.correcta} onChange={() => setOpcion(i, { correcta: true })} />
                <span className="sr-only">Opción {LETRAS[i]} correcta</span>
                <span className="opcion-editor__letra" aria-hidden="true">
                  {LETRAS[i]}
                </span>
              </label>
              <input
                id={i === 0 ? 'np-opciones' : undefined}
                type="text"
                value={o.texto}
                onChange={(e) => setOpcion(i, { texto: e.target.value })}
                aria-label={`Texto de la opción ${LETRAS[i]}`}
                placeholder={`Opción ${LETRAS[i]}`}
              />
              <button type="button" className="boton-icono boton-icono--sm" onClick={() => quitarOpcion(i)} disabled={f.opciones.length <= MIN_OPCIONES} aria-label={`Quitar opción ${LETRAS[i]}`}>
                ✕
              </button>
            </div>
          ))}
          {errores.opciones && (
            <span className="campo__error" id="np-opciones-error">
              {errores.opciones}
            </span>
          )}
          {f.opciones.length < MAX_OPCIONES && (
            <button type="button" className="btn btn--fantasma btn--sm" onClick={() => set('opciones', [...f.opciones, { texto: '', correcta: false }])}>
              + Añadir opción
            </button>
          )}
        </fieldset>

        <div className="campo">
          <label htmlFor="np-explicacion">
            Explicación <span className="texto-suave">(recomendada)</span>
          </label>
          <textarea id="np-explicacion" rows={3} value={f.explicacion} onChange={(e) => set('explicacion', e.target.value)} placeholder="Por qué la respuesta correcta es la correcta. Se muestra al corregir." />
        </div>

        <div className="form-pregunta__fila">
          <fieldset className="campo segmentos-campo">
            <legend>Dificultad</legend>
            <div className="segmentos">
              {DIFICULTADES.map((d) => (
                <label key={d.id} className={`segmento ${f.dificultad === d.id ? 'segmento--activo' : ''}`}>
                  <input type="radio" name="np-dificultad" className="sr-only" checked={f.dificultad === d.id} onChange={() => set('dificultad', d.id)} />
                  {d.nombre}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="campo">
            <span className="campo__etiqueta">Estado</span>
            <label className="interruptor">
              <input type="checkbox" role="switch" checked={f.activa} onChange={(e) => set('activa', e.target.checked)} />
              <span className="interruptor__pista" aria-hidden="true" />
              <span className="interruptor__texto">{f.activa ? 'Publicar al guardar' : 'Guardar como oculta'}</span>
            </label>
          </div>
        </div>

        <div className="form-pregunta__acciones">
          <button type="submit" className="btn btn--primario" disabled={guardando} aria-busy={guardando}>
            {guardando ? (
              <>
                <Spinner pequeno etiqueta="Guardando" /> Guardando…
              </>
            ) : (
              'Guardar pregunta'
            )}
          </button>
          <Link to="/panel/preguntas" className="btn btn--oscuro">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
