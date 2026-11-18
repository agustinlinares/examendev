// Validaciones compartidas por los formularios de cuenta y perfil.
import { NICK_VALIDO } from '../api/auth.js';
import { comprobarNick } from './politicaNick.js';

export const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarNick(nick) {
  if (!nick.trim()) return 'Escribe un nick.';
  if (!NICK_VALIDO.test(nick)) return 'Entre 3 y 20 caracteres: letras, números, guion bajo, punto o guion.';
  const infraccion = comprobarNick(nick);
  if (infraccion) return `${infraccion.mensaje} Consulta las normas de uso.`;
  return null;
}

export function validarEmail(email) {
  if (!email.trim()) return 'Escribe tu correo.';
  if (!EMAIL_VALIDO.test(email.trim())) return 'Ese correo no parece válido.';
  return null;
}

export function validarPassword(password) {
  if (!password) return 'Escribe una contraseña.';
  if (password.length < 8) return 'Mínimo 8 caracteres.';
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return 'Debe incluir al menos una letra y un número.';
  return null;
}

// 0 a 4: muy débil, débil, aceptable, buena, fuerte.
export function fuerzaPassword(password) {
  let puntos = 0;
  if (password.length >= 8) puntos++;
  if (password.length >= 12) puntos++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) puntos++;
  if (/\d/.test(password) && /[^a-zA-Z0-9]/.test(password)) puntos++;
  return Math.min(puntos, 4);
}

export const NOMBRES_FUERZA = ['Muy débil', 'Débil', 'Aceptable', 'Buena', 'Fuerte'];
