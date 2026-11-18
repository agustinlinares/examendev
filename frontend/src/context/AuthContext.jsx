import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/auth.js';
import { guardarSesion, leerSesion } from '../api/sesion.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(() => leerSesion());
  // Mientras se comprueba un token guardado, las rutas privadas esperan en vez de redirigir.
  const [comprobando, setComprobando] = useState(() => Boolean(leerSesion()?.token));

  const aplicar = useCallback((nueva) => {
    guardarSesion(nueva);
    setSesion(nueva);
  }, []);

  // Al arrancar, valida el token guardado y refresca los datos del usuario.
  useEffect(() => {
    const token = leerSesion()?.token;
    if (!token) return;
    let activo = true;
    authApi
      .yo(token)
      .then((usuario) => activo && aplicar({ token, usuario }))
      .catch((err) => {
        if (activo && err.status === 401) aplicar(null);
      })
      .finally(() => activo && setComprobando(false));
    return () => {
      activo = false;
    };
  }, [aplicar]);

  const iniciarSesion = useCallback(async (datos) => aplicar(await authApi.login(datos)), [aplicar]);
  const registrarse = useCallback(async (datos) => aplicar(await authApi.registrar(datos)), [aplicar]);
  const cerrarSesion = useCallback(() => aplicar(null), [aplicar]);
  const actualizarUsuario = useCallback(
    (usuario) => setSesion((s) => {
      const nueva = s ? { ...s, usuario } : s;
      guardarSesion(nueva);
      return nueva;
    }),
    [],
  );

  const valor = useMemo(
    () => ({
      usuario: sesion?.usuario ?? null,
      // Solo para mostrar/ocultar UI: la seguridad real la aplica el backend (soloAdmin / soloEditorOAdmin).
      esAdmin: sesion?.usuario?.rol === 'admin',
      esEditor: sesion?.usuario?.rol === 'editor',
      puedeEditar: sesion?.usuario?.rol === 'admin' || sesion?.usuario?.rol === 'editor',
      token: sesion?.token ?? null,
      comprobando,
      iniciarSesion,
      registrarse,
      cerrarSesion,
      actualizarUsuario,
    }),
    [sesion, comprobando, iniciarSesion, registrarse, cerrarSesion, actualizarUsuario],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
