import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Dialogo from '../../components/Dialogo.jsx';
import { EstadoError, EstadoVacio, Esqueleto, Spinner } from '../../components/estados/Estados.jsx';
import { useCatalogoAdmin, useTemas } from '../../hooks/useCatalogoAdmin.js';
import { usePeticion } from '../../hooks/usePeticion.js';
import { adminApi, DIFICULTADES } from '../../api/admin.js';
import SelectorOrigen, { leerOrigen } from './SelectorOrigen.jsx';

const LIMITE = 20;
const ESTADOS = [
  { id: 'todas', nombre: 'Todas' },
  { id: 'true', nombre: 'Publicadas' },
  { id: 'false', nombre: 'Ocultas' },
];

function Paginacion({ pagina, paginas, total, onCambiar }) {
  if (paginas <= 1) return <p className="paginacion__info texto-suave">{total} {total === 1 ? 'resultado' : 'resultados'}</p>;
  return (
    <nav className="paginacion" aria-label="Paginación">
      <button type="button" className="btn btn--oscuro btn--sm" disabled={pagina <= 1} onClick={() => onCambiar(pagina - 1)}>
        ← Anterior
      </button>
      <span className="paginacion__info" aria-live="polite">
        Página {pagina} de {paginas} · {total} resultados
      </span>
      <button type="button" className="btn btn--oscuro btn--sm" disabled={pagina >= paginas} onClick={() => onCambiar(pagina + 1)}>
        Siguiente →
      </button>
    </nav>
  );
}

