# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LukaLibre is a Chilean financial education platform built with a Zero-Knowledge architecture. It consists of:

### Frontend (Svelte + TypeScript)
- **Technology**: Svelte 5, TypeScript, Vite, SQL.js
- **Key Feature**: Zero-Knowledge by design - all user data stays in the browser
- **Database**: SQLite in-browser using SQL.js with localStorage persistence
- **Location**: `/frontend/`

### Backend (FastAPI + Python)
- **Technology**: FastAPI, SQLAlchemy, PostgreSQL, Poetry
- **Purpose**: API endpoints, authentication, LLM proxy services
- **Location**: `/backend/`

### Documentation Site (Jekyll)
- **Technology**: Just the Docs theme
- **Content**: Financial education content in Chilean Spanish
- **Location**: `/docs/`

## Development Commands

### Global Commands (using Task)
Use these from the project root:

```bash
# Install all dependencies
task install

# Run both frontend and backend in parallel
task dev

# Run tests for both components
task test

# Backend only
task run-backend      # Starts PostgreSQL + uvicorn
task test-backend     # Runs pytest
task install-backend  # Poetry install

# Frontend only
task run-frontend     # npm run dev
task test-frontend    # npm run test
task build-frontend   # npm run build
task install-frontend # npm install
```

### Frontend Commands
Run from `/frontend/` directory:

```bash
npm run dev           # Development server
npm run build         # Production build
npm run preview       # Preview build
npm run check         # TypeScript + Svelte checks
npm run format-all    # Format with prettier, eslint, stylelint
```

### Backend Commands
Run from `/backend/` directory:

```bash
# Development
poetry run uvicorn app.main:app --reload

# Database migrations
poetry run alembic upgrade head
poetry run alembic revision --autogenerate -m "description"

# Initial data setup
poetry run python -m app.initial_data

# Code quality
poetry run black .
poetry run pre-commit run --all-files

# Tests
poetry run pytest
poetry run pytest --cov=app --cov-report=html
```

### Database Setup
PostgreSQL via Docker Compose:
```bash
docker-compose up -d    # Start database
docker-compose stop     # Stop database
```

## Architecture Overview

### Zero-Knowledge Design
- User financial data never leaves their browser
- SQLite database runs locally using SQL.js
- Data encrypted and stored in localStorage
- Backend acts only as proxy for LLM services
- Optional encrypted Google Drive sync

### Key Components

**Frontend Architecture:**
- `src/services/sqliteService.ts` - Local database management
- `src/services/llmService.ts` - AI model integration
- `src/stores/` - Global state management
- `src/components/` - Svelte components by feature
- Local SQLite database with financial schemas

**Backend Architecture:**
- `app/api/v1/endpoints/` - REST API endpoints
- `app/models/` - SQLAlchemy models
- `app/schemas/` - Pydantic schemas
- `app/crud/` - Database operations
- `app/static_schemas/` - JSON schemas for financial data types

### Financial Data Models
The backend defines JSON schemas for Chilean financial contexts:
- Income: `sueldo`, `honorarios`, `arriendo`, `dividendos`
- Expenses: `gasto_alimentacion`, `gasto_salud`, `gasto_arriendo_dividendo`
- Debts: `prestamo_personal`, `gasto_deuda_credito`

## Code Quality Standards

### Frontend Quality Tools
- **ESLint**: Code analysis with security plugin
- **Prettier**: Code formatting
- **Stylelint**: CSS/SCSS linting
- **TypeScript**: Type checking
- **Husky + lint-staged**: Pre-commit hooks

### Backend Quality Tools
- **Black**: Code formatting
- **Flake8**: Linting
- **Bandit**: Security analysis
- **mypy**: Type checking
- **Pre-commit**: Automated verification

### Pre-commit Hooks
Configured via `.husky/pre-commit`:
- Frontend: TypeScript check, lint-staged, npm audit
- Backend: Black, Flake8, Bandit, mypy via pre-commit

## Development Notes

### Language and Content
- All user-facing content is in Chilean Spanish
- Financial concepts are localized to Chile (AFP, IVA, etc.)
- Tone is direct, accessible, and anti-FOMO

### Security Considerations
- No sensitive data should ever be logged or committed
- Backend proxies LLM requests without storing user data
- Google OAuth integration for optional sync
- Rate limiting on API endpoints
- Semgrep analysis via GitHub Actions

### Testing
- Frontend: Component and integration tests
- Backend: pytest with SQLAlchemy fixtures
- CI/CD: Separate workflows for frontend and backend
- Security: Automated SAST with Semgrep

## API Documentation
When backend is running:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc