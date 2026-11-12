import { Link } from 'react-router-dom';
import { NORMAS } from '../utils/politicaNick.js';
import { SITE } from '../config.js';

export default function Normas() {
  return (
    <section className="normas contenedor">
      <header className="normas__intro">
        <span className="pildora">Políticas de uso</span>
        <h1 className="titulo-display titulo-display--md">Normas de la comunidad</h1>
        <p className="lead">
          Tu nick aparece en el ranking y lo ven todos los usuarios. Para que {SITE.nombre} sea un sitio cómodo para estudiar, al crear tu
          cuenta aceptas cumplir estas normas.
        </p>
      </header>

      <ol className="normas__lista">
        {NORMAS.map((n, i) => (
          <li key={n.id} className="tarjeta normas__item">
            <span className="normas__numero" aria-hidden="true">
              {i + 1}
            </span>
            <div>
              <h2>{n.titulo}</h2>
              <p>{n.texto}</p>
              <p className="normas__ejemplos">
                <span className="texto-suave">Ejemplos no permitidos:</span>{' '}
                {n.ejemplos.map((e) => (
                  <code key={e}>{e}</code>
                ))}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="tarjeta normas__aviso">
        <h2>¿Qué pasa si no se cumplen?</h2>
        <ul>
          <li>Los nicks que incumplen las normas se rechazan automáticamente al registrarte o al cambiarlo en tu perfil.</li>
          <li>Si alguno se cuela, el equipo puede cambiarlo, retirarlo del ranking o suspender la cuenta sin previo aviso.</li>
          <li>
            Si ves un nick ofensivo o crees que el tuyo se ha bloqueado por error,{' '}
            <Link to="/contacto" className="enlace">
              escríbenos
            </Link>
            .
          </li>
        </ul>
      </div>
    </section>
  );
}
