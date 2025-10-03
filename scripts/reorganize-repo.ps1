#!/usr/bin/env pwsh
# Script de reorganización profesional del repositorio CuentasSiK
# Ejecutar desde la raíz del proyecto: .\scripts\reorganize-repo.ps1

$ErrorActionPreference = "Stop"
Write-Host "🔧 Reorganizando estructura del repositorio..." -ForegroundColor Cyan

# ============================================================================
# PASO 1: Crear directorios necesarios
# ============================================================================
Write-Host "`n📁 Creando estructura de directorios..." -ForegroundColor Yellow

$dirsToCreate = @(
    "_archive",
    "private",
    "docs/archive",
    "docs/setup"
)

foreach ($dir in $dirsToCreate) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  ✅ Creado: $dir" -ForegroundColor Green
    } else {
        Write-Host "  ⏭️  Ya existe: $dir" -ForegroundColor Gray
    }
}

# ============================================================================
# PASO 2: Mover datos privados
# ============================================================================
Write-Host "`n🔒 Moviendo datos privados..." -ForegroundColor Yellow

if (Test-Path "DOCUMENTOS") {
    git rm -r --cached DOCUMENTOS 2>$null
    Move-Item -Path "DOCUMENTOS" -Destination "private/" -Force
    Write-Host "  ✅ DOCUMENTOS/ → private/DOCUMENTOS/" -ForegroundColor Green
}

# ============================================================================
# PASO 3: Mover archivos .md temporales de raíz a docs/setup/
# ============================================================================
Write-Host "`n📄 Moviendo documentación temporal..." -ForegroundColor Yellow

$tempDocsToMove = @(
    "COMMIT_MESSAGE_GUIDE.md",
    "COMMIT_NOW.md",
    "FINAL_SUMMARY.md",
    "PRE_COMMIT_CLEANUP.md",
    "RELEASE_PLEASE_SETUP.md",
    "REPOSITORY_READY.md"
)

foreach ($file in $tempDocsToMove) {
    if (Test-Path $file) {
        git mv $file "docs/setup/$file" 2>$null
        Write-Host "  ✅ $file → docs/setup/" -ForegroundColor Green
    }
}

# ============================================================================
# PASO 4: Consolidar archivos de inicio
# ============================================================================
Write-Host "`n📚 Consolidando guías de inicio..." -ForegroundColor Yellow

# QUICK_START.md ya está bien en raíz, solo verificar
if (Test-Path "QUICK_START.md") {
    Write-Host "  ℹ️  QUICK_START.md permanece en raíz" -ForegroundColor Cyan
}

# NEXT_STEPS.md puede ir a docs/
if (Test-Path "NEXT_STEPS.md") {
    git mv "NEXT_STEPS.md" "docs/NEXT_STEPS.md" 2>$null
    Write-Host "  ✅ NEXT_STEPS.md → docs/" -ForegroundColor Green
}

# ============================================================================
# PASO 5: Reorganizar .archive → _archive
# ============================================================================
Write-Host "`n🗄️  Reorganizando archivos archivados..." -ForegroundColor Yellow

if (Test-Path ".archive") {
    $archiveFiles = Get-ChildItem ".archive" -File
    foreach ($file in $archiveFiles) {
        Move-Item -Path $file.FullName -Destination "_archive/" -Force
        Write-Host "  ✅ $($file.Name) → _archive/" -ForegroundColor Green
    }
    Remove-Item ".archive" -Force -ErrorAction SilentlyContinue
}

# ============================================================================
# PASO 6: Organizar db/ → documentación de referencia
# ============================================================================
Write-Host "`n🗃️  Reorganizando archivos de base de datos..." -ForegroundColor Yellow

# Los .sql de db/ que son útiles como referencia van a docs/archive/
$dbDocsToArchive = @(
    "db/APPLY_SYSTEM_ADMINS_MIGRATION.md",
    "db/FIX-RLS-README.md",
    "db/FIX_HOUSEHOLDS_INSERT.md"
)

