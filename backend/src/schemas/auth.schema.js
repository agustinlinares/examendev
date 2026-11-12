import { z } from 'zod';
import { comprobarNick } from '../utils/politicaNick.js';

// Schema para Registro de Usuario (tabla: usuarios)
export const registerSchema = z.object({
  nick: z
    .string({ required_error: 'El nick es obligatorio' })
    .trim()
    .min(3, 'El nick debe tener al menos 3 caracteres')
    .max(30, 'El nick no puede superar los 30 caracteres')
    .regex(/^[a-zA-Z0-9_.-]{3,30}$/, 'El nick no es válido.')
    .superRefine((nick, ctx) => {
      const infraccion = comprobarNick(nick);
      if (infraccion) ctx.addIssue({ code: z.ZodIssueCode.custom, message: infraccion.mensaje });
    }),
  email: z
    .string({ required_error: 'El email es obligatorio' })
    .trim()
    .email('Formato de email no válido')
    .max(120),
  password: z
    .string({ required_error: 'La contraseña es obligatoria' })
    .min(6, 'La contraseña debe tener al menos 6 caracteres')
    .max(100),
  avatar: z.string().max(255).optional().nullable(),
  avatar_url: z.string().max(255).optional().nullable(),
  ciclo_actual_id: z.enum(['dam', 'daw', 'asir', 'smr']).optional().nullable(),
});

// Schema para Login de Usuario
export const loginSchema = z.object({
  email: z.string({ required_error: 'El email es obligatorio' }).trim().email('Email no válido'),
  password: z.string({ required_error: 'La contraseña es obligatoria' }).min(1),
});

export const recuperarSchema = z.object({
  email: z.string({ required_error: 'El email es obligatorio' }).trim().email('Email no válido'),
});

export const restablecerSchema = z.object({
  token: z.string({ required_error: 'El token es obligatorio' }).min(1),
  password: z.string({ required_error: 'La contraseña es obligatoria' }).min(6),
});
