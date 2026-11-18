import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Avatar from '../components/Avatar.jsx';
import Campo from '../components/Campo.jsx';
import { EstadoError, EstadoVacio, Esqueleto, Spinner } from '../components/estados/Estados.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { usePeticion } from '../hooks/usePeticion.js';
import { usuariosApi } from '../api/usuarios.js';
import { AVATARES } from '../utils/avatares.js';
import { evaluarLogros } from '../utils/logros.js';
import { formatearPuntos } from '../utils/puntos.js';
import { validarNick } from '../utils/validacion.js';
import { formatearFecha } from '../utils/quiz.js';
import { getModulo } from '../data/index.js';

function EditarPerfil({ usuario, onGuardado }) {
  const [nick, setNick] = useState(usuario.nick);
  const [avatar, setAvatar] = useState(usuario.avatar);
  const [error, setError] = useState(null);
  const [estado, setEstado] = useState({ tipo: 'inicial' });

  useEffect(() => {
    setNick(usuario.nick);
    setAvatar(usuario.avatar);
  }, [usuario]);

  const cambios = nick !== usuario.nick || avatar !== usuario.avatar;

  const guardar = async (e) => {
    e.preventDefault();
    const err = validarNick(nick);
    setError(err);
    if (err) return;
    setEstado({ tipo: 'guardando' });
    try {
      const actualizado = await usuariosApi.actualizar({ nick: nick.trim(), avatar });
      onGuardado(actualizado);
      setEstado({ tipo: 'ok' });
    } catch (er) {
      if (er.campo === 'nick') setError(er.message);
      setEstado({ tipo: 'error', mensaje: er.message });
    }
  };

  // Navegación con flechas dentro del grupo de avatares (patrón radiogroup).
  const teclaAvatar = (e, i) => {
    const mov = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!mov) return;
    e.preventDefault();
    const siguiente = AVATARES[(i + mov + AVATARES.length) % AVATARES.length];
    setAvatar(siguiente.id);
    document.getElementById(`avatar-${siguiente.id}`)?.focus();
  };

  return (
    <form className="tarjeta perfil__editar" onSubmit={guardar} noValidate>
      <h2 className="perfil__titulo">Editar perfil</h2>
      <Campo etiqueta="Nick" value={nick} maxLength={20} onChange={(e) => { setNick(e.target.value); setError(null); setEstado({ tipo: 'inicial' }); }} error={error} ayuda="Es lo que ven los demás en el ranking. Debe cumplir las normas de uso (/normas)." />

      <div className="campo">
        <span className="campo__etiqueta" id="etiqueta-avatar">
          Avatar
        </span>
        <div className="avatares" role="radiogroup" aria-labelledby="etiqueta-avatar">
          {AVATARES.map((a, i) => (
            <button
              key={a.id}
              id={`avatar-${a.id}`}
              type="button"
              role="radio"
              aria-checked={avatar === a.id}
              aria-label={a.nombre}
              tabIndex={avatar === a.id ? 0 : -1}
              className={`avatares__opcion ${avatar === a.id ? 'avatares__opcion--activo' : ''}`}
              onClick={() => { setAvatar(a.id); setEstado({ tipo: 'inicial' }); }}
              onKeyDown={(e) => teclaAvatar(e, i)}
            >
              <Avatar id={a.id} tamano={44} />
            </button>
          ))}
        </div>
      </div>

      <div className="perfil__guardar">
        <button type="submit" className="btn btn--primario" disabled={!cambios || estado.tipo === 'guardando'} aria-busy={estado.tipo === 'guardando'}>
          {estado.tipo === 'guardando' ? (
            <>
              <Spinner pequeno etiqueta="Guardando" /> Guardando…
            </>
          ) : (
            'Guardar cambios'
          )}
        </button>
        <span aria-live="polite" className="perfil__mensaje">
          {estado.tipo === 'ok' && <span className="texto-ok">✓ Cambios guardados</span>}
          {estado.tipo === 'error' && !error && <span className="texto-ko">{estado.mensaje}</span>}
        </span>
      </div>
    </form>
  );
}

