// Desplegable de módulo o certificación, agrupado por ciclo. Valor: "modulo:<id>" o "certificacion:<id>".
export const valorOrigen = (tipo, id) => (id ? `${tipo}:${id}` : '');

export const leerOrigen = (valor) => {
  const [tipo, ...resto] = String(valor || '').split(':');
  const id = resto.join(':');
  if (!id) return { moduloId: '', certificacionId: '' };
  return tipo === 'certificacion' ? { moduloId: '', certificacionId: id } : { moduloId: id, certificacionId: '' };
};

export default function SelectorOrigen({ catalogo, value, onChange, id, todos = 'Todos', required = false, invalido = false, describedBy }) {
  const grupos = {};
  catalogo.modulos.forEach((m) => {
    const ciclo = m.ciclos?.[0] ?? 'Otros';
    (grupos[ciclo] ??= []).push(m);
  });
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} required={required} aria-invalid={invalido || undefined} aria-describedby={describedBy}>
      <option value="">{todos}</option>
      {Object.entries(grupos).map(([ciclo, mods]) => (
        <optgroup key={ciclo} label={`Módulos · ${ciclo}`}>
          {mods.map((m) => (
            <option key={m.id} value={valorOrigen('modulo', m.id)}>
              {m.nombre}
            </option>
          ))}
        </optgroup>
      ))}
      {catalogo.certificaciones.length > 0 && (
        <optgroup label="Certificaciones">
          {catalogo.certificaciones.map((c) => (
            <option key={c.id} value={valorOrigen('certificacion', c.id)}>
              {c.codigo_examen} · {c.nombre.replace(/^Microsoft Certified:\s*/i, '')}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}
