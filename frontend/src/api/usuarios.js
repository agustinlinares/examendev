// Servicio de perfil: datos del usuario, estadísticas y edición de nick y avatar.
import { USAR_MOCK } from './config.js';
import { ApiError, http } from './http.js';
import { leerSesion } from './sesion.js';
import { esperar, guardarDb, leerDb, privado, usuarioDeToken } from './mock/db.js';
import { NICK_VALIDO } from './auth.js';
import { estadisticasDePartidas } from '../utils/estadisticas.js';
import { comprobarNick } from '../utils/politicaNick.js';

const usuarioActual = (db) => {
  const usuario = usuarioDeToken(db, leerSesion()?.token);
  if (!usuario) throw new ApiError('Tienes que iniciar sesión.', { status: 401 });
  return usuario;
};

const mock = {
  async perfil() {
    await esperar();
    const db = leerDb();
    const usuario = usuarioActual(db);
    const partidas = db.puntuaciones.filter((p) => p.usuarioId === usuario.id);
    return {
      usuario: privado(usuario),
      estadisticas: estadisticasDePartidas(partidas),
      ultimasPartidas: [...partidas].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 5),
    };
  },

  async actualizar({ nick, avatar }) {
    await esperar();
    const db = leerDb();
    const usuario = usuarioActual(db);
    if (nick !== undefined) {
      if (!NICK_VALIDO.test(nick)) throw new ApiError('El nick no es válido.', { status: 400, campo: 'nick' });
      const infraccion = comprobarNick(nick);
      if (infraccion) throw new ApiError(infraccion.mensaje, { status: 400, campo: 'nick' });
      if (db.usuarios.some((u) => u.id !== usuario.id && u.nick.toLowerCase() === nick.toLowerCase()))
        throw new ApiError('Ese nick ya está en uso.', { status: 409, campo: 'nick' });
      usuario.nick = nick;
    }
    if (avatar !== undefined) usuario.avatar = avatar;
    guardarDb(db);
    return privado(usuario);
  },
};

const real = {
  perfil: () => http('/usuarios/yo/perfil'),
  actualizar: (datos) => http('/usuarios/yo', { metodo: 'PATCH', cuerpo: datos }),
};

export const usuariosApi = USAR_MOCK ? mock : real;
