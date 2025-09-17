<p align="center">
  <img src="https://lukalibre.org/assets/images/lukalibre.png" alt="LukaLibre logo" width="160"/>
</p>

<p align="center">
  <a href="https://github.com/raestrada/lukalibre/actions/workflows/frontend-ci.yml">
    <img src="https://github.com/raestrada/lukalibre/actions/workflows/frontend-ci.yml/badge.svg" alt="Frontend CI">
  </a>
  <a href="https://github.com/raestrada/lukalibre/actions/workflows/backend-ci.yml">
    <img src="https://github.com/raestrada/lukalibre/actions/workflows/backend-ci.yml/badge.svg" alt="Backend CI">
  </a>
  <a href="https://github.com/raestrada/lukalibre/actions/workflows/semgrep.yml">
    <img src="https://github.com/raestrada/lukalibre/actions/workflows/semgrep.yml/badge.svg" alt="Semgrep Analysis">
  </a>
</p>

# 💸 LukaLibre

**LukaLibre** es una plataforma abierta que busca ayudar a las personas en Chile a **mejorar su situación financiera de forma realista y sin humo**.

📌 No prometemos hacerte rico.
📌 No te vamos a vender cursos ni señales mágicas.
📌 No estamos asociados a bancos, AFPs, apps ni gurús.

Solo compartimos herramientas, información clara y conocimiento real para que puedas **tomar decisiones con calma, entender tu plata y sobrevivir sin ansiedad**.

---

## 🔎 Zero-Knowledge by Design

<img src="https://lukalibre.org/assets/images/zk_badge.png" alt="Zero-Knowledge by design" style="width: 25%; height: 25%;">

LukaLibre está construido con privacidad total desde el diseño:

- Los datos financieros se almacenan exclusivamente en una **base de datos SQLite en el navegador** usando SQL.js
- Toda la información se guarda cifrada en localStorage y solo se procesa localmente
- El backend actúa como proxy para servicios de IA via OpenRouter, sin almacenar datos sensibles
- La sincronización con Google Drive es opcional y mantiene los datos cifrados
- Opcionalmente puedes usar tu propia llave de OpenAI o OpenRouter directamente en el navegador sin pasar por el proxy

Este enfoque garantiza que tú seas el único dueño de tu información financiera, con total transparencia y control.

---

## 🗺️ Roadmaps del Proyecto

<div align="center">
  <table>
    <tr>
      <td align="center">
        <a href="design/technical_roadmap.md">
          <img src="https://res.cloudinary.com/dyknhuvxt/image/upload/v1745078634/technical-roadmap_vjuiby.png" alt="Technical Roadmap" width="64" height="64"><br>
          <strong>Roadmap Técnico</strong>
        </a><br>
        Plan detallado de implementación<br>con arquitectura y fases de desarrollo
      </td>
      <td align="center">
        <a href="branding/roadmap.md">
          <img src="https://res.cloudinary.com/dyknhuvxt/image/upload/v1745078655/branding-roadmap_w79iio.png" alt="Branding Roadmap" width="64" height="64"><br>
          <strong>Roadmap de Impacto Social</strong>
        </a><br>
        Visión, metas y estrategia<br>para el impacto social del proyecto
      </td>
    </tr>
  </table>
</div>

Conoce a dónde vamos y cómo planeamos llegar. Nuestros roadmaps detallan tanto los aspectos técnicos como el impacto social que buscamos generar con LukaLibre.

---

## 🌐 Sitio web

