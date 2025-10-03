# Script avanzado para migrar código - fase 2: user_id → profile_id en contexts específicos
# Este script SOLO cambia user_id → profile_id en líneas relacionadas con:
# - contributions (queries y destructuring)
# - pre_payments (queries y destructuring)  
# - member_incomes (queries y destructuring)
# - household_members (queries y destructuring)
# NO toca user_id en transactions (que viene de auth.users)

Write-Host "Iniciando migración avanzada..." -ForegroundColor Green

$file = "app\app\contributions\actions.ts"

if (Test-Path $file) {
    Write-Host "Procesando $file..." -ForegroundColor Yellow
    
    $content = Get-Content $file -Raw
    
    # 1. Cambiar tabla movements → transactions
    $content = $content -replace "from\('movements'\)", "from('transactions')"
    $content = $content -replace "Tables\['movements'\]", "Tables['transactions']"
    
    # 2. Cambiar campo note → description
    $content = $content -replace '\bnote:', 'description:'
    
    # 3. SPECIFIC user_id → profile_id changes
    # En queries de contributions SELECT
    $content = $content -replace "\.select\('expected_amount, household_id, user_id, month, year'\)", ".select('expected_amount, household_id, profile_id, month, year')"
    
    # En destructuring de contribution object
    $content = $content -replace "const \{ expected_amount, household_id, user_id, month, year \} = contribution;", "const { expected_amount, household_id, profile_id, month, year } = contribution;"
    
    # En array de contributions objects (línea ~204-210)
    $content = $content -replace "(\s+)user_id: income\.user_id,", "`$1profile_id: income.profile_id,"
    
    # En MovementData object (línea ~340)
    $content = $content -replace "(\s+)user_id,(\s+category_id)", "`$1profile_id,`$2"
    
    # En prepayment movement insert (línea ~533)
    $content = $content -replace "(\s+)user_id: parsed\.data\.user_id,", "`$1profile_id: parsed.data.profile_id,"
    
    # En prepayment object select/map (línea ~642)
    $content = $content -replace "pp\.user_id", "pp.profile_id"
    
    # En markUnpaidWithRefund query (línea ~712)
    $content = $content -replace "\.select\('expected_amount, pre_payment_amount, paid_amount, household_id, user_id, month, year'\)", ".select('expected_amount, pre_payment_amount, paid_amount, household_id, profile_id, month, year')"
    
    # En markUnpaidWithRefund destructuring (línea ~712)  
    $content = $content -replace "const \{ expected_amount, pre_payment_amount, paid_amount, household_id, user_id, month, year \} =", "const { expected_amount, pre_payment_amount, paid_amount, household_id, profile_id, month, year } ="
    
    # En segundo movementData (línea ~754)
    $content = $content -replace "(\s+household_id,\s+)user_id,(\s+category_id: categoryId,)", "`${1}profile_id,`$2"
    
    $content | Set-Content $file -NoNewline
    
    Write-Host "  ✓ Completado" -ForegroundColor Green
} else {
    Write-Host "  ✗ Archivo no encontrado: $file" -ForegroundColor Red
}

Write-Host "`nMigración completada." -ForegroundColor Green
