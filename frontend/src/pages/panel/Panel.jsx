import { NavLink, Outlet } from 'react-router-dom';
import Avatar from '../../components/Avatar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLES } from '../../api/admin.js';

// Estructura común del panel: cabecera con el rol y navegación por secciones.
export default function Panel() {
  const { usuario, esAdmin } = useAuth();
  const secciones = [
    { to: '/panel', nombre: 'Resumen', end: true },
    { to: '/panel/preguntas', nombre: 'Preguntas', end: true },
    { to: '/panel/preguntas/nueva', nombre: 'Nueva pregunta' },
    ...(esAdmin ? [{ to: '/panel/usuarios', nombre: 'Usuarios' }] : []),
  ];
  const nombreRol = ROLES.find((r) => r.id === usuario.rol)?.nombre ?? usuario.rol;

  return (
    <section className="panel-gestion contenedor">
      <header className="panel-gestion__cabecera">
        <div>
          <span className="pildora">Panel de gestión</span>
          <h1 className="titulo-display titulo-display--sm">
            Hola, <span className="destacado">{usuario.nick}</span>
          </h1>
          <p className="panel-gestion__intro texto-suave">
            {esAdmin
              ? 'Gestiona el banco de preguntas, los usuarios y sus roles.'
              : 'Gestiona el banco de preguntas: crea, publica u oculta y elimina preguntas.'}
          </p>
        </div>
        <div className="panel-gestion__yo">
          <Avatar id={usuario.avatar} tamano={44} />
          <span className={`rol-chip rol-chip--${usuario.rol}`}>{nombreRol}</span>
        </div>
      </header>

      <nav className="panel-gestion__nav" aria-label="Secciones del panel">
        {secciones.map((s) => (
          <NavLink key={s.to} to={s.to} end={s.end} className="panel-gestion__enlace">
            {s.nombre}
          </NavLink>
        ))}
      </nav>

      <Outlet />
    </section>
  );
}
