import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Avatar from '../../components/Avatar.jsx';
import Dialogo from '../../components/Dialogo.jsx';
import { EstadoError, EstadoVacio, Esqueleto } from '../../components/estados/Estados.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { usePeticion } from '../../hooks/usePeticion.js';
import { adminApi, ROLES } from '../../api/admin.js';

const LIMITE = 20;
const NICK_VALIDO = /^[a-zA-Z0-9_.-]{3,30}$/;
const nf = new Intl.NumberFormat('es-ES');
const fecha = (iso) => (iso ? new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const FILTRO_ROL = { todos: 'Todos', usuario: 'Usuarios', editor: 'Editores', admin: 'Administradores' };
const nombreRol = (id) => ROLES.find((r) => r.id === id)?.nombre ?? id;

export default function Usuarios() {
  const { usuario: yo } = useAuth();
  const [params, setParams] = useSearchParams();
  const rol = ['usuario', 'editor', 'admin'].includes(params.get('rol')) ? params.get('rol') : 'todos';
  const q = params.get('q') ?? '';
  const pagina = Math.max(1, Number(params.get('pagina')) || 1);

  const [busqueda, setBusqueda] = useState(q);
  const [aviso, setAviso] = useState(null);
  const [accion, setAccion] = useState(null); // { tipo: 'rol' | 'nick' | 'borrar', u, rol? }
  const [nick, setNick] = useState('');
  const [errorNick, setErrorNick] = useState(null);
  const [trabajando, setTrabajando] = useState(false);
  const temporizador = useRef(null);

  const cambiar = (cambios, reiniciarPagina = true) => {
    const n = new URLSearchParams(params);
    Object.entries(cambios).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k)));
    if (reiniciarPagina) n.delete('pagina');
    setParams(n, { replace: true });
  };

  useEffect(() => {
    clearTimeout(temporizador.current);
    if (busqueda === q) return;
    temporizador.current = setTimeout(() => cambiar({ q: busqueda.trim() }), 350);
    return () => clearTimeout(temporizador.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda]);

  const lista = usePeticion(() => adminApi.listarUsuarios({ rol, q, pagina, limite: LIMITE }), [rol, q, pagina]);

  const cerrar = () => {
    if (trabajando) return;
    setAccion(null);
    setErrorNick(null);
  };

  const ejecutar = async () => {
    const { tipo, u } = accion;
    if (tipo === 'nick') {
      const limpio = nick.trim();
      if (!NICK_VALIDO.test(limpio)) {
        setErrorNick('Entre 3 y 30 caracteres: letras, números, punto, guion o guion bajo.');
        return;
      }
    }
    setTrabajando(true);
    try {
      if (tipo === 'rol') {
        await adminApi.cambiarRol(u.id, accion.rol);
        setAviso({ tipo: 'ok', texto: `${u.nick} ahora es ${nombreRol(accion.rol).toLowerCase()}.` });
      } else if (tipo === 'nick') {
        await adminApi.cambiarNick(u.id, nick.trim());
        setAviso({ tipo: 'ok', texto: `Nick cambiado: ${u.nick} → ${nick.trim()}.` });
      } else {
        await adminApi.borrarUsuario(u.id);
        setAviso({ tipo: 'ok', texto: `Cuenta de ${u.nick} eliminada.` });
      }
      setAccion(null);
      lista.reintentar();
    } catch (err) {
      if (tipo === 'nick' && err.campo === 'nick') setErrorNick(err.message);
      else {
        setAviso({ tipo: 'error', texto: err.message });
        setAccion(null);
      }
    } finally {
      setTrabajando(false);
    }
  };

  const filas = lista.datos?.usuarios ?? [];
  const hayFiltros = rol !== 'todos' || q;

  const tituloDialogo = !accion
    ? ''
    : accion.tipo === 'rol'
      ? `¿Cambiar el rol de ${accion.u.nick}?`
      : accion.tipo === 'nick'
        ? `Cambiar el nick de ${accion.u.nick}`
        : `¿Eliminar la cuenta de ${accion.u.nick}?`;

  return (
    <div className="panel-seccion">
      <h2 className="subtitulo-seccion">Usuarios</h2>

      <form className="panel-filtros" role="search" onSubmit={(e) => e.preventDefault()}>
        <label className="panel-filtros__campo panel-filtros__campo--ancho">
          <span>Buscar</span>
          <input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nick o correo…" />
        </label>
        <div className="panel-filtros__campo">
          <span id="filtro-rol">Rol</span>
          <div className="segmentos" role="group" aria-labelledby="filtro-rol">
            {[{ id: 'todos', nombre: 'Todos' }, ...ROLES].map((r) => (
              <button key={r.id} type="button" className={`segmento ${rol === r.id ? 'segmento--activo' : ''}`} aria-pressed={rol === r.id} onClick={() => cambiar({ rol: r.id === 'todos' ? '' : r.id })}>
                {FILTRO_ROL[r.id]}
              </button>
            ))}
          </div>
        </div>
      </form>

      <div aria-live="polite">{aviso && <p className={`alerta alerta--${aviso.tipo === 'ok' ? 'ok' : 'error'}`}>{aviso.texto}</p>}</div>

      {lista.cargando && !lista.datos ? (
        <Esqueleto filas={6} alto={56} etiqueta="Cargando usuarios" />
      ) : lista.error ? (
        <EstadoError error={lista.error} onReintentar={lista.reintentar} titulo="No se han podido cargar los usuarios" />
      ) : filas.length === 0 ? (
        <EstadoVacio icono="👤" titulo={hayFiltros ? 'Ningún usuario coincide' : 'No hay usuarios'} texto={hayFiltros ? 'Prueba con otra búsqueda o rol.' : undefined} />
      ) : (
        <>
          <div className="tabla-scroll" aria-busy={lista.cargando}>
            <table className="tabla tabla-usuarios">
              <caption className="sr-only">Usuarios registrados</caption>
              <thead>
                <tr>
                  <th scope="col">Usuario</th>
                  <th scope="col">Rol</th>
                  <th scope="col">Puntos</th>
                  <th scope="col">Alta</th>
                  <th scope="col">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filas.map((u) => {
                  const esYo = String(u.id) === String(yo.id);
                  return (
                    <tr key={u.id} className={esYo ? 'fila--yo' : undefined}>
                      <th scope="row">
                        <span className="tabla-usuarios__usuario">
                          <Avatar id={u.avatar_url} tamano={34} />
                          <span>
                            <strong>{u.nick}</strong>
                            {esYo && <span className="etiqueta etiqueta--ok"> Tú</span>}
                            <small>{u.email}</small>
                          </span>
                        </span>
                      </th>
                      <td>
                        <label className="sr-only" htmlFor={`rol-${u.id}`}>
                          Rol de {u.nick}
                        </label>
                        <select
                          id={`rol-${u.id}`}
                          className={`selector-rol selector-rol--${u.rol}`}
                          value={u.rol}
                          disabled={esYo}
                          title={esYo ? 'No puedes cambiar tu propio rol' : undefined}
                          onChange={(e) => setAccion({ tipo: 'rol', u, rol: e.target.value })}
                        >
                          {ROLES.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.nombre}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="tabla-usuarios__puntos">{nf.format(u.puntos_totales ?? 0)} pts</td>
                      <td className="texto-suave">{fecha(u.created_at)}</td>
                      <td className="tabla__acciones">
                        <button
                          type="button"
                          className="btn btn--oscuro btn--sm"
                          onClick={() => {
                            setNick(u.nick);
                            setErrorNick(null);
                            setAccion({ tipo: 'nick', u });
                          }}
                        >
                          Cambiar nick
                        </button>
                        <button type="button" className="btn btn--peligro btn--sm" disabled={esYo} onClick={() => setAccion({ tipo: 'borrar', u })} aria-label={`Eliminar la cuenta de ${u.nick}`}>
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {lista.datos.paginas > 1 ? (
            <nav className="paginacion" aria-label="Paginación">
              <button type="button" className="btn btn--oscuro btn--sm" disabled={pagina <= 1} onClick={() => cambiar({ pagina: pagina - 1 > 1 ? String(pagina - 1) : '' }, false)}>
                ← Anterior
              </button>
              <span className="paginacion__info">
                Página {lista.datos.pagina} de {lista.datos.paginas} · {lista.datos.total} usuarios
              </span>
              <button type="button" className="btn btn--oscuro btn--sm" disabled={pagina >= lista.datos.paginas} onClick={() => cambiar({ pagina: String(pagina + 1) }, false)}>
                Siguiente →
              </button>
            </nav>
          ) : (
            <p className="paginacion__info texto-suave">{lista.datos.total} {lista.datos.total === 1 ? 'usuario' : 'usuarios'}</p>
          )}
        </>
      )}

      <Dialogo
        abierto={Boolean(accion)}
        titulo={tituloDialogo}
        peligro={accion?.tipo === 'borrar'}
        onCerrar={cerrar}
        acciones={
          <>
            <button type="button" className="btn btn--oscuro" onClick={cerrar} disabled={trabajando}>
              Cancelar
            </button>
            <button type="button" className={`btn ${accion?.tipo === 'borrar' ? 'btn--peligro' : 'btn--primario'}`} onClick={ejecutar} disabled={trabajando} aria-busy={trabajando}>
              {trabajando ? 'Guardando…' : accion?.tipo === 'borrar' ? 'Eliminar cuenta' : 'Confirmar'}
            </button>
          </>
        }
      >
        {accion?.tipo === 'rol' && (
          <p>
            Pasará de <strong>{nombreRol(accion.u.rol)}</strong> a <strong>{nombreRol(accion.rol)}</strong>.
            {accion.rol === 'admin' && ' Podrá gestionar usuarios y roles, incluido el tuyo.'}
            {accion.rol === 'editor' && ' Podrá crear, ocultar y eliminar preguntas.'}
            {accion.rol === 'usuario' && ' Perderá el acceso al panel de gestión.'}
          </p>
        )}
        {accion?.tipo === 'nick' && (
          <div className="campo">
            <label htmlFor="nuevo-nick">Nuevo nick</label>
            <input
              id="nuevo-nick"
              value={nick}
              maxLength={30}
              autoFocus
              onChange={(e) => {
                setNick(e.target.value);
                setErrorNick(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && ejecutar()}
              aria-invalid={Boolean(errorNick) || undefined}
              aria-describedby={errorNick ? 'nuevo-nick-error' : 'nuevo-nick-ayuda'}
            />
            {errorNick ? (
              <span className="campo__error" id="nuevo-nick-error">
                {errorNick}
              </span>
            ) : (
              <span className="campo__ayuda" id="nuevo-nick-ayuda">
                Útil para moderar nicks inapropiados. El usuario verá el cambio al volver a entrar.
              </span>
            )}
          </div>
        )}
        {accion?.tipo === 'borrar' && (
          <p className="texto-suave">
            Se borrarán su perfil, sus partidas y su progreso ({accion.u.email}). No se puede deshacer.
          </p>
        )}
      </Dialogo>
    </div>
  );
}
