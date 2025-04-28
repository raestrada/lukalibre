# LukaLibre ZK App – Especificación Técnica (WebAssembly + SQLite + Go)

"""
Aplicación financiera web descentralizada, enfocada en privacidad total.
Toda la lógica, almacenamiento y procesamiento ocurre localmente en el navegador del usuario.
El servidor solo cumple funciones de autenticación, configuración, distribución de claves, prompts y orquestación de llamadas a LLM.
"""

---

## 🌐 Tecnologías clave

### Frontend (en el navegador)
### Frontend (en el navegador)
- **Svelte + Vite (PWA)**
- **SQLite en el navegador** (wa-sqlite con **SQLite Encryption Extension - SEE**)
- **Web Crypto API** (clave de apertura de la base cifrada)
- **Groq API** (invocada a través de un proxy seguro)
- **Google Drive API** (para respaldos automáticos desde el navegador)

### Backend (FastAPI + PostgreSQL)
- Framework: **FastAPI** (con estructura de 3 capas: repositorios, servicios, rutas)
- Base de datos: **PostgreSQL** para:
  - Configuraciones globales
  - Plantillas de prompts
  - Perfiles de usuario (OAuth)
  - Auditoría y control de versiones
- Logging enriquecido con **Rich**
- Dependencias gestionadas con **Poetry**
- Endpoints:
  - `GET /prompts`
  - `GET /config`
  - `POST /llm-proxy` (invoca Groq sin guardar datos)
  - `POST /log` (logs anónimos, opcional)

---

## 🔁 Flujo general

1. Usuario inicia sesión con OAuth (Google obligatorio para sincronización Drive) → backend devuelve `sub`
2. Usuario ingresa `userSecret` (clave secundaria)
3. En el navegador se deriva `clave_maestra = PBKDF2(sub + userSecret)`
4. Esta clave se usa para abrir la base de datos SEE SQLite cifrada
5. Usuario sube un archivo (PDF, imagen, texto, Excel)
6. El archivo se convierte en texto localmente
7. Se arma el prompt con una plantilla obtenida del backend
8. Se envía el prompt al backend via `POST /llm-proxy` → backend lo reenvía a **Groq** (no guarda nada)
9. El resultado se guarda directamente en **SQLite cifrada (SEE)**
10. Se actualizan las tablas **pre-agregadas** para mantener vistas eficientes
11. El archivo `.wallet` cifrado se sincroniza automáticamente con **Google Drive** (desde el navegador), en segundo plano y de forma opcional
12. Al abrir la app en otro dispositivo con la misma cuenta de Google y `userSecret`, la base se restaura automáticamente

---

## 📦 Almacenamiento local (SQLite SEE cifrada + agregaciones precalculadas)

```sql
CREATE TABLE categorias (
  id TEXT PRIMARY KEY,
  tipo TEXT CHECK (tipo IN ('ingreso', 'gasto', 'ahorro')),
  nombre TEXT NOT NULL,
  sub_tipo TEXT,
  descripcion TEXT,
  clasificacion_tributaria TEXT,
  afecta_impuestos BOOLEAN DEFAULT false,
  codigo_sii TEXT,
  tags TEXT -- JSON array string
);

CREATE TABLE gastos (
  id TEXT PRIMARY KEY,
  categoria_id TEXT REFERENCES categorias(id),
  monto REAL,
  fecha TEXT,
  fuente TEXT,
  descripcion TEXT,
  detalle JSON -- Detalle específico según tipo de gasto (arriendo, salud, etc.)
);

CREATE TABLE ingresos (
  id TEXT PRIMARY KEY,
  categoria_id TEXT REFERENCES categorias(id),
  monto REAL,
  fecha TEXT,
  descripcion TEXT,
  fuente TEXT,
  detalle JSON -- Información específica del tipo de ingreso (ej: sueldo, préstamo, dividendo)
);

CREATE TABLE movimientos_ahorro (
  id TEXT PRIMARY KEY,
  monto REAL,
  fecha TEXT,
  origen TEXT,
  destino TEXT,
  meta_id TEXT REFERENCES metas(id),
  comentario TEXT,
  detalle JSON -- Información adicional (ej: tipo transferencia, automático o manual, etc.)
);

CREATE TABLE metas (
  id TEXT PRIMARY KEY,
  nombre TEXT,
  descripcion TEXT,
  objetivo_monto REAL,
  fecha_objetivo TEXT,
  prioridad INTEGER,
  tipo TEXT CHECK (tipo IN ('emergencia', 'viaje', 'vivienda', 'educacion', 'jubilacion', 'otro')),
  activa BOOLEAN DEFAULT true
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
  categorias TEXT -- JSON string con desglose
);

CREATE TABLE metadata (
  clave TEXT PRIMARY KEY,
  valor TEXT
);
```

