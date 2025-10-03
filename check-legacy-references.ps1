# Script para verificar referencias antiguas después de la refactorización
# Ejecutar: .\check-legacy-references.ps1

Write-Host "Verificando referencias antiguas en el codigo..." -ForegroundColor Cyan
Write-Host ""

$issues = @()

# 1. Buscar referencias a 'movements' (debería ser 'transactions')
Write-Host "Buscando referencias a tabla 'movements'..." -ForegroundColor Yellow
$movementsRefs = Select-String -Path "app\**\*.ts","app\**\*.tsx" -Pattern "from\('movements'\)" -CaseSensitive
if ($movementsRefs) {
    Write-Host "  Encontradas $($movementsRefs.Count) referencias a 'movements'" -ForegroundColor Red
    $movementsRefs | ForEach-Object { Write-Host "     - $($_.Path):$($_.LineNumber)" -ForegroundColor Red }
    $issues += "movements table references"
} else {
    Write-Host "  OK: No se encontraron referencias a 'movements'" -ForegroundColor Green
}

# 2. Buscar referencias a campo 'note' (debería ser 'description')
Write-Host "`nBuscando referencias a campo 'note' en transacciones..." -ForegroundColor Yellow
$noteRefs = Select-String -Path "app\**\*.ts","app\**\*.tsx" -Pattern "\.note\s*[:\=]" -CaseSensitive
if ($noteRefs) {
    Write-Host "  Encontradas $($noteRefs.Count) posibles referencias a '.note'" -ForegroundColor Yellow
    $noteRefs | ForEach-Object { Write-Host "     - $($_.Path):$($_.LineNumber)" -ForegroundColor Yellow }
    $issues += "note field references"
} else {
    Write-Host "  OK: No se encontraron referencias a '.note'" -ForegroundColor Green
}

# 3. Buscar 'p_user_id' en RPC calls (debería ser 'p_profile_id')
Write-Host "`nBuscando 'p_user_id' en llamadas RPC..." -ForegroundColor Yellow
$pUserIdRefs = Select-String -Path "app\**\*.ts","app\**\*.tsx" -Pattern "p_user_id" -CaseSensitive
if ($pUserIdRefs) {
    Write-Host "  Encontradas $($pUserIdRefs.Count) referencias a 'p_user_id'" -ForegroundColor Red
    $pUserIdRefs | ForEach-Object { Write-Host "     - $($_.Path):$($_.LineNumber)" -ForegroundColor Red }
    $issues += "p_user_id in RPC calls"
} else {
    Write-Host "  OK: No se encontraron referencias a 'p_user_id'" -ForegroundColor Green
}

# 4. Buscar 'user_id:' en interfaces TypeScript (debería ser 'profile_id')
Write-Host "`nBuscando 'user_id:' en definiciones de tipos..." -ForegroundColor Yellow
$userIdTypeRefs = Select-String -Path "app\**\*.ts","app\**\*.tsx" -Pattern "user_id:\s*string" -CaseSensitive
if ($userIdTypeRefs) {
    Write-Host "  Encontradas $($userIdTypeRefs.Count) definiciones con 'user_id: string'" -ForegroundColor Yellow
    $userIdTypeRefs | ForEach-Object { Write-Host "     - $($_.Path):$($_.LineNumber)" -ForegroundColor Yellow }
    $issues += "user_id in type definitions"
} else {
    Write-Host "  OK: No se encontraron definiciones con 'user_id: string'" -ForegroundColor Green
}

# 5. Buscar uso directo de user.id en queries (potencial error)
Write-Host "`nBuscando uso directo de 'user.id' en queries con profile_id..." -ForegroundColor Yellow
$directUserIdPattern = '\.eq\(["\047]profile_id["\047],\s*user\.id\)'
$directUserIdRefs = Select-String -Path "app\**\*.ts","app\**\*.tsx" -Pattern $directUserIdPattern -CaseSensitive
if ($directUserIdRefs) {
    Write-Host "  Encontradas $($directUserIdRefs.Count) queries con .eq('profile_id', user.id)" -ForegroundColor Red
    Write-Host "     (Esto es incorrecto - debe resolverse a profile.id primero)" -ForegroundColor Red
    $directUserIdRefs | ForEach-Object { Write-Host "     - $($_.Path):$($_.LineNumber)" -ForegroundColor Red }
    $issues += "direct user.id in profile_id queries"
} else {
    Write-Host "  OK: No se encontraron queries incorrectas con user.id" -ForegroundColor Green
}

# 6. Verificar que existan resoluciones de profile_id
Write-Host "`nBuscando resoluciones correctas de profile_id..." -ForegroundColor Yellow
$profileResolutions = Select-String -Path "app\**\*.ts","app\**\*.tsx" -Pattern "from\('profiles'\)\.select\('id'\)\.eq\('auth_user_id'" -CaseSensitive
if ($profileResolutions) {
    Write-Host "  OK: Encontradas $($profileResolutions.Count) resoluciones de profile_id" -ForegroundColor Green
} else {
    Write-Host "  INFO: No se encontraron resoluciones de profile_id (puede ser normal si estan en lib/)" -ForegroundColor Yellow
}

# Resumen final
Write-Host "`n================================================================" -ForegroundColor Cyan
if ($issues.Count -eq 0) {
    Write-Host "VERIFICACION EXITOSA" -ForegroundColor Green
    Write-Host "No se encontraron referencias antiguas pendientes." -ForegroundColor Green
} else {
    Write-Host "PROBLEMAS ENCONTRADOS" -ForegroundColor Yellow
    Write-Host "Se encontraron los siguientes tipos de referencias:" -ForegroundColor Yellow
    $issues | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
    Write-Host "`nRevisar los archivos listados arriba y corregir." -ForegroundColor Yellow
}
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Información adicional
Write-Host "Informacion adicional:" -ForegroundColor Cyan
Write-Host "  - Build: npm run build" -ForegroundColor White
Write-Host "  - Server: http://localhost:3000" -ForegroundColor White
Write-Host "  - Checklist: docs\TESTING_CHECKLIST.md" -ForegroundColor White
Write-Host ""
