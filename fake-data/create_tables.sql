-- Script para crear las tablas de LukaLibre

CREATE TABLE categorias (
  id TEXT PRIMARY KEY,
  tipo TEXT,
  nombre TEXT NOT NULL,
  sub_tipo TEXT,
  descripcion TEXT,
  clasificacion_tributaria TEXT,
  afecta_impuestos BOOLEAN DEFAULT false,
  codigo_sii TEXT,
  tags TEXT
);

CREATE TABLE gastos (
  id TEXT PRIMARY KEY,
  categoria_id TEXT REFERENCES categorias(id),
  monto REAL,
  fecha TEXT,
  fuente TEXT,
  descripcion TEXT,
  detalle TEXT
);

CREATE TABLE ingresos (
  id TEXT PRIMARY KEY,
  categoria_id TEXT REFERENCES categorias(id),
  monto REAL,
  fecha TEXT,
  descripcion TEXT,
  fuente TEXT,
  detalle TEXT
);

CREATE TABLE metas (
  id TEXT PRIMARY KEY,
  nombre TEXT,
  descripcion TEXT,
  objetivo_monto REAL,
  fecha_objetivo TEXT,
  prioridad INTEGER,
  tipo TEXT,
  activa BOOLEAN DEFAULT true
);

CREATE TABLE movimientos_ahorro (
  id TEXT PRIMARY KEY,
  monto REAL,
  fecha TEXT,
  origen TEXT,
  destino TEXT,
  meta_id TEXT REFERENCES metas(id),
  comentario TEXT,
  detalle TEXT
);

CREATE TABLE recomendaciones (
  id TEXT PRIMARY KEY,
  tipo TEXT,
  mensaje TEXT,
  fecha TEXT
);

CREATE TABLE resumen_mensual (
  mes TEXT PRIMARY KEY,
  total_gastos REAL,
  total_ingresos REAL,
  total_ahorro REAL,
  ahorro_neto REAL,
  categorias TEXT
);

CREATE TABLE metadata (
  clave TEXT PRIMARY KEY,
  valor TEXT
);
