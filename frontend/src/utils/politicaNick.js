// Política de uso de nicks de ExamenDev.
// ⚠️ Este archivo existe por duplicado y debe mantenerse IDÉNTICO en:
//    - frontend/src/utils/politicaNick.js  (aviso inmediato en el formulario)
//    - backend/src/utils/politicaNick.js   (comprobación real, no se puede saltar)
//
// Cómo funciona:
//  1. Se normaliza el nick: minúsculas, sin tildes, leetspeak (h1tl3r → hitler),
//     sin símbolos y sin letras repetidas (hiiitler → hitler).
//  2. "subcadena": términos tan específicos que se bloquean aparezcan donde aparezcan.
//  3. "palabra": términos cortos o ambiguos que solo se bloquean si son una palabra
//     completa del nick (separada por _ . - o MayúsculaInicial). Así "computadora"
//     o "analista" no se bloquean por contener otras palabras.

// ---------- Normas visibles en la página /normas ----------
export const NORMAS = [
  {
    id: 'autoritarios',
    titulo: 'Nada de dictadores ni figuras políticas',
    texto:
      'No uses el nombre de dictadores, figuras autoritarias ni políticos (actuales o históricos), ni apodos o combinaciones que hagan referencia a ellos.',
    ejemplos: ['Hitler88', 'Stalin_fan', 'ViVaFranco'],
  },
  {
    id: 'vulgar',
    titulo: 'Nada de contenido sexual o vulgar',
    texto: 'No se permiten nicks que hagan referencia a prácticas sexuales, pornografía, partes íntimas ni expresiones obscenas.',
    ejemplos: ['Sexo69', 'P0rnStar', 'xxx_boy'],
  },
  {
    id: 'discriminacion',
    titulo: 'Nada de racismo, xenofobia ni discriminación',
    texto:
      'Están prohibidos los nicks racistas, xenófobos, homófobos o que ataquen a cualquier persona o colectivo por su origen, etnia, religión, género u orientación.',
    ejemplos: ['Sudaca_out', '1488', 'WhitePower'],
  },
  {
    id: 'ideologia',
    titulo: 'Nada de ideologías políticas ni extremismo',
    texto:
      'El nick no puede hacer referencia a ideologías o partidos políticos, ni a grupos extremistas o terroristas. Aquí venimos a estudiar.',
    ejemplos: ['Comunista_99', 'NaziBoy', 'Falangista'],
  },
  {
    id: 'insultos',
    titulo: 'Nada de insultos',
    texto: 'No uses insultos ni expresiones ofensivas, aunque sea en broma.',
    ejemplos: ['Gilipollas', 'Subnormal'],
  },
  {
    id: 'suplantacion',
    titulo: 'No te hagas pasar por el equipo',
    texto: 'No uses nicks que imiten a administradores, moderadores o al propio ExamenDev.',
    ejemplos: ['Admin', 'Moderador_Oficial', 'ExamenDev_Soporte'],
  },
];

const MENSAJES = {
  autoritarios: 'Ese nick hace referencia a un dictador o figura política y no está permitido.',
  vulgar: 'Ese nick contiene contenido sexual o vulgar y no está permitido.',
  discriminacion: 'Ese nick contiene términos racistas, xenófobos o discriminatorios y no está permitido.',
  ideologia: 'Ese nick hace referencia a una ideología política o extremista y no está permitido.',
  insultos: 'Ese nick contiene insultos y no está permitido.',
  suplantacion: 'Ese nick suplanta al equipo de ExamenDev y no está permitido.',
};

