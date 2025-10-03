# Script para migrar el código de movements → transactions y user_id → profile_id
# NO ejecutar directamente user_id → profile_id porque puede romper referencias a auth.users

Write-Host "Iniciando migración de código..." -ForegroundColor Green

# Archivos a migrar
$files = @(
    "app\app\expenses\actions.ts",
    "app\app\contributions\actions.ts",
    "app\app\periods\actions.ts",
    "app\app\admin\page.tsx",
    "app\app\admin\households\page.tsx"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Migrando $file..." -ForegroundColor Yellow
        
        # Leer contenido
        $content = Get-Content $file -Raw
        
        # Reemplazos en orden:
        # 1. Cambiar tablas movements → transactions
        $content = $content -replace "from\('movements'\)", "from('transactions')"
        $content = $content -replace "Tables\['movements'\]", "Tables['transactions']"
        
        # 2. Cambiar campo note → description  
        $content = $content -replace '\bnote:', 'description:'
        $content = $content -replace "\.note\b", ".description"
        $content = $content -replace "'note'", "'description'"
        $content = $content -replace '"note"', '"description"'
        
        # Guardar cambios
        $content | Set-Content $file -NoNewline
        
        Write-Host "  ✓ Completado" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Archivo no encontrado: $file" -ForegroundColor Red
    }
}

Write-Host "`nMigración completada. Ahora ejecuta 'npm run build' para verificar." -ForegroundColor Green
