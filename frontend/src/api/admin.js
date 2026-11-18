// Servicio del panel de gestión (roles editor y admin).
//
// Endpoints del backend (backend/src/routes/admin.routes.js), todos con token:
//   Editor y admin: GET/POST /admin/preguntas, PATCH /admin/preguntas/:id/estado, DELETE /admin/preguntas/:id
//   Solo admin:     GET /admin/usuarios, PATCH /admin/usuarios/:id/rol | /nick, DELETE /admin/usuarios/:id
// La seguridad la aplica el backend; el frontend solo oculta lo que el rol no puede usar.
import { USAR_MOCK } from './config.js';
import { ApiError, http } from './http.js';

const sinMock = () => {
  throw new ApiError('El panel de gestión necesita el backend: quita VITE_USAR_MOCK y arranca la API.', { status: 503 });
};

// Construye "?a=1&b=2" ignorando valores vacíos.
const consulta = (filtros = {}) => {
  const p = new URLSearchParams();
  Object.entries(filtros).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : '';
};

const real = {
  // ---------- Catálogo (para filtros y formulario) ----------
  async catalogo() {
    const [modulos, certificaciones] = await Promise.all([
      http('/modulos', { conToken: false }),
      http('/certificaciones?todas=true', { conToken: false }),
    ]);
    return { modulos: modulos ?? [], certificaciones: certificaciones ?? [] };
  },

  async temas({ moduloId, certificacionId }) {
    if (!moduloId && !certificacionId) return [];
    return (await http(`/temas${consulta({ modulo_id: moduloId, certificacion_id: certificacionId })}`, { conToken: false })) ?? [];
  },

  // ---------- Preguntas ----------
  listarPreguntas(filtros) {
    return http(`/admin/preguntas${consulta(filtros)}`);
  },
  crearPregunta(datos) {
    return http('/admin/preguntas', { metodo: 'POST', cuerpo: datos });
  },
  cambiarEstadoPregunta(id, activa) {
    return http(`/admin/preguntas/${encodeURIComponent(id)}/estado`, { metodo: 'PATCH', cuerpo: { activa } });
  },
  borrarPregunta(id) {
    return http(`/admin/preguntas/${encodeURIComponent(id)}`, { metodo: 'DELETE' });
  },

  // ---------- Usuarios (solo admin) ----------
  listarUsuarios(filtros) {
    return http(`/admin/usuarios${consulta(filtros)}`);
  },
  cambiarRol(id, rol) {
    return http(`/admin/usuarios/${id}/rol`, { metodo: 'PATCH', cuerpo: { rol } });
  },
  cambiarNick(id, nick) {
    return http(`/admin/usuarios/${id}/nick`, { metodo: 'PATCH', cuerpo: { nick } });
  },
  borrarUsuario(id) {
    return http(`/admin/usuarios/${id}`, { metodo: 'DELETE' });
  },

  // ---------- Resumen ----------
  // Usa los totales de los listados (limite=1) para no necesitar un endpoint nuevo.
  async resumen({ esAdmin }) {
    const total = (r) => r?.total ?? 0;
    const [todas, activas, catalogo, usuarios, editores, admins] = await Promise.all([
      this.listarPreguntas({ limite: 1 }),
      this.listarPreguntas({ limite: 1, activa: 'true' }),
      this.catalogo(),
      esAdmin ? this.listarUsuarios({ limite: 1 }) : null,
      esAdmin ? this.listarUsuarios({ limite: 1, rol: 'editor' }) : null,
      esAdmin ? this.listarUsuarios({ limite: 1, rol: 'admin' }) : null,
    ]);
    return {
      preguntas: { total: total(todas), activas: total(activas), ocultas: total(todas) - total(activas) },
      usuarios: esAdmin ? { total: total(usuarios), editores: total(editores), admins: total(admins) } : null,
      modulos: catalogo.modulos,
      certificaciones: catalogo.certificaciones,
    };
  },
};

const mock = Object.fromEntries(Object.keys(real).map((k) => [k, sinMock]));

export const adminApi = USAR_MOCK ? mock : real;

export const ROLES = [
  { id: 'usuario', nombre: 'Usuario' },
  { id: 'editor', nombre: 'Editor' },
  { id: 'admin', nombre: 'Administrador' },
];

export const DIFICULTADES = [
  { id: 'facil', nombre: 'Fácil' },
  { id: 'media', nombre: 'Media' },
  { id: 'dificil', nombre: 'Difícil' },
];
