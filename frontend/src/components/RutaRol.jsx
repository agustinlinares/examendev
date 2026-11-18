import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Spinner, EstadoVacio } from './estados/Estados.jsx';

// Protege rutas por rol. Solo oculta la interfaz: el backend vuelve a comprobar el rol en cada petición.
//   <RutaRol roles={['editor', 'admin']}>…</RutaRol>
export default function RutaRol({ roles, children }) {
  const { usuario, comprobando } = useAuth();
  const { pathname, search } = useLocation();

  if (comprobando)
    return (
      <div className="pagina-cargando">
        <Spinner etiqueta="Comprobando tus permisos" />
      </div>
    );
  if (!usuario) return <Navigate to={`/login?volver=${encodeURIComponent(pathname + search)}`} replace />;
  if (!roles.includes(usuario.rol))
    return (
      <section className="contenedor contenedor--estrecho">
        <EstadoVacio icono="🔒" titulo="No tienes acceso a esta sección" texto="Esta parte de ExamenDev es solo para el equipo de gestión.">
          <Link to="/" className="btn btn--primario">
            Volver al inicio
          </Link>
        </EstadoVacio>
      </section>
    );
  return children;
}
