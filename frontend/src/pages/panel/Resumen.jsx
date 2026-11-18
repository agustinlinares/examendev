import { Link } from 'react-router-dom';
import { EstadoError, Esqueleto } from '../../components/estados/Estados.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { usePeticion } from '../../hooks/usePeticion.js';
import { adminApi } from '../../api/admin.js';

const nf = new Intl.NumberFormat('es-ES');

function Kpi({ etiqueta, valor, detalle, tono }) {
  return (
    <div className={`kpi ${tono ? `kpi--${tono}` : ''}`}>
      <dt className="kpi__etiqueta">{etiqueta}</dt>
      <dd className="kpi__valor">{nf.format(valor)}</dd>
      {detalle && <dd className="kpi__detalle">{detalle}</dd>}
    </div>
  );
}

export default function Resumen() {
  const { esAdmin } = useAuth();
  const { cargando, datos, error, reintentar } = usePeticion(() => adminApi.resumen({ esAdmin }), [esAdmin]);

  if (cargando) return <Esqueleto filas={3} alto={110} etiqueta="Cargando el resumen" />;
  if (error) return <EstadoError error={error} onReintentar={reintentar} titulo="No se ha podido cargar el resumen" />;

  const { preguntas, usuarios, modulos, certificaciones } = datos;
  const pctActivas = preguntas.total ? Math.round((preguntas.activas / preguntas.total) * 100) : 0;

  // Módulos y certificaciones con menos preguntas publicadas: donde más falta contenido.
  const huecos = [
    ...modulos.map((m) => ({ id: m.id, nombre: m.nombre, tipo: 'Módulo', total: m.total_preguntas ?? 0, param: 'modulo' })),
    ...certificaciones.map((c) => ({ id: c.id, nombre: `${c.codigo_examen} · ${c.nombre.replace(/^Microsoft Certified:\s*/i, '')}`, tipo: 'Certificación', total: c.total_preguntas ?? null, param: 'certificacion' })),
  ]
    .filter((h) => h.total !== null)
    .sort((a, b) => a.total - b.total)
    .slice(0, 6);
  const maxHueco = Math.max(20, ...huecos.map((h) => h.total));

  return (
    <div className="panel-resumen">
      <h2 className="subtitulo-seccion">Banco de preguntas</h2>
      <dl className="kpis">
        <Kpi etiqueta="Preguntas en total" valor={preguntas.total} />
        <Kpi etiqueta="Publicadas" valor={preguntas.activas} detalle={`${pctActivas} % del banco`} tono="ok" />
        <Kpi etiqueta="Ocultas" valor={preguntas.ocultas} detalle="No salen en los tests" tono="aviso" />
        <Kpi etiqueta="Módulos y certificaciones" valor={modulos.length + certificaciones.length} detalle={`${modulos.length} ${modulos.length === 1 ? 'módulo' : 'módulos'} · ${certificaciones.length} ${certificaciones.length === 1 ? 'certificación' : 'certificaciones'}`} />
      </dl>

      {usuarios && (
        <>
          <h2 className="subtitulo-seccion">Usuarios</h2>
          <dl className="kpis">
            <Kpi etiqueta="Cuentas registradas" valor={usuarios.total} />
            <Kpi etiqueta="Editores" valor={usuarios.editores} />
            <Kpi etiqueta="Administradores" valor={usuarios.admins} />
            <Kpi etiqueta="Usuarios estándar" valor={Math.max(0, usuarios.total - usuarios.editores - usuarios.admins)} />
          </dl>
        </>
      )}

      <div className="panel-resumen__columnas">
        <article className="tarjeta panel">
          <h2 className="panel__titulo">Dónde faltan preguntas</h2>
          <p className="panel__ayuda texto-suave">Módulos y certificaciones con menos preguntas publicadas.</p>
          <ul className="huecos">
            {huecos.map((h) => (
              <li key={`${h.param}-${h.id}`} className="hueco">
                <div className="hueco__cabecera">
                  <span className="hueco__nombre">
                    <small>{h.tipo}</small>
                    {h.nombre}
                  </span>
                  <strong className="hueco__total">{h.total}</strong>
                </div>
                <div className="hueco__pista" aria-hidden="true">
                  <span style={{ width: `${(h.total / maxHueco) * 100}%` }} />
                </div>
                <Link to={`/panel/preguntas/nueva?${h.param}=${h.id}`} className="enlace hueco__accion">
                  Añadir pregunta
                </Link>
              </li>
            ))}
          </ul>
        </article>

        <article className="tarjeta panel">
          <h2 className="panel__titulo">Accesos rápidos</h2>
          <div className="accesos">
            <Link to="/panel/preguntas/nueva" className="acceso">
              <span aria-hidden="true">➕</span>
              <strong>Crear una pregunta</strong>
              <small>Con 2 a 6 opciones y su explicación.</small>
            </Link>
            <Link to="/panel/preguntas?activa=false" className="acceso">
              <span aria-hidden="true">👁️</span>
              <strong>Revisar preguntas ocultas</strong>
              <small>{nf.format(preguntas.ocultas)} pendientes de publicar.</small>
            </Link>
            {usuarios && (
              <Link to="/panel/usuarios" className="acceso">
                <span aria-hidden="true">👥</span>
                <strong>Gestionar usuarios</strong>
                <small>Roles, nicks y cuentas.</small>
              </Link>
            )}
          </div>
        </article>
      </div>
    </div>
  );
}