// ---------- Listas de términos ----------
const TERMINOS = {
  autoritarios: {
    subcadena: [
      'hitler', 'mussolini', 'pinochet', 'ceausescu', 'polpot', 'kimjong', 'kimilsung', 'maozedong', 'maotsetung',
      'gadafi', 'gaddafi', 'sadamhusein', 'saddamhussein', 'idiamin', 'franquis', 'vivafranco', 'stalinis',
      'puigdemont', 'netanyahu', 'bolsonaro', 'lukashenko', 'zelensky', 'khamenei', 'jomeini', 'fidelcastro',
      'pedrosanchez', 'pabloiglesias', 'santiagoabascal', 'abascal', 'feijoo', 'erdogan', 'mussolin',
    ],
    palabra: [
      'franco', 'stalin', 'lenin', 'mao', 'putin', 'trump', 'biden', 'obama', 'castro', 'chavez', 'maduro', 'videla',
      'somoza', 'trujillo', 'batista', 'rajoy', 'aznar', 'zapatero', 'ayuso', 'milei', 'duce', 'fuhrer', 'fuehrer',
      'caudillo', 'dictador', 'tirano',
    ],
  },
  vulgar: {
    subcadena: [
      'sexo', 'porno', 'porn', 'follar', 'follame', 'chupamela', 'mamada', 'pajillero', 'pajero', 'putita', 'putero',
      'tetona', 'vagina', 'pussy', 'fuck', 'milf', 'hentai', 'onlyfans', 'violador', 'violacion', 'pedofil',
      'pederast', 'incesto', 'furcia', 'ramera', 'prostitut', 'bdsm', 'dildo', 'consolador', 'xvideos', 'pornhub',
      'cachonda', 'cachondo', 'orgasm', 'masturba', 'eyacula', 'penetra', 'chupapolla', 'comepolla', 'hijoputa',
    ],
    palabra: [
      'sex', 'sexy', 'puta', 'putas', 'puto', 'putos', 'polla', 'pollas', 'pene', 'penes', 'cono', 'zorra', 'zorras',
      'folla', 'paja', 'pajas', 'corrida', 'orgia', 'anal', 'culo', 'culos', 'teta', 'tetas', 'verga', 'chocho',
      'dick', 'cock', 'horny', 'nudes', 'guarra', 'guarro', 'xxx', 'boobs', 'tits', 'nabo', 'rabo', 'chichi',
    ],
  },
  discriminacion: {
    subcadena: [
      'nigga', 'nigger', 'sudaca', 'negrata', 'moraco', 'moromierda', 'kukluxklan', 'whitepower', 'supremacis',
      'razaaria', 'racista', 'xenofob', 'fueramoros', 'fueranegros', 'fuerasudacas', 'fuerainmigrantes',
      'matanegros', 'wetback', 'holocaust', 'antisemit', 'judiosfuera', 'maricon', 'bollera', 'travelo',
      'sidoso', 'panchito', 'gitanomierda', 'homofob', 'transfob', 'faggot',
    ],
    palabra: ['niger', 'niga', 'chink', 'spic', 'beaner', 'paki', 'kkk', 'nazis', 'gypsy', 'mariquita'],
  },
  ideologia: {
    subcadena: [
      'nazi', 'fascis', 'comunis', 'falang', 'anarquis', 'marxis', 'leninis', 'maois', 'socialis', 'capitalis',
      'sovietic', 'bolchevi', 'etarra', 'abertzale', 'independentis', 'separatis', 'aribaespana', 'caraalsol',
      'siegheil', 'heilhitler', 'antifa', 'yihad', 'jihad', 'taliban', 'alqaeda', 'terroris', 'psoe', 'bildu',
      'podemita', 'peperos', 'franquista', 'republicanis', 'monarquis', 'izquierdis', 'derechis', 'ultraderech',
      'ultraizquierd', 'neonazi', 'hamas', 'hezbol',
    ],
    palabra: [
      'facha', 'fachas', 'perroflauta', 'vox', 'podemos', 'isis', 'liberal', 'conservador',
      'comunista', 'socialista', 'ppsoe', 'urss', 'ussr', 'reich', 'eta',
    ],
  },
  insultos: {
    subcadena: [
      'gilipolla', 'subnormal', 'imbecil', 'hijodeputa', 'malparido', 'mierda', 'capullo', 'soplapolla',
      'retrasad', 'mongolo', 'cabronazo', 'mamon', 'pringad',
    ],
    palabra: ['idiota', 'cabron', 'cabrona', 'estupido', 'estupida', 'tonto', 'tonta', 'imbecil', 'cretino', 'zoquete'],
  },
  suplantacion: {
    subcadena: ['examendev', 'administrador', 'moderador', 'soporteoficial', 'equipooficial'],
    palabra: ['admin', 'administrator', 'root', 'mod', 'moderator', 'staff', 'soporte', 'support', 'oficial', 'official', 'sistema', 'system'],
  },
};

