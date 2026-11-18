import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import RutaPrivada from './components/RutaPrivada.jsx';
import Inicio from './pages/Inicio.jsx';
import Temario from './pages/Temario.jsx';
import Certificaciones from './pages/Certificaciones.jsx';
import Test from './pages/Test.jsx';
import Progreso from './pages/Progreso.jsx';
import Ranking from './pages/Ranking.jsx';
import Perfil from './pages/Perfil.jsx';
import Login from './pages/cuenta/Login.jsx';
import Registro from './pages/cuenta/Registro.jsx';
import Recuperar from './pages/cuenta/Recuperar.jsx';
import Restablecer from './pages/cuenta/Restablecer.jsx';
import Contacto from './pages/Contacto.jsx';
import Normas from './pages/Normas.jsx';
import NoEncontrado from './pages/NoEncontrado.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Inicio />} />
        <Route path="temario" element={<Temario />} />
        <Route path="certificaciones" element={<Certificaciones />} />
        <Route path="test/:moduloId" element={<Test />} />
        <Route path="progreso" element={<Progreso />} />
        <Route
          path="ranking"
          element={
            <RutaPrivada>
              <Ranking />
            </RutaPrivada>
          }
        />
        <Route
          path="perfil"
          element={
            <RutaPrivada>
              <Perfil />
            </RutaPrivada>
          }
        />
        <Route path="login" element={<Login />} />
        <Route path="registro" element={<Registro />} />
        <Route path="recuperar" element={<Recuperar />} />
        <Route path="restablecer" element={<Restablecer />} />
        <Route path="contacto" element={<Contacto />} />
        <Route path="normas" element={<Normas />} />
        <Route path="*" element={<NoEncontrado />} />
      </Route>
    </Routes>
  );
}
