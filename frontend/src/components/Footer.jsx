import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';
import { CICLOS } from '../data/index.js';
import { SITE } from '../config.js';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="contenedor footer__grid">
        <div className="footer__marca">
          <Logo />
          <p>Práctica tipo test para los módulos de DAM, DAW, ASIR y SMR. Corrige al instante, haz simulacros y sigue tu progreso.</p>
        </div>

        <div>
          <h3>Temario</h3>
          <ul>
            {CICLOS.map((c) => (
              <li key={c.id}>
                <Link to={`/temario?ciclo=${c.id}`}>
                  {c.sigla} · {c.grado}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3>Plataforma</h3>
          <ul>
            <li>
              <Link to="/temario">Practicar</Link>
            </li>
            <li>
              <Link to="/progreso">Mi progreso</Link>
            </li>
            <li>
              <Link to="/#preguntas-frecuentes">Preguntas frecuentes</Link>
            </li>
            <li>
              <Link to="/normas">Normas de uso</Link>
            </li>
          </ul>
        </div>

        <div>
          <h3>Contacto</h3>
          <ul>
            <li>
              <Link to="/contacto">Escríbenos</Link>
            </li>
            <li>
              <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
            </li>
          </ul>
        </div>
      </div>

      <div className="contenedor footer__legal">
        <span>
          © {new Date().getFullYear()} {SITE.nombre}
        </span>
        <span>Proyecto independiente de práctica. No sustituye al temario oficial de tu centro.</span>
      </div>
    </footer>
  );
}