// Patrones sobre el nick tal cual (antes de normalizar), para números o siglas.
const PATRONES = [
  { re: /1488|14w0rds|14words/i, categoria: 'discriminacion' },
  { re: /k{3}/i, categoria: 'discriminacion' },
  { re: /cccp/i, categoria: 'ideologia' },
  { re: /x{3}/i, categoria: 'vulgar' },
];

// Palabras legítimas que contienen alguna "subcadena" prohibida.
const LISTA_BLANCA = ['ignazio', 'antiterroris', 'bahamas'];

// ---------- Normalización ----------
const LEET_I = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', 9: 'g', '@': 'a', $: 's', '!': 'i' };
const LEET_L = { ...LEET_I, 1: 'l' };

function base(texto) {
  return String(texto).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ñ/g, 'n');
}

function limpiar(texto, leet) {
  return texto
    .replace(/[0-9@$!]/g, (c) => leet[c] ?? '')
    .replace(/[^a-z]/g, '')
    .replace(/(.)\1+/g, '$1');
}

// Varias lecturas posibles de un mismo texto (leet con 1=i, 1=l, sin números, sin números en los bordes).
function variantes(texto) {
  const b = base(texto);
  const sinBordes = b.replace(/^[0-9]+|[0-9]+$/g, '');
  return [...new Set([limpiar(b, LEET_I), limpiar(b, LEET_L), limpiar(b, {}), limpiar(sinBordes, LEET_I), limpiar(sinBordes, LEET_L)])].filter(Boolean);
}

// Separa en palabras por _ . - espacios y por MayúsculaInicial (PutaMadre → Puta, Madre).
function palabras(nick) {
  return String(nick)
    .replace(/([a-zà-ÿ0-9])([A-ZÀ-Ý])/g, '$1 $2')
    .split(/[\s_.\-]+/)
    .filter(Boolean);
}

const norm = (t) => limpiar(base(t), LEET_I);
const BLANCA = LISTA_BLANCA.map(norm);
const LISTAS = Object.entries(TERMINOS).map(([categoria, { subcadena, palabra }]) => ({
  categoria,
  subcadena: subcadena.map(norm).filter(Boolean),
  palabra: new Set(palabra.map(norm).filter(Boolean)),
}));

/**
 * Comprueba si un nick cumple la política de uso.
 * @returns {null | { categoria: string, mensaje: string }} null si es válido.
 */
export function comprobarNick(nick) {
  if (!nick) return null;
  const crudo = String(nick);

  const patron = PATRONES.find((p) => p.re.test(crudo));
  if (patron) return { categoria: patron.categoria, mensaje: MENSAJES[patron.categoria] };

  const completas = variantes(crudo).map((v) => BLANCA.reduce((acc, w) => acc.split(w).join('·'), v));
  const tokens = [...palabras(crudo).flatMap(variantes), ...variantes(crudo)];

  for (const { categoria, subcadena, palabra } of LISTAS) {
    const porSubcadena = completas.some((v) => subcadena.some((t) => v.includes(t)));
    const porPalabra = tokens.some((t) => palabra.has(t));
    if (porSubcadena || porPalabra) return { categoria, mensaje: MENSAJES[categoria] };
  }
  return null;
}
