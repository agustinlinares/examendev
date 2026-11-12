import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import Campo from '../../components/Campo.jsx';
import { Spinner } from '../../components/estados/Estados.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { NOMBRES_FUERZA, fuerzaPassword, validarEmail, validarNick, validarPassword } from '../../utils/validacion.js';
import { enviarPartidaPendiente, hayPartidaPendiente } from '../../utils/partidaPendiente.js';
import { USAR_MOCK } from '../../api/config.js';
import AvisoDemo from './AvisoDemo.jsx';
import { destinoSeguro } from './Login.jsx';

const INICIAL = { nick: '', email: '', password: '', confirmar: '', normas: false };

function validar(d) {
  return {
    nick: validarNick(d.nick),
    email: validarEmail(d.email),
    password: validarPassword(d.password),
    confirmar: d.confirmar !== d.password ? 'Las contraseñas no coinciden.' : null,
    normas: d.normas ? null : 'Debes aceptar las normas de uso para crear la cuenta.',
  };
}

export default function Registro() {
  const { usuario, registrarse } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const destino = destinoSeguro(params.get('volver'));
  const [datos, setDatos] = useState(INICIAL);
  const [errores, setErrores] = useState({});
  const [tocados, setTocados] = useState({});
  const [errorGeneral, setErrorGeneral] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const alertaRef = useRef(null);

  useEffect(() => {
    if (errorGeneral) alertaRef.current?.focus();
  }, [errorGeneral]);

  if (usuario && !enviando) return <Navigate to={destino} replace />;

  const cambiar = (e) => {
    const { name, type, checked } = e.target;
    const value = type === 'checkbox' ? checked : e.target.value;
    const nuevos = { ...datos, [name]: value };
    setDatos(nuevos);
    // Revalida en vivo los campos que el usuario ya ha tocado (la casilla, siempre).
    if (tocados[name] || type === 'checkbox') setErrores((er) => ({ ...er, [name]: validar(nuevos)[name] }));
  };

  const salir = (e) => {
    const { name } = e.target;
    setTocados((t) => ({ ...t, [name]: true }));
    setErrores((er) => ({ ...er, [name]: validar(datos)[name] }));
  };

  const enviar = async (e) => {
    e.preventDefault();
    const nuevos = validar(datos);
    setErrores(nuevos);
    setTocados({ nick: true, email: true, password: true, confirmar: true, normas: true });
    setErrorGeneral(null);
    if (Object.values(nuevos).some(Boolean)) {
      document.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    setEnviando(true);
    try {
      await registrarse({ nick: datos.nick.trim(), email: datos.email.trim(), password: datos.password });
      const guardada = hayPartidaPendiente() ? await enviarPartidaPendiente().catch(() => null) : null;
      navigate(guardada ? '/ranking?guardada=1' : destino, { replace: true });
    } catch (err) {
      if (err.campo) setErrores((er) => ({ ...er, [err.campo]: err.message }));
      else setErrorGeneral(err.message);
      setEnviando(false);
    }
  };

  const fuerza = fuerzaPassword(datos.password);

  return (
    <section className="cuenta contenedor">
      <div className="cuenta__tarjeta tarjeta">
        <span className="pildora">Mi cuenta</span>
        <h1 className="titulo-display titulo-display--sm">Crea tu cuenta</h1>
        <p className="cuenta__intro">Es gratis. Tu nick es lo que verán los demás en el ranking.</p>
        {USAR_MOCK && <AvisoDemo />}

        {errorGeneral && (
          <div className="alerta alerta--error" role="alert" tabIndex={-1} ref={alertaRef}>
            {errorGeneral}
          </div>
        )}

        <form onSubmit={enviar} noValidate>
          <Campo etiqueta="Nick" name="nick" autoComplete="username" value={datos.nick} onChange={cambiar} onBlur={salir} error={errores.nick} ayuda="Entre 3 y 20 caracteres: letras, números, _ . o -" maxLength={20} />
          <Campo etiqueta="Correo electrónico" name="email" type="email" autoComplete="email" value={datos.email} onChange={cambiar} onBlur={salir} error={errores.email} />
          <Campo etiqueta="Contraseña" name="password" type="password" autoComplete="new-password" value={datos.password} onChange={cambiar} onBlur={salir} error={errores.password} ayuda="Mínimo 8 caracteres, con letras y números.">
            {datos.password && (
              <div className={`fuerza fuerza--${fuerza}`} aria-live="polite">
                <span className="fuerza__barra" aria-hidden="true">
                  <span style={{ width: `${(fuerza / 4) * 100}%` }} />
                </span>
                <span className="fuerza__texto">Seguridad: {NOMBRES_FUERZA[fuerza]}</span>
              </div>
            )}
          </Campo>
          <Campo etiqueta="Repite la contraseña" name="confirmar" type="password" autoComplete="new-password" value={datos.confirmar} onChange={cambiar} onBlur={salir} error={errores.confirmar} />
          <div className="campo campo--check">
            <label className="check">
              <input type="checkbox" name="normas" checked={datos.normas} onChange={cambiar} aria-invalid={Boolean(errores.normas)} aria-describedby={errores.normas ? 'normas-error' : undefined} />
              <span>
                He leído y acepto las{' '}
                <Link to="/normas" className="enlace" target="_blank" rel="noopener">
                  normas de uso
                </Link>{' '}
                (nada de nicks políticos, vulgares, racistas u ofensivos).
              </span>
            </label>
            {errores.normas && (
              <span id="normas-error" className="campo__error">
                {errores.normas}
              </span>
            )}
          </div>
          <button type="submit" className="btn btn--primario btn--lg btn--bloque" disabled={enviando} aria-busy={enviando}>
            {enviando ? (
              <>
                <Spinner pequeno etiqueta="Creando cuenta" /> Creando cuenta…
              </>
            ) : (
              'Crear cuenta'
            )}
          </button>
        </form>

        <p className="cuenta__pie">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="enlace">
            Inicia sesión
          </Link>
        </p>
      </div>
    </section>
  );
}