export default function Perfil() {
  const { usuario, actualizarUsuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const { cargando, datos, error, reintentar } = usePeticion(() => usuariosApi.perfil(), [usuario?.id]);

  const salir = () => {
    cerrarSesion();
    navigate('/');
  };

  if (cargando && !datos)
    return (
      <section className="perfil contenedor">
        <Esqueleto filas={1} alto={120} etiqueta="Cargando tu perfil" />
        <div className="perfil__stats-esqueleto">
          <Esqueleto filas={4} alto={88} />
        </div>
      </section>
    );

  if (error)
    return (
      <section className="perfil contenedor">
        <EstadoError error={error} onReintentar={reintentar} titulo="No se ha podido cargar tu perfil" />
      </section>
    );

  const { estadisticas: e, ultimasPartidas } = datos;
  const u = usuario ?? datos.usuario;
  const logros = evaluarLogros(e);
  const conseguidos = logros.filter((l) => l.conseguido).length;
  const precision = e.preguntas ? Math.round((e.aciertos / e.preguntas) * 100) : null;

  return (
    <section className="perfil contenedor">
      <header className="perfil__cabecera seccion-oscura">
        <Avatar id={u.avatar} tamano={88} etiqueta={`Avatar de ${u.nick}`} />
        <div>
          <span className="pildora">Mi perfil</span>
          <h1 className="perfil__nick">{u.nick}</h1>
          <p className="perfil__meta">
            {u.email} · Miembro desde {new Date(u.creado).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button type="button" className="btn btn--claro btn--sm perfil__salir" onClick={salir}>
          Cerrar sesión
        </button>
      </header>

      <dl className="perfil__stats">
        <div className="stat">
          <dt className="stat__etiqueta">Puntos</dt>
          <dd className="stat__valor">{formatearPuntos(e.puntos)}</dd>
        </div>
        <div className="stat">
          <dt className="stat__etiqueta">Racha de días</dt>
          <dd className="stat__valor">📅 {e.rachaDias}</dd>
        </div>
        <div className="stat">
          <dt className="stat__etiqueta">Mejor racha de aciertos</dt>
          <dd className="stat__valor">🔥 {e.mejorRacha}</dd>
        </div>
        <div className="stat">
          <dt className="stat__etiqueta">Partidas · precisión</dt>
          <dd className="stat__valor">
            {e.partidas}
            {precision !== null && <small> · {precision} %</small>}
          </dd>
        </div>
      </dl>

      <div className="perfil__columnas">
        <div>
          <h2 className="subtitulo-seccion">
            Logros <span className="texto-suave">({conseguidos}/{logros.length})</span>
          </h2>
          <ul className="logros">
            {logros.map((l) => (
              <li key={l.id} className={`logro ${l.conseguido ? 'logro--conseguido' : ''}`}>
                <span className="logro__icono" aria-hidden="true">
                  {l.icono}
                </span>
                <span className="logro__cuerpo">
                  <strong>{l.titulo}</strong>
                  <span className="logro__texto">{l.texto}</span>
                  {!l.conseguido && (
                    <span className="logro__progreso" role="progressbar" aria-valuemin={0} aria-valuemax={l.objetivo} aria-valuenow={l.actual} aria-label={`Progreso de ${l.titulo}`}>
                      <span style={{ width: `${(l.actual / l.objetivo) * 100}%` }} />
                    </span>
                  )}
                </span>
                <span className="logro__estado">{l.conseguido ? '✓' : `${formatearPuntos(l.actual)}/${formatearPuntos(l.objetivo)}`}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="perfil__lateral">
          <EditarPerfil usuario={u} onGuardado={actualizarUsuario} />

          <div className="tarjeta perfil__partidas">
            <h2 className="perfil__titulo">Últimas partidas de trivia</h2>
            {ultimasPartidas.length === 0 ? (
              <EstadoVacio icono="🎮" titulo="Aún no has jugado" texto="Tus partidas de trivia aparecerán aquí.">
                <Link to="/temario" className="btn btn--acento btn--sm">
                  Jugar trivia
                </Link>
              </EstadoVacio>
            ) : (
              <ul className="historial">
                {ultimasPartidas.map((p) => (
                  <li key={p.id} className="historial__item">
                    <div>
                      <strong>{getModulo(p.moduloId)?.nombre ?? p.moduloId}</strong>
                      <span className="texto-suave">
                        {formatearFecha(p.fecha)} · {p.aciertos}/{p.total} · 🔥 {p.rachaMax}
                      </span>
                    </div>
                    <strong className="historial__puntos">{formatearPuntos(p.puntos)}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
