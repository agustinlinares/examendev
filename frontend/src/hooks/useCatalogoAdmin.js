import { useEffect, useState } from 'react';
import { adminApi } from '../api/admin.js';
import { usePeticion } from './usePeticion.js';
import { leerOrigen } from '../pages/panel/SelectorOrigen.jsx';

// Catálogo (módulos + certificaciones) cacheado para toda la sesión del panel.
let cache = null;
export function useCatalogoAdmin() {
  return usePeticion(async () => {
    if (!cache) cache = await adminApi.catalogo();
    return cache;
  }, []);
}

// Temas del origen elegido ("modulo:<id>" o "certificacion:<id>").
// Los de los módulos ya vienen en el catálogo; los de certificaciones se piden a /temas.
export function useTemas(catalogo, origen) {
  const [temas, setTemas] = useState([]);
  useEffect(() => {
    const { moduloId, certificacionId } = leerOrigen(origen);
    if (!catalogo || (!moduloId && !certificacionId)) {
      setTemas([]);
      return;
    }
    const modulo = moduloId && catalogo.modulos.find((m) => m.id === moduloId);
    if (modulo?.temas) {
      setTemas(modulo.temas);
      return;
    }
    let activo = true;
    adminApi
      .temas({ moduloId, certificacionId })
      .then((t) => activo && setTemas(t))
      .catch(() => activo && setTemas([]));
    return () => {
      activo = false;
    };
  }, [catalogo, origen]);
  return temas;
}
