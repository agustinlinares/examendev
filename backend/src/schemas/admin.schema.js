import { z } from 'zod';

const opcionSchema = z.object({
  texto: z.string({ required_error: 'El texto de la opción es obligatorio' }).trim().min(1, 'La opción no puede estar vacía'),
  es_correcta: z.boolean(),
});

export const crearPreguntaSchema = z
  .object({
    modulo_id: z.string().trim().min(1).max(50).optional().nullable(),
    certificacion_id: z.string().trim().min(1).max(30).optional().nullable(),
    tema_id: z.coerce.number().int().positive('El tema_id debe ser un entero positivo'),
    enunciado: z.string({ required_error: 'El enunciado es obligatorio' }).trim().min(5, 'El enunciado debe tener al menos 5 caracteres'),
    codigo: z.string().trim().optional().nullable(),
    explicacion: z.string().trim().optional().nullable(),
    dificultad: z.enum(['facil', 'media', 'dificil']).default('media'),
    activa: z.boolean().default(true),
    opciones: z
      .array(opcionSchema, { required_error: 'Las opciones son obligatorias' })
      .min(2, 'Debe haber al menos 2 opciones')
      .max(6, 'No puede haber más de 6 opciones'),
  })
  .superRefine((data, ctx) => {
    const correctas = data.opciones.filter((o) => o.es_correcta).length;
    if (correctas !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['opciones'],
        message: 'Debe haber exactamente una opción marcada como correcta.',
      });
    }
    if (data.modulo_id && data.certificacion_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['modulo_id'],
        message: 'Una pregunta no puede pertenecer a un módulo y a una certificación a la vez.',
      });
    }
  });

export const listarPreguntasAdminSchema = z.object({
  modulo_id: z.string().trim().optional(),
  certificacion_id: z.string().trim().optional(),
  tema_id: z.coerce.number().int().positive().optional(),
  activa: z.enum(['true', 'false', 'todas']).default('todas'),
  q: z.string().trim().optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(25),
});

export const estadoPreguntaSchema = z.object({
  activa: z.boolean(),
});

export const cambiarRolSchema = z.object({
  rol: z.enum(['usuario', 'editor', 'admin']),
});

export const listarUsuariosAdminSchema = z.object({
  rol: z.enum(['usuario', 'editor', 'admin', 'todos']).default('todos'),
  q: z.string().trim().optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(25),
});

export const cambiarNickUsuarioSchema = z.object({
  nick: z
    .string({ required_error: 'El nick es obligatorio' })
    .trim()
    .min(3, 'El nick debe tener al menos 3 caracteres')
    .max(30, 'El nick no puede superar los 30 caracteres')
    .regex(/^[a-zA-Z0-9_.-]{3,30}$/, 'El nick no es válido.'),
});
