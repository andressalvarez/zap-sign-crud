# =============================================================================
# ZapSign Document Management System - Instalacion Automatica
# =============================================================================
# Script de instalacion para Windows (PowerShell)
# Ejecutar como: .\install-simple.ps1
# =============================================================================

# -----------------------------------------------------------
# Elevacion a Administrador si es necesario
# -----------------------------------------------------------
$scriptPath = $MyInvocation.MyCommand.Definition
if (-not ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent() `
     ).IsInRole([Security.Principal.WindowsBuiltinRole]::Administrator)) {
    Write-Host "Elevando permisos de administrador..." -ForegroundColor Yellow
    Start-Process -FilePath PowerShell `
                  -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`"" `
                  -Verb RunAs
    exit
}

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "ZapSign CRUD - Instalacion Automatica" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# -----------------------------------------------------------
# Verificar Docker Desktop
# -----------------------------------------------------------
Write-Host "Verificando Docker..." -ForegroundColor Yellow

try {
    # Intentar iniciar Docker Desktop si no esta corriendo
    $dockerProcess = Get-Process "Docker Desktop" -ErrorAction SilentlyContinue
    if (-not $dockerProcess) {
        Write-Host "Intentando iniciar Docker Desktop..." -ForegroundColor Yellow

        # Buscar Docker Desktop en ubicaciones comunes
        $dockerPaths = @(
            "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
            "$env:LOCALAPPDATA\Programs\Docker\Docker\Docker Desktop.exe"
        )

        $dockerFound = $false
        foreach ($path in $dockerPaths) {
            if (Test-Path $path) {
                Start-Process $path
                $dockerFound = $true
                Write-Host "Docker Desktop iniciado" -ForegroundColor Green
                Write-Host "Esperando que Docker este listo (30 segundos)..." -ForegroundColor Yellow
                Start-Sleep -Seconds 30
                break
            }
        }

        if (-not $dockerFound) {
            Write-Host "Docker Desktop no encontrado automaticamente" -ForegroundColor Red
            Write-Host "Por favor:" -ForegroundColor Yellow
            Write-Host "   1. Abra Docker Desktop manualmente" -ForegroundColor White
            Write-Host "   2. Espere a que este completamente iniciado" -ForegroundColor White
            Write-Host "   3. Presione cualquier tecla para continuar..." -ForegroundColor White
            $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        }
    } else {
        Write-Host "Docker Desktop ya esta ejecutandose" -ForegroundColor Green
    }

    # Verificar que Docker CLI funcione
    $dockerVersion = docker --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker CLI no disponible"
    }

    # Verificar que Docker Compose funcione
    $composeVersion = docker compose version 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker Compose no disponible"
    }

    # Verificar que Docker daemon este corriendo
    docker info 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Docker daemon no esta corriendo"
    }

    Write-Host "Docker esta listo!" -ForegroundColor Green

} catch {
    Write-Host "Error con Docker: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Soluciones:" -ForegroundColor Yellow
    Write-Host "   1. Instale Docker Desktop desde: https://docker.com/get-started" -ForegroundColor White
    Write-Host "   2. Asegurese de que Docker Desktop este ejecutandose" -ForegroundColor White
    Write-Host "   3. Reinicie este script despues de que Docker este listo" -ForegroundColor White
    Write-Host ""
    Read-Host "Presione Enter para salir"
    exit 1
}

# -----------------------------------------------------------
# Instalacion del Sistema
# -----------------------------------------------------------
Write-Host ""
Write-Host "Este script ejecutara:" -ForegroundColor Cyan
Write-Host "   1. Limpiar contenedores y volumenes previos" -ForegroundColor White
Write-Host "   2. Construir imagenes Docker optimizadas" -ForegroundColor White
Write-Host "   3. Iniciar servicios (PostgreSQL, Django, Angular)" -ForegroundColor White
Write-Host "   4. Ejecutar migraciones de base de datos" -ForegroundColor White
Write-Host "   5. Cargar datos iniciales con token ZapSign" -ForegroundColor White
Write-Host "   6. Verificar que todo funcione correctamente" -ForegroundColor White
Write-Host ""
Write-Host "Tiempo estimado: 3-5 minutos en primera ejecucion" -ForegroundColor Yellow
Write-Host ""