foreach ($file in $dbDocsToArchive) {
    if (Test-Path $file) {
        $filename = Split-Path $file -Leaf
        git mv $file "docs/archive/$filename" 2>$null
        Write-Host "  ✅ $file → docs/archive/" -ForegroundColor Green
    }
}

# Los .sql históricos van a _archive (no se commitean)
$sqlToArchive = @(
    "db/fix-rls-policies.sql",
    "db/fix_missing_member.sql",
    "db/insert_permanent_admin.sql"
)

foreach ($file in $sqlToArchive) {
    if (Test-Path $file) {
        $filename = Split-Path $file -Leaf
        git rm --cached $file 2>$null
        Move-Item -Path $file -Destination "_archive/$filename" -Force
        Write-Host "  ✅ $file → _archive/ (no commiteado)" -ForegroundColor Green
    }
}

# Mantener solo schema.sql, seed.sql y README.md en db/
Write-Host "  ℹ️  Manteniendo db/schema.sql, db/seed.sql, db/README.md" -ForegroundColor Cyan

# ============================================================================
# PASO 7: Actualizar .gitignore
# ============================================================================
Write-Host "`n🚫 Actualizando .gitignore..." -ForegroundColor Yellow

$gitignoreContent = @"
# Node/Next
node_modules/
.next/
out/
*.log
*.tsbuildinfo

# Entorno
.env
.env.*
!.env.example
!.env.local.example

# Supabase local
supabase/.temp/
supabase/.branches/
docker/
*.db

# Sistemas
.DS_Store
Thumbs.db
.vscode/settings.json

# Datos privados / temporales
/private/
/_archive/
/tmp/
/DOCUMENTOS/
*.xlsx
*.xls
*.local.*
*.secret.*

# Build artifacts
.vercel/
dist/
"@

Set-Content -Path ".gitignore" -Value $gitignoreContent -Encoding UTF8
Write-Host "  ✅ .gitignore actualizado" -ForegroundColor Green

# ============================================================================
# PASO 8: Limpiar archivos temporales
# ============================================================================
Write-Host "`n🧹 Limpiando archivos temporales..." -ForegroundColor Yellow

if (Test-Path "tsconfig.tsbuildinfo") {
    Remove-Item "tsconfig.tsbuildinfo" -Force
    Write-Host "  ✅ Eliminado tsconfig.tsbuildinfo" -ForegroundColor Green
}

# ============================================================================
# RESUMEN FINAL
# ============================================================================
Write-Host "`n✅ ¡Reorganización completada!" -ForegroundColor Green
Write-Host "`nEstructura final:" -ForegroundColor Cyan
Write-Host "  📁 /app/               - Rutas Next.js" -ForegroundColor White
Write-Host "  📁 /components/        - Componentes compartidos" -ForegroundColor White
Write-Host "  📁 /lib/               - Utilidades" -ForegroundColor White
Write-Host "  📁 /supabase/          - Migraciones y config" -ForegroundColor White
Write-Host "  📁 /db/                - Schemas de referencia" -ForegroundColor White
Write-Host "  📁 /docs/              - Documentación completa" -ForegroundColor White
Write-Host "  📁 /docs/setup/        - Guías de configuración" -ForegroundColor White
Write-Host "  📁 /docs/archive/      - Docs históricos" -ForegroundColor White
Write-Host "  📁 /scripts/           - Scripts de utilidad" -ForegroundColor White
Write-Host "  📁 /types/             - Tipos TypeScript" -ForegroundColor White
Write-Host "  📁 /private/           - Datos privados (gitignored)" -ForegroundColor Yellow
Write-Host "  📁 /_archive/          - Archivos obsoletos (gitignored)" -ForegroundColor Gray

Write-Host "`n📋 Próximos pasos:" -ForegroundColor Cyan
Write-Host "  1. Revisar cambios: git status" -ForegroundColor White
Write-Host "  2. Verificar build: npm run build" -ForegroundColor White
Write-Host "  3. Commit: git commit -m 'chore: reorganize repository structure'" -ForegroundColor White
Write-Host "  4. Push: git push origin main" -ForegroundColor White

Write-Host "`n🎉 Repositorio profesionalizado con éxito!" -ForegroundColor Magenta