function FilaPregunta({ p, origenNombre, onEstado, onBorrar, ocupada }) {
  const [abierta, setAbierta] = useState(false);
  const idDetalle = `detalle-${p.id}`;
  const dificultad = DIFICULTADES.find((d) => d.id === p.dificultad)?.nombre ?? p.dificultad;
  return (
    <>
      <tr className={p.activa ? undefined : 'fila--oculta'}>
        <td className="tabla-preguntas__enunciado">
          <button type="button" className="enlace-boton" aria-expanded={abierta} aria-controls={idDetalle} onClick={() => setAbierta((v) => !v)}>
            {p.enunciado}
          </button>
          <span className="tabla-preguntas__id">{p.id}</span>
        </td>
        <td>
          <span className="tabla-preguntas__origen">{origenNombre}</span>
          <span className="texto-suave tabla-preguntas__tema">{p.tema_nombre}</span>
        </td>
        <td>
          <span className={`dificultad dificultad--${p.dificultad}`}>{dificultad}</span>
        </td>
        <td>
          <label className="interruptor">
            <input type="checkbox" role="switch" checked={p.activa} disabled={ocupada} onChange={(e) => onEstado(p, e.target.checked)} aria-label={`Publicada: ${p.enunciado}`} />
            <span className="interruptor__pista" aria-hidden="true" />
            <span className="interruptor__texto">{ocupada ? <Spinner pequeno etiqueta="Guardando" /> : p.activa ? 'Publicada' : 'Oculta'}</span>
          </label>
        </td>
        <td className="tabla__acciones">
          <button type="button" className="btn btn--peligro btn--sm" onClick={() => onBorrar(p)} disabled={ocupada}>
            Eliminar
          </button>
        </td>
      </tr>
      {abierta && (
        <tr className="fila-detalle" id={idDetalle}>
          <td colSpan={5}>
            {p.codigo && <pre className="fila-detalle__codigo">{p.codigo}</pre>}
            <ol className="fila-detalle__opciones" type="A">
              {p.opciones.map((o) => (
                <li key={o.id} className={o.es_correcta ? 'correcta' : undefined}>
                  {o.texto}
                  {o.es_correcta && <span className="etiqueta etiqueta--ok"> Correcta</span>}
                </li>
              ))}
            </ol>
            {p.explicacion && (
              <p className="fila-detalle__explicacion">
                <strong>Explicación:</strong> {p.explicacion}
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export default function Preguntas() {
  const [params, setParams] = useSearchParams();
  const origen = params.get('origen') ?? '';
  const tema = params.get('tema') ?? '';
  const activa = ESTADOS.some((e) => e.id === params.get('activa')) ? params.get('activa') : 'todas';
  const q = params.get('q') ?? '';
  const pagina = Math.max(1, Number(params.get('pagina')) || 1);

  const catalogo = useCatalogoAdmin();
  const temas = useTemas(catalogo.datos, origen);
  const [busqueda, setBusqueda] = useState(q);
  const [ocupadas, setOcupadas] = useState({});
  const [aviso, setAviso] = useState(null);
  const [aBorrar, setABorrar] = useState(null);
  const [borrando, setBorrando] = useState(false);
  const temporizador = useRef(null);

  const cambiar = (cambios, reiniciarPagina = true) => {
    const n = new URLSearchParams(params);
    Object.entries(cambios).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k)));
    if (reiniciarPagina) n.delete('pagina');
    setParams(n, { replace: true });
  };

  // Búsqueda con espera de 350 ms para no lanzar una petición por tecla.
  useEffect(() => {
    clearTimeout(temporizador.current);
    if (busqueda === q) return;
    temporizador.current = setTimeout(() => cambiar({ q: busqueda.trim() }), 350);
    return () => clearTimeout(temporizador.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda]);

  const { moduloId, certificacionId } = leerOrigen(origen);
  const lista = usePeticion(
    () =>
      adminApi.listarPreguntas({
        modulo_id: moduloId,
        certificacion_id: certificacionId,
        tema_id: tema,
        activa,
        q,
        pagina,
        limite: LIMITE,
      }),
    [moduloId, certificacionId, tema, activa, q, pagina],
  );
  const [filas, setFilas] = useState(null);
  useEffect(() => setFilas(lista.datos?.preguntas ?? null), [lista.datos]);

  const nombreOrigen = (p) => {
    if (!catalogo.datos) return p.modulo_id ?? p.certificacion_id;
    if (p.modulo_id) return catalogo.datos.modulos.find((m) => m.id === p.modulo_id)?.nombre ?? p.modulo_id;
    return catalogo.datos.certificaciones.find((c) => c.id === p.certificacion_id)?.codigo_examen ?? p.certificacion_id;
  };

  const cambiarEstado = async (p, nueva) => {
    setOcupadas((o) => ({ ...o, [p.id]: true }));
    setFilas((f) => f.map((x) => (x.id === p.id ? { ...x, activa: nueva } : x)));
    try {
      await adminApi.cambiarEstadoPregunta(p.id, nueva);
      setAviso({ tipo: 'ok', texto: nueva ? 'Pregunta publicada.' : 'Pregunta ocultada: ya no saldrá en los tests.' });
    } catch (err) {
      setFilas((f) => f.map((x) => (x.id === p.id ? { ...x, activa: !nueva } : x)));
      setAviso({ tipo: 'error', texto: err.message });
    } finally {
      setOcupadas((o) => ({ ...o, [p.id]: false }));
    }
  };

  const confirmarBorrado = async () => {
    setBorrando(true);
    try {
      await adminApi.borrarPregunta(aBorrar.id);
      setAviso({ tipo: 'ok', texto: 'Pregunta eliminada.' });
      setABorrar(null);
      lista.reintentar();
    } catch (err) {
      setAviso({ tipo: 'error', texto: err.message });
      setABorrar(null);
    } finally {
      setBorrando(false);
    }
  };

  const hayFiltros = origen || tema || activa !== 'todas' || q;

  return (
    <div className="panel-seccion">
      <div className="panel-seccion__cabecera">
        <h2 className="subtitulo-seccion">Banco de preguntas</h2>
        <Link to="/panel/preguntas/nueva" className="btn btn--primario btn--sm">
          + Nueva pregunta
        </Link>
      </div>

      <form className="panel-filtros" role="search" onSubmit={(e) => e.preventDefault()}>
        <label className="panel-filtros__campo panel-filtros__campo--ancho">
          <span>Buscar</span>
          <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Texto del enunciado o id…" />
        </label>
        <label className="panel-filtros__campo">
          <span>Módulo o certificación</span>
          {catalogo.datos ? (
            <SelectorOrigen catalogo={catalogo.datos} value={origen} onChange={(v) => cambiar({ origen: v, tema: '' })} />
          ) : (
            <select disabled>
              <option>Cargando…</option>
            </select>
          )}
        </label>
        <label className="panel-filtros__campo">
          <span>Tema</span>
          <select value={tema} onChange={(e) => cambiar({ tema: e.target.value })} disabled={!origen}>
            <option value="">{origen ? 'Todos' : 'Elige antes un módulo'}</option>
            {temas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.orden}. {t.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="panel-filtros__campo">
          <span>Estado</span>
          <select value={activa} onChange={(e) => cambiar({ activa: e.target.value === 'todas' ? '' : e.target.value })}>
            {ESTADOS.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </label>
        {hayFiltros && (
          <button
            type="button"
            className="btn btn--fantasma btn--sm panel-filtros__limpiar"
            onClick={() => {
              setBusqueda('');
              setParams(new URLSearchParams(), { replace: true });
            }}
          >
            Quitar filtros
          </button>
        )}
      </form>

      <div aria-live="polite">{aviso && <p className={`alerta alerta--${aviso.tipo === 'ok' ? 'ok' : 'error'}`}>{aviso.texto}</p>}</div>

      {lista.cargando && !filas ? (
        <Esqueleto filas={6} alto={56} etiqueta="Cargando preguntas" />
      ) : lista.error ? (
        <EstadoError error={lista.error} onReintentar={lista.reintentar} titulo="No se han podido cargar las preguntas" />
      ) : !filas?.length ? (
        <EstadoVacio icono="🗂️" titulo={hayFiltros ? 'Ninguna pregunta coincide con los filtros' : 'Todavía no hay preguntas'} texto={hayFiltros ? 'Prueba con otros filtros o quítalos.' : 'Crea la primera desde «Nueva pregunta».'} />
      ) : (
        <>
          <div className="tabla-scroll" aria-busy={lista.cargando}>
            <table className="tabla tabla-preguntas">
              <caption className="sr-only">Preguntas del banco. Pulsa un enunciado para ver sus opciones.</caption>
              <thead>
                <tr>
                  <th scope="col">Enunciado</th>
                  <th scope="col">Módulo · tema</th>
                  <th scope="col">Dificultad</th>
                  <th scope="col">Estado</th>
                  <th scope="col">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filas.map((p) => (
                  <FilaPregunta key={p.id} p={p} origenNombre={nombreOrigen(p)} onEstado={cambiarEstado} onBorrar={setABorrar} ocupada={Boolean(ocupadas[p.id])} />
                ))}
              </tbody>
            </table>
          </div>
          <Paginacion pagina={lista.datos.pagina} paginas={lista.datos.paginas} total={lista.datos.total} onCambiar={(n) => cambiar({ pagina: n > 1 ? String(n) : '' }, false)} />
        </>
      )}

      <Dialogo
        abierto={Boolean(aBorrar)}
        titulo="¿Eliminar esta pregunta?"
        peligro
        onCerrar={() => !borrando && setABorrar(null)}
        acciones={
          <>
            <button type="button" className="btn btn--oscuro" onClick={() => setABorrar(null)} disabled={borrando}>
              Cancelar
            </button>
            <button type="button" className="btn btn--peligro" onClick={confirmarBorrado} disabled={borrando} aria-busy={borrando}>
              {borrando ? 'Eliminando…' : 'Eliminar definitivamente'}
            </button>
          </>
        }
      >
        <p className="dialogo__cita">«{aBorrar?.enunciado}»</p>
        <p className="texto-suave">Se borrarán también sus opciones y las respuestas guardadas de los usuarios. No se puede deshacer. Si solo quieres que no salga en los tests, ocúltala.</p>
      </Dialogo>
    </div>
  );
}