$confirmation = Read-Host "Continuar con la instalacion? (S/n)"
if ($confirmation -eq 'n' -or $confirmation -eq 'N') {
    Write-Host "Instalacion cancelada por el usuario" -ForegroundColor Red
    exit 0
}

try {
    Write-Host ""
    Write-Host "Paso 1: Limpiando entorno previo..." -ForegroundColor Yellow
    docker compose down -v --remove-orphans 2>$null
    Write-Host "Entorno limpio" -ForegroundColor Green

    Write-Host ""
    Write-Host "Paso 2: Construyendo imagenes Docker..." -ForegroundColor Yellow
    docker compose build --no-cache
    if ($LASTEXITCODE -ne 0) { throw "Error construyendo imagenes" }
    Write-Host "Imagenes construidas exitosamente" -ForegroundColor Green

    Write-Host ""
    Write-Host "Paso 3: Iniciando servicios..." -ForegroundColor Yellow
    docker compose up -d
    if ($LASTEXITCODE -ne 0) { throw "Error iniciando servicios" }
    Write-Host "Servicios iniciados" -ForegroundColor Green

    Write-Host ""
    Write-Host "Paso 4: Esperando servicios (30 segundos)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 30

    Write-Host ""
    Write-Host "Paso 5: Ejecutando migraciones..." -ForegroundColor Yellow
    docker compose exec -T backend python manage.py migrate
    if ($LASTEXITCODE -ne 0) { throw "Error en migraciones" }
    Write-Host "Migraciones ejecutadas" -ForegroundColor Green

    Write-Host ""
    Write-Host "Paso 6: Cargando datos iniciales..." -ForegroundColor Yellow
    docker compose exec -T backend python init_data.py
    if ($LASTEXITCODE -ne 0) { throw "Error cargando datos" }
    Write-Host "Datos iniciales cargados" -ForegroundColor Green

    Write-Host ""
    Write-Host "Paso 7: Verificando servicios..." -ForegroundColor Yellow
    $services = docker compose ps --format "table {{.Name}}\t{{.Status}}" | Select-Object -Skip 1
    Write-Host $services

    # Verificar que la API responda
    Start-Sleep -Seconds 5
    try {
        $apiTest = Invoke-RestMethod -Uri "http://localhost:8000/api/companies/" -TimeoutSec 10
        Write-Host "API backend funcionando correctamente" -ForegroundColor Green
    } catch {
        Write-Host "Advertencia: API backend podria necesitar mas tiempo para iniciar" -ForegroundColor Yellow
    }

} catch {
    Write-Host ""
    Write-Host "Error durante la instalacion: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Comandos para debug:" -ForegroundColor Yellow
    Write-Host "   docker compose logs backend" -ForegroundColor White
    Write-Host "   docker compose logs frontend" -ForegroundColor White
    Write-Host "   docker compose logs db" -ForegroundColor White
    Write-Host ""
    Read-Host "Presione Enter para salir"
    exit 1
}

# -----------------------------------------------------------
# Instalacion Completada
# -----------------------------------------------------------
Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "INSTALACION COMPLETADA EXITOSAMENTE!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Acceso a la aplicacion:" -ForegroundColor Cyan
Write-Host "   Frontend:    http://localhost:4200" -ForegroundColor White
Write-Host "   Backend API: http://localhost:8000/api/" -ForegroundColor White
Write-Host "   API Docs:    http://localhost:8000/api/docs/" -ForegroundColor White
Write-Host "   Database:    localhost:5432 (zuser/zpass/zapsign)" -ForegroundColor White
Write-Host ""
Write-Host "Comandos utiles:" -ForegroundColor Cyan
Write-Host "   docker compose logs -f backend    # Ver logs backend" -ForegroundColor White
Write-Host "   docker compose logs -f frontend   # Ver logs frontend" -ForegroundColor White
Write-Host "   docker compose down               # Detener servicios" -ForegroundColor White
Write-Host "   docker compose up -d              # Reiniciar servicios" -ForegroundColor White
Write-Host ""
Write-Host "El sistema ZapSign esta listo para usar!" -ForegroundColor Green
Write-Host ""

Read-Host "Presione Enter para abrir el frontend en el navegador"

# Abrir frontend en navegador por defecto
Start-Process "http://localhost:4200"

Write-Host "Disfrute del sistema ZapSign!" -ForegroundColor Green 