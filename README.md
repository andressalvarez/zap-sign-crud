# 🚀 ZapSign CRUD - Sistema de Gestión de Documentos Electrónicos

[![Django](https://img.shields.io/badge/Django-4.2+-green.svg)](https://www.djangoproject.com/)
[![Angular](https://img.shields.io/badge/Angular-18+-red.svg)](https://angular.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-blue.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue.svg)](https://docs.docker.com/compose/)
[![ZapSign](https://img.shields.io/badge/ZapSign-API-orange.svg)](https://docs.zapsign.com.br/)

Sistema completo de gestión de documentos electrónicos con integración a **ZapSign API**, desarrollado con **Clean Architecture** y tecnologías modernas.

## 📋 Tabla de Contenidos

- [🎯 Características](#-características)
- [🏗️ Arquitectura](#️-arquitectura)
- [🚀 Instalación Rápida](#-instalación-rápida)
- [📖 Documentación API](#-documentación-api)
- [🧪 Testing](#-testing)
- [🔧 Desarrollo](#-desarrollo)
- [📝 API Endpoints](#-api-endpoints)

## 🎯 Características

### ✅ Funcionalidades Principales
- **CRUD Completo**: Crear, leer, actualizar y eliminar documentos
- **Integración ZapSign**: Envío automático a la API de ZapSign para firmas electrónicas
- **Gestión de Firmantes**: Múltiples firmantes por documento con estados individuales
- **Sincronización de Estados**: Actualización en tiempo real desde ZapSign
- **UI Moderna**: Interface responsive con Material Design

### 🏗️ Stack Tecnológico
- **Backend**: Django 4.2+ con Django REST Framework
- **Frontend**: Angular 18 con TypeScript y Material Design
- **Base de Datos**: PostgreSQL 16
- **Containerización**: Docker + Docker Compose
- **API Externa**: ZapSign Sandbox API
- **Documentación**: Swagger/OpenAPI

## 🏗️ Arquitectura

### Backend - Clean Architecture
```
backend/
├── core/                 # Configuración Django
├── zapsign/             # Aplicación principal
│   ├── models.py        # Domain Layer - Entidades
│   ├── services/        # Application Layer
│   │   ├── document_service.py
│   │   └── zapsign_service.py
│   ├── repositories/    # Infrastructure Layer
│   ├── serializers.py   # Interface Layer
│   ├── viewsets.py      # Interface Layer
│   └── admin.py         # Interface Layer
```

### Frontend - Feature Modules
```
frontend/src/app/
├── core/                # Servicios compartidos
│   ├── services/
│   └── models/
├── features/
│   ├── documents/       # Módulo de documentos
│   │   ├── components/
│   │   ├── services/
│   │   └── documents.module.ts
│   └── shared/          # Componentes reutilizables
```

## 🚀 Instalación Rápida

### Prerrequisitos
- **Docker Desktop** con WSL2 (≥ 4GB RAM)
- **Git**
- **Node.js** 20.x (opcional, para desarrollo frontend)
- **Python** 3.12+ (opcional, para desarrollo backend)

### 1. Clonar Repositorio
```bash
git clone https://github.com/andressalvarez/zap-sign-crud.git
cd zap-sign-crud
```

### 2. Configurar Variables de Entorno
```bash
# Backend - Crear archivo .env
cp backend/.env.example backend/.env

# Editar backend/.env con tu token de ZapSign
ZAPSIGN_API_TOKEN=tu-token-aqui
ZAPSIGN_ORG_ID=tu-org-id-aqui
```

### 3. Ejecutar con Docker Compose
```bash
# Levantar todos los servicios
docker compose up -d

# Ver logs (opcional)
docker compose logs -f
```

### 4. Acceder a la Aplicación
- **Frontend**: http://localhost:4200
- **Backend API**: http://localhost:8000/api/
- **Swagger Docs**: http://localhost:8000/api/docs/
- **Django Admin**: http://localhost:8000/admin/

## 📖 Documentación API

### Swagger UI
Accede a la documentación interactiva en: http://localhost:8000/api/docs/

### Endpoints Principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/documents/` | Lista todos los documentos |
| `POST` | `/api/documents/` | Crea documento + ZapSign |
| `GET` | `/api/documents/{id}/` | Detalles del documento |
| `PUT` | `/api/documents/{id}/` | Actualiza documento |
| `DELETE` | `/api/documents/{id}/` | Elimina documento |
| `POST` | `/api/documents/{id}/update_status/` | Sincroniza con ZapSign |

### Ejemplo de Creación de Documento
```json
POST /api/documents/
{
  "name": "Contrato de Servicios 2024",
  "pdf_url": "https://ejemplo.com/contrato.pdf",
  "company_id": 1,
  "created_by": "Juan Pérez",
  "signers": [
    {
      "name": "María García",
      "email": "maria@empresa.com"
    },
    {
      "name": "Carlos López", 
      "email": "carlos@empresa.com"
    }
  ]
}
```

## 🧪 Testing

### Backend Tests
```bash
# Ejecutar tests
cd backend
poetry run pytest

# Con coverage
poetry run pytest --cov=zapsign
```

### Frontend Tests
```bash
# Ejecutar tests
cd frontend
npm test

# Tests de producción
npm run test:prod
```

## 🔧 Desarrollo

### Configuración Backend
```bash
cd backend

# Instalar dependencias
poetry install

# Activar entorno virtual
poetry shell

# Migraciones
python manage.py migrate

# Crear superusuario
python manage.py createsuperuser

# Servidor de desarrollo
python manage.py runserver
```

### Configuración Frontend
```bash
cd frontend

# Instalar dependencias
npm install

# Servidor de desarrollo
npm start

# Build de producción
npm run build
```

### Pre-commit Hooks
```bash
# Instalar hooks
pre-commit install

# Ejecutar manualmente
pre-commit run --all-files
```

## 📝 Estructura de Base de Datos

### Modelo de Datos
```sql
-- Empresas
Company (id, name, created_at, last_updated_at, api_token)

-- Documentos
Document (id, open_id, token, name, status, created_at, 
         last_updated_at, created_by, company_id, external_id)

-- Firmantes
Signer (id, token, status, name, email, external_id, document_id)
```

### Estados de Documento
- `PENDING_API`: Pendiente de envío a ZapSign
- `PENDING`: Enviado a ZapSign, esperando firmas
- `COMPLETED`: Todas las firmas completadas
- `CANCELLED`: Documento cancelado
- `API_ERROR`: Error en la integración con ZapSign

## 🔐 Configuración ZapSign

### Obtener Credenciales
1. Registrarse en [ZapSign Sandbox](https://sandbox.app.zapsign.com.br/)
2. Obtener `API Token` y `Organization ID`
3. Configurar en `backend/.env`

### Variables de Entorno
```env
ZAPSIGN_BASE_URL=https://sandbox.api.zapsign.com.br/api/v1
ZAPSIGN_ORG_ID=tu-organization-id
ZAPSIGN_API_TOKEN=tu-api-token
```

## 📋 Comandos Útiles

### Docker
```bash
# Reiniciar servicios
docker compose restart

# Ver logs específicos
docker compose logs backend
docker compose logs frontend

# Reconstruir imágenes
docker compose build --no-cache

# Limpiar volúmenes
docker compose down -v
```

### Django
```bash
# Migrations
python manage.py makemigrations
python manage.py migrate

# Shell interactivo
python manage.py shell

# Collect static files
python manage.py collectstatic
```

### Angular
```bash
# Generar componente
ng generate component feature/nuevo-componente

# Generar servicio
ng generate service core/services/nuevo-servicio

# Analizar bundle
ng build --stats-json
npm run analyze
```

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'feat: nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo [LICENSE](LICENSE) para más detalles.

## 🆘 Soporte

- **Documentación ZapSign**: https://docs.zapsign.com.br/
- **Issues**: [GitHub Issues](https://github.com/andressalvarez/zap-sign-crud/issues)
- **Discussions**: [GitHub Discussions](https://github.com/andressalvarez/zap-sign-crud/discussions)

---

**Desarrollado con ❤️ por [Andrés Salvárez](https://github.com/andressalvarez)**