- 🔗 Página principal: [https://lukalibre.org/](https://lukalibre.org/)
- 📚 Centro de conocimiento: [https://lukalibre.org/docs](https://lukalibre.org/docs)

---

## 📦 ¿Qué contiene este repositorio?

```
lukalibre/
├── index.html                  # Landing page moderna y directa
├── about.html                  # Sobre el proyecto y su propósito
├── contribuir.html             # Cómo participar en la comunidad
├── /docs/                      # Centro de conocimiento estático (Just the Docs)
│   ├── index.md
│   ├── conceptos/
│   │   ├── finanzas-basicas/
│   │   ├── ahorro/
│   │   ├── deuda/
│   │   ├── derechos/
│   │   ├── afp-apv/
│   │   ├── bancos/
│   │   ├── estafas/
│   │   ├── fomo/
│   │   └── trading-magico/
├── /design/                    # Documentación técnica y de diseño
│   ├── technical_roadmap.md    # Plan técnico de implementación
│   └── luka_app_spec.md        # Especificaciones de la aplicación
├── /branding/                  # Materiales de marca e identidad
│   └── roadmap.md              # Roadmap de impacto social
└── /assets/                    # Imágenes, logos, íconos y estilos
```

Todo el contenido está escrito en español chileno, con un lenguaje directo y cercano.

---

## 🎯 Objetivo del proyecto

- Combatir la desinformación financiera en redes sociales y medios
- Romper con el mito de la libertad financiera express
- Proteger a personas vulnerables del FOMO y las estafas
- Promover el acceso gratuito a herramientas de educación financiera útil y sin letra chica

---

## 🤝 ¿Cómo contribuir?

1. Revisa los documentos en `/docs/conceptos/` o el código en `/frontend` y `/backend`
2. Haz un fork del repo
3. Realiza tus cambios siguiendo nuestros estándares de código
4. Ejecuta las herramientas de calidad de código (pre-commit, CI)
5. Abre un Pull Request con una descripción clara

También puedes:

- Reportar errores o sugerencias en [Issues](https://github.com/raestrada/lukalibre/issues)
- Compartir tu historia en [https://lukalibre.org/contribuir](https://lukalibre.org/contribuir)
- Contribuir a las discusiones técnicas en los issues existentes

---

## ⚖️ Licencia

Este proyecto está bajo licencia **MIT** para el código y **Creative Commons Attribution-NonCommercial 4.0** para los contenidos educativos.
y **Creative Commons Attribution-NonCommercial 4.0** para los contenidos.

Esto significa que puedes compartir, adaptar y remezclar...
pero **no puedes revender, monetizar ni usar con fines comerciales** sin permiso.

---

## 💬 ¿Por qué "LukaLibre"?

Porque en Chile una "luka" es una forma cotidiana de decir "mil pesos".
Y porque creemos que **entender tu plata debería ser gratis, libre y sin humo**.

---

📬 Si quieres colaborar, traducir, compartir tu historia o simplemente decir "hola":
escríbenos en [https://github.com/raestrada/lukalibre](https://github.com/raestrada/lukalibre)

## 💻 Arquitectura del Proyecto

LukaLibre consta de dos componentes principales:

### Frontend (Svelte + TypeScript + SQL.js)

- **Tecnologías**: Svelte 5, TypeScript, Vite, SQL.js
- **Características**: Base de datos SQLite en el navegador, persistencia en localStorage, Dashboard interactivo
- **Calidad**: ESLint, Prettier, TypeScript, GitHub Actions CI/CD

```bash
# Instalar y ejecutar el frontend
cd frontend
npm install
npm run dev
```

### Backend (FastAPI + PostgreSQL + OpenRouter)

- **Tecnologías**: FastAPI, SQLAlchemy, PostgreSQL, Poetry, LangChain
- **LLM Integration**: OpenRouter como proveedor exclusivo para acceso cost-optimizado a múltiples modelos IA
- **Modelos Especializados**:
  - `qwen/qwen3-coder` para análisis de texto y generación de código/SQL
  - `google/gemini-2.5-flash` para procesamiento de imágenes con capacidades de visión
- **Funciones**: API RESTful, autenticación OAuth, proxy inteligente para LLMs
- **Calidad**: Black, Flake8, Bandit, mypy, pre-commit hooks

```bash
# Configurar PostgreSQL con Docker
docker-compose up -d

# Instalar y ejecutar el backend
cd backend
poetry install
cp .env.example .env  # Configurar OPENROUTER_API_KEY
poetry run alembic upgrade head
poetry run python -m app.initial_data
poetry run uvicorn app.main:app --reload
```

#### Configuración de OpenRouter

El backend requiere configuración de OpenRouter para funcionalidad de IA:

```bash
# Configurar en .env
OPENROUTER_API_KEY=tu_api_key_de_openrouter
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
TEXT_MODEL=qwen/qwen3-coder
IMAGE_MODEL=google/gemini-2.5-flash
```

Obtén tu API key en [openrouter.ai](https://openrouter.ai/)

### Integración y Seguridad

- **CI/CD**: Pipelines automatizados para Frontend, Backend y análisis SAST con Semgrep
- **Seguridad**: Análisis estático de código, pruebas de seguridad, escaneo de vulnerabilidades
- **Zero-Knowledge**: Arquitectura que garantiza que los datos sensibles nunca salen del navegador del usuario

Para más detalles, consulta los README específicos en `/frontend` y `/backend`.

## ⚖️ Licencia

Este proyecto está bajo licencia **MIT** para el código y **Creative Commons Attribution-NonCommercial 4.0** para los contenidos educativos.

No se permite el uso comercial sin permiso específico.
