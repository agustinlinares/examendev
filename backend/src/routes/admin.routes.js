import { Router } from 'express';
import {
  listarPreguntasAdmin,
  crearPregunta,
  borrarPregunta,
  cambiarEstadoPregunta,
  listarUsuariosAdmin,
  cambiarRolUsuario,
  cambiarNickUsuario,
  borrarUsuario,
} from '../controllers/admin.controller.js';
import { verificarToken, soloAdmin, soloEditorOAdmin } from '../middlewares/auth.middleware.js';
import { validarBody, validarQuery } from '../middlewares/validate.middleware.js';
import {
  crearPreguntaSchema,
  listarPreguntasAdminSchema,
  estadoPreguntaSchema,
  listarUsuariosAdminSchema,
  cambiarRolSchema,
  cambiarNickUsuarioSchema,
} from '../schemas/admin.schema.js';

// Rutas de gestión y administración (/admin/* y /api/admin/*).
// - soloEditorOAdmin: para endpoints de contenido (preguntas, temas, etc.).
// - soloAdmin: para endpoints exclusivos de administrador (gestión de usuarios y roles).
const router = Router();

router.use(verificarToken);

// GET /admin/yo -> comprueba la sesión privilegiada (editor o admin)
router.get('/yo', soloEditorOAdmin, (req, res) => {
  const { id, nick, email, rol } = req.usuario;
  res.json({ ok: true, usuario: { id: String(id), nick, email, rol } });
});

// Gestión de preguntas (editor y admin)
router.get('/preguntas', soloEditorOAdmin, validarQuery(listarPreguntasAdminSchema), listarPreguntasAdmin);
router.post('/preguntas', soloEditorOAdmin, validarBody(crearPreguntaSchema), crearPregunta);
router.patch('/preguntas/:id/estado', soloEditorOAdmin, validarBody(estadoPreguntaSchema), cambiarEstadoPregunta);
router.delete('/preguntas/:id', soloEditorOAdmin, borrarPregunta);

// Gestión de usuarios (solo admin; el editor recibe 403)
router.get('/usuarios', soloAdmin, validarQuery(listarUsuariosAdminSchema), listarUsuariosAdmin);
router.patch('/usuarios/:id/rol', soloAdmin, validarBody(cambiarRolSchema), cambiarRolUsuario);
router.patch('/usuarios/:id/nick', soloAdmin, validarBody(cambiarNickUsuarioSchema), cambiarNickUsuario);
router.delete('/usuarios/:id', soloAdmin, borrarUsuario);

export default router;
