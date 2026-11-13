import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes.js';
import perfilRoutes from './routes/perfil.routes.js';
import catalogoRoutes from './routes/catalogo.routes.js';
import partidasRoutes from './routes/partidas.routes.js';
import statsRoutes from './routes/stats.routes.js';
import rankingRoutes from './routes/ranking.routes.js';
import studioRoutes from './routes/studio.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { asegurarBaseDeDatosLista } from './db/init.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Endpoint de salud del servidor
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', servicio: 'ExamenDev API' });
});

// Rutas del Contrato entre Backend y Frontend (según PDF Página 3)
// Se exponen tanto en la raíz (/ranking, /stats/temas, /respuestas, /perfil) como bajo /api/...
const apiRouter = express.Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/', perfilRoutes);
apiRouter.use('/stats', statsRoutes);
apiRouter.use('/ranking', rankingRoutes);
apiRouter.use('/studio', studioRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/', catalogoRoutes);
apiRouter.use('/', partidasRoutes);

app.use('/', apiRouter);
app.use('/api', apiRouter);

app.listen(PORT, async () => {
  console.log(`🚀 Servidor Backend de ExamenDev escuchando en http://localhost:${PORT}`);
  await asegurarBaseDeDatosLista();
});
