import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import Logo from './Logo.jsx';
import Avatar from './Avatar.jsx';
import { CICLOS } from '../data/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTema } from '../context/TemaContext.jsx';

// Abre/cierra un menú y lo cierra al hacer clic fuera o pulsar Escape.
function useDesplegable() {
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!abierto) return undefined;
    const fuera = (e) => {
      if (!ref.current?.contains(e.target)) setAbierto(false);
    };
    const esc = (e) => {
      if (e.key === 'Escape') {
        setAbierto(false);
        ref.current?.querySelector('button')?.focus();
      }
    };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fuera);
      document.removeEventListener('keydown', esc);
    };
  }, [abierto]);
  return { abierto, setAbierto, ref };
}

function BotonTema() {
  const { tema, alternar } = useTema();
  const oscuro = tema === 'oscuro';
  return (
    <button
      type="button"
      className="boton-icono"
      onClick={alternar}
      aria-label={oscuro ? 'Activar modo claro' : 'Activar modo oscuro'}
      title={oscuro ? 'Modo claro' : 'Modo oscuro'}
    >
      {oscuro ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

const Chevron = ({ girado }) => (
  <svg viewBox="0 0 16 16" aria-hidden="true" className={`chevron ${girado ? 'girado' : ''}`}>
    <path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function Navbar() {
  const { usuario, cerrarSesion, puedeEditar } = useAuth();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const [scroll, setScroll] = useState(false);
  const temario = useDesplegable();
  const cuenta = useDesplegable();
  const { pathname, search } = useLocation();

  // Cierra los menús al cambiar de ruta.
  useEffect(() => {
    setAbierto(false);
    temario.setAbierto(false);
    cuenta.setAbierto(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search]);

  useEffect(() => {
    const onScroll = () => setScroll(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const salir = () => {
    cerrarSesion();
    navigate('/');
  };

  const cerrar = () => setAbierto(false);

  return (
    <header className={`navbar ${scroll ? 'navbar--solida' : ''}`}>
      <div className="navbar__inner contenedor">
        <Logo onClick={cerrar} />

        <nav className={`navbar__nav ${abierto ? 'navbar__nav--abierto' : ''}`} aria-label="Principal">
          <NavLink to="/" end className="navbar__link">
            Inicio
          </NavLink>

          <div className="navbar__desplegable" ref={temario.ref}>
            <button
              type="button"
              className={`navbar__link navbar__toggle ${pathname.startsWith('/temario') ? 'active' : ''}`}
              aria-expanded={temario.abierto}
              aria-haspopup="true"
              onClick={() => temario.setAbierto((v) => !v)}
            >
              Temario
              <Chevron girado={temario.abierto} />
            </button>
            {temario.abierto && (
              <div className="navbar__menu">
                <Link to="/temario">Todos los módulos</Link>
                {CICLOS.map((c) => (
                  <Link key={c.id} to={`/temario?ciclo=${c.id}`} className="navbar__menu-ciclo">
                    <strong>{c.sigla}</strong>
                    <span>{c.nombre}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <NavLink to="/certificaciones" className="navbar__link">
            Certificaciones
          </NavLink>
          <NavLink to="/ranking" className="navbar__link">
            Ranking
          </NavLink>
          <NavLink to="/progreso" className="navbar__link navbar__solo-movil">
            Mi progreso
          </NavLink>
          <NavLink to="/contacto" className="navbar__link">
            Contacto
          </NavLink>

          {/* Bloque de cuenta del menú móvil */}
          <div className="navbar__cuenta-movil">
            {usuario ? (
              <>
                <Link to="/perfil" className="navbar__usuario-movil">
                  <Avatar id={usuario.avatar} tamano={36} />
                  <span>
                    <strong>{usuario.nick}</strong>
                    <small>Ver mi perfil</small>
                  </span>
                </Link>
                {puedeEditar && (
                  <Link to="/panel" className="btn btn--acento btn--bloque">
                    Panel de gestión
                  </Link>
                )}
                <button type="button" className="btn btn--oscuro btn--bloque" onClick={salir}>
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn--oscuro btn--bloque">
                  Iniciar sesión
                </Link>
                <Link to="/temario" className="btn btn--primario btn--bloque">
                  Empezar a practicar
                </Link>
              </>
            )}
          </div>
        </nav>

        <div className="navbar__acciones">
          <BotonTema />
          {usuario ? (
            <>
              <Link to="/progreso" className="btn btn--oscuro btn--sm">
                Mi progreso
              </Link>
              <div className="navbar__desplegable" ref={cuenta.ref}>
                <button
                  type="button"
                  className="navbar__usuario"
                  aria-expanded={cuenta.abierto}
                  aria-haspopup="true"
                  onClick={() => cuenta.setAbierto((v) => !v)}
                >
                  <Avatar id={usuario.avatar} tamano={34} />
                  <span className="navbar__nick">{usuario.nick}</span>
                  <Chevron girado={cuenta.abierto} />
                </button>
                {cuenta.abierto && (
                  <div className="navbar__menu navbar__menu--derecha">
                    {puedeEditar && (
                      <Link to="/panel" className="navbar__menu-panel">
                        Panel de gestión
                      </Link>
                    )}
                    <Link to="/perfil">Mi perfil</Link>
                    <Link to="/progreso">Mi progreso</Link>
                    <Link to="/ranking">Ranking</Link>
                    <button type="button" onClick={salir}>
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn--oscuro btn--sm">
                Iniciar sesión
              </Link>
              <Link to="/temario" className="btn btn--primario btn--sm">
                Empezar a practicar
              </Link>
            </>
          )}
        </div>

        <div className="navbar__movil-derecha">
          <BotonTema />
          <button
            type="button"
            className="navbar__hamburguesa"
            aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={abierto}
            onClick={() => setAbierto((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
}
