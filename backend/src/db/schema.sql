-- =====================================================================
-- ESQUEMA POSTGRESQL PARA EXAMENDEV
-- Ciclos (DAM, DAW, ASIR, SMR), Módulos (1º y 2º), Certificaciones,
-- Temas, Preguntas, Opciones, Usuarios, Partidas, Respuestas y Ranking
-- =====================================================================

-- 1. TABLA DE CICLOS (GRADOS)
CREATE TABLE IF NOT EXISTS ciclos (
    id VARCHAR(10) PRIMARY KEY,
    sigla VARCHAR(10) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    grado VARCHAR(30) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

-- 2. TABLA DE MÓDULOS (ASIGNATURAS)
CREATE TABLE IF NOT EXISTS modulos (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    hoja_ruta_md TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE modulos ALTER COLUMN nombre TYPE VARCHAR(255);
ALTER TABLE modulos ADD COLUMN IF NOT EXISTS hoja_ruta_md TEXT;

-- 3. TABLA PUENTE CICLO_MODULO (1º y 2º CURSO)
CREATE TABLE IF NOT EXISTS ciclo_modulo (
    ciclo_id VARCHAR(10) NOT NULL REFERENCES ciclos(id) ON DELETE CASCADE,
    modulo_id VARCHAR(50) NOT NULL REFERENCES modulos(id) ON DELETE CASCADE,
    curso SMALLINT NOT NULL CHECK (curso IN (1, 2)),
    PRIMARY KEY (ciclo_id, modulo_id)
);

-- 4. TABLA DE CERTIFICACIONES (MICROSOFT, CISCO, AWS...)
CREATE TABLE IF NOT EXISTS certificaciones (
    id VARCHAR(30) PRIMARY KEY,
    codigo_examen VARCHAR(20) NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    proveedor VARCHAR(50) NOT NULL,
    nivel VARCHAR(30) DEFAULT 'Fundamentals',
    tiempo_minutos INT DEFAULT 45,
    nota_aprobado INT DEFAULT 700,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT FALSE
);

-- 5. TABLA DE TEMAS (DE MÓDULOS O DE CERTIFICACIONES)
CREATE TABLE IF NOT EXISTS temas (
    id SERIAL PRIMARY KEY,
    modulo_id VARCHAR(50) REFERENCES modulos(id) ON DELETE CASCADE,
    certificacion_id VARCHAR(30) REFERENCES certificaciones(id) ON DELETE CASCADE,
    orden SMALLINT NOT NULL DEFAULT 1,
    nombre VARCHAR(255) NOT NULL,
    CHECK (
        (modulo_id IS NOT NULL AND certificacion_id IS NULL) OR
        (modulo_id IS NULL AND certificacion_id IS NOT NULL)
    )
);

ALTER TABLE temas ALTER COLUMN nombre TYPE VARCHAR(255);

-- 6. TABLA DE PREGUNTAS
CREATE TABLE IF NOT EXISTS preguntas (
    id VARCHAR(60) PRIMARY KEY,
    modulo_id VARCHAR(50) REFERENCES modulos(id) ON DELETE CASCADE,
    certificacion_id VARCHAR(30) REFERENCES certificaciones(id) ON DELETE CASCADE,
    tema_id INT NOT NULL REFERENCES temas(id) ON DELETE CASCADE,
    enunciado TEXT NOT NULL,
    codigo TEXT,
    explicacion TEXT,
    dificultad VARCHAR(15) DEFAULT 'media' CHECK (dificultad IN ('facil', 'media', 'dificil')),
    activa BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE preguntas ADD COLUMN IF NOT EXISTS codigo TEXT;

-- 7. TABLA DE OPCIONES (LA RESPUESTA CORRECTA NUNCA VIAJA AL NAVEGADOR)
CREATE TABLE IF NOT EXISTS opciones (
    id SERIAL PRIMARY KEY,
    pregunta_id VARCHAR(60) NOT NULL REFERENCES preguntas(id) ON DELETE CASCADE,
    texto TEXT NOT NULL,
    es_correcta BOOLEAN NOT NULL DEFAULT FALSE
);

-- 8. TABLA DE USUARIOS
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nick VARCHAR(30) NOT NULL UNIQUE,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(255),
    ciclo_actual_id VARCHAR(10) REFERENCES ciclos(id) ON DELETE SET NULL,
    puntos_totales INT NOT NULL DEFAULT 0,
    racha_actual INT NOT NULL DEFAULT 0,
    mejor_racha INT NOT NULL DEFAULT 0,
    logros JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rol del usuario: 'usuario' (por defecto), 'editor' (gestiona preguntas/temas) o 'admin'.
-- La cuenta admin se crea/actualiza al arrancar con ADMIN_* del .env (ver db/admin.js).
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS rol VARCHAR(20) NOT NULL DEFAULT 'usuario';
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check CHECK (rol IN ('usuario', 'editor', 'admin'));

-- 9. TABLA DE PARTIDAS
CREATE TABLE IF NOT EXISTS partidas (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    modulo_id VARCHAR(50) REFERENCES modulos(id) ON DELETE CASCADE,
    certificacion_id VARCHAR(30) REFERENCES certificaciones(id) ON DELETE CASCADE,
    modo VARCHAR(20) NOT NULL CHECK (modo IN ('practica', 'simulacro', 'repaso', 'trivia')),
    aciertos INT NOT NULL DEFAULT 0,
    fallos INT NOT NULL DEFAULT 0,
    puntos_obtenidos INT NOT NULL DEFAULT 0,
    racha_max INT NOT NULL DEFAULT 0,
    tiempo_segundos INT DEFAULT 0,
    finalizada BOOLEAN NOT NULL DEFAULT FALSE,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE partidas ADD COLUMN IF NOT EXISTS racha_max INT NOT NULL DEFAULT 0;

-- 10. TABLA DE RESPUESTAS
CREATE TABLE IF NOT EXISTS respuestas (
    id SERIAL PRIMARY KEY,
    partida_id INT NOT NULL REFERENCES partidas(id) ON DELETE CASCADE,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    pregunta_id VARCHAR(60) NOT NULL REFERENCES preguntas(id) ON DELETE CASCADE,
    opcion_id INT REFERENCES opciones(id) ON DELETE SET NULL,
    es_correcta BOOLEAN NOT NULL,
    puntos_sumados INT NOT NULL DEFAULT 0,
    dominada BOOLEAN NOT NULL DEFAULT FALSE,
    respondida_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. TABLA DE RANKING
CREATE TABLE IF NOT EXISTS ranking (
    id SERIAL PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    modulo_id VARCHAR(50) REFERENCES modulos(id) ON DELETE CASCADE,
    certificacion_id VARCHAR(30) REFERENCES certificaciones(id) ON DELETE CASCADE,
    temporada VARCHAR(20) NOT NULL DEFAULT 'GLOBAL',
    puntos INT NOT NULL DEFAULT 0,
    partidas_jugadas INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