### Backup / Portabilidad
- Exportable como `.lukalibre.wallet` (base SQLite SEE cifrada)
- Restauración automática desde Google Drive si el usuario está autenticado con Google
- Alternativamente, puede cargarse manualmente

---

## 🔐 Seguridad

| Riesgo                           | Mitigación                                                   |
|----------------------------------|---------------------------------------------------------------|
| Acceso al backend o DB           | No se almacenan datos personales                             |
| Pérdida de userSecret            | Backup cifrado con frase de recuperación                     |
| Robo del archivo `.wallet`       | Está cifrado con SEE y clave derivada                        |
| XSS / claves en memoria          | CSP, uso de `CryptoKey`, claves no expuestas en DOM          |
| Fugas vía LLM                    | Backend actúa como proxy efímero, sin logs ni persistencia   |
| Acceso a Google Drive            | Limitado solo al archivo `.lukalibre.wallet`, y cifrado end-to-end |

---

## 📁 Estructura del proyecto

```
/lukalibre
├── frontend/              # App WebAssembly en Go
│   ├── crypto/            # Derivación de clave y acceso SEE
│   ├── db/                # Conexión, modelos y agregaciones SQLite
│   ├── llm/               # Armar prompts, interactuar con proxy
│   ├── views/             # Interfaz gráfica PWA
│   ├── backup/            # Módulo de integración con Google Drive
│   └── utils/
├── backend/               # Go HTTP API + PostgreSQL
│   ├── main.go
│   ├── routes/
│   ├── handlers/
│   ├── oauth/
│   ├── prompts/
│   ├── config/
│   └── db/
└── docs/                  # Documentación técnica y usuario
```

---

## 🧠 Funcionalidades esperadas
- Subida y procesamiento de documentos desde móvil o escritorio
- Extracción de gastos, ingresos, sueldos y categorías
- Vista mensual de finanzas cifrada localmente
- Recomendaciones generadas por LLM
- Agregación y resumen en tiempo real dentro del cliente
- Gestión de metas de ahorro y seguimiento de avances
- Backup automático en Google Drive desde el navegador
- Restauración sin fricción desde cualquier dispositivo Google
- Interacción vía WebAssembly para máximo rendimiento

---

## 🚧 Próximos pasos
1. Migrar backend a Go (auth, proxy LLM, templates, config)
2. Generar estructura del frontend en Go para WebAssembly
3. Integrar SQLite SEE + clave derivada del usuario
4. Implementar módulo de backup/restore local + Google Drive
5. Implementar proxy seguro para Groq (sin logs, sin BD)
6. Conectar PostgreSQL para configuración y administración
7. Diseñar flujos UI/UX con foco en privacidad y eficiencia
8. Agregar módulo de agregación y resumen precalculado por mes y categoría
9. Añadir interfaz para metas de ahorro, aportes y seguimiento

---

## Repositorio: https://github.com/raestrada/lukalibre
## Sitio Web: https://lukalibre.org
