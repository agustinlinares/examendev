// Servicio de cuentas: registro, inicio de sesión y recuperación de contraseña.
import { USAR_MOCK } from './config.js';
import { ApiError, http } from './http.js';
import { esperar, guardarDb, hashear, leerDb, nuevoId, privado, usuarioDeToken } from './mock/db.js';
import { comprobarNick } from '../utils/politicaNick.js';

const NICK_VALIDO = /^[a-zA-Z0-9_.-]{3,20}$/;

// ---------- Implementación simulada ----------

const mock = {
  async registrar({ nick, email, password }) {
    await esperar();
    const db = leerDb();
    const emailNorm = email.trim().toLowerCase();
    if (!NICK_VALIDO.test(nick)) throw new ApiError('El nick no es válido.', { status: 400, campo: 'nick' });
    const infraccion = comprobarNick(nick);
    if (infraccion) throw new ApiError(infraccion.mensaje, { status: 400, campo: 'nick' });
    if (db.usuarios.some((u) => u.nick.toLowerCase() === nick.toLowerCase()))
      throw new ApiError('Ese nick ya está en uso.', { status: 409, campo: 'nick' });
    if (db.usuarios.some((u) => u.email === emailNorm))
      throw new ApiError('Ya existe una cuenta con ese correo.', { status: 409, campo: 'email' });
    const usuario = {
      id: nuevoId(),
      nick,
      email: emailNorm,
      hash: await hashear(password),
      avatar: 'zorro',
      creado: new Date().toISOString(),
    };
    db.usuarios.push(usuario);
    guardarDb(db);
    return { token: `mock.${usuario.id}`, usuario: privado(usuario) };
  },

  async login({ email, password }) {
    await esperar();
    const db = leerDb();
    const usuario = db.usuarios.find((u) => u.email === email.trim().toLowerCase());
    if (!usuario || !usuario.hash || usuario.hash !== (await hashear(password)))
      throw new ApiError('Correo o contraseña incorrectos.', { status: 401 });
    return { token: `mock.${usuario.id}`, usuario: privado(usuario) };
  },

  async yo(token) {
    await esperar();
    const usuario = usuarioDeToken(leerDb(), token);
    if (!usuario) throw new ApiError('La sesión ha caducado.', { status: 401 });
    return privado(usuario);
  },

  // En el mock no se envía correo: se devuelve el enlace para poder probar el flujo.
  async solicitarRecuperacion({ email }) {
    await esperar();
    const db = leerDb();
    const usuario = db.usuarios.find((u) => u.email === email.trim().toLowerCase() && u.hash);
    if (!usuario) return { enviado: true }; // misma respuesta exista o no la cuenta
    const token = nuevoId() + nuevoId();
    db.recuperaciones[token] = { usuarioId: usuario.id, expira: Date.now() + 30 * 60000 };
    guardarDb(db);
    return { enviado: true, enlaceDemo: `/restablecer?token=${token}` };
  },

  async restablecer({ token, password }) {
    await esperar();
    const db = leerDb();
    const solicitud = db.recuperaciones[token];
    if (!solicitud || solicitud.expira < Date.now())
      throw new ApiError('El enlace no es válido o ha caducado. Solicita uno nuevo.', { status: 400 });
    const usuario = db.usuarios.find((u) => u.id === solicitud.usuarioId);
    usuario.hash = await hashear(password);
    delete db.recuperaciones[token];
    guardarDb(db);
    return { ok: true };
  },
};

// ---------- Implementación real (conectada siempre a PostgreSQL a través del backend) ----------

const real = {
  registrar: (datos) => http('/auth/registro', { metodo: 'POST', cuerpo: datos, conToken: false }),
  login: (datos) => http('/auth/login', { metodo: 'POST', cuerpo: datos, conToken: false }),
  yo: () => http('/auth/yo'),
  solicitarRecuperacion: (datos) => http('/auth/recuperar', { metodo: 'POST', cuerpo: datos, conToken: false }),
  restablecer: (datos) => http('/auth/restablecer', { metodo: 'POST', cuerpo: datos, conToken: false }),
};

export const authApi = USAR_MOCK ? mock : real;
export { NICK_VALIDO };
