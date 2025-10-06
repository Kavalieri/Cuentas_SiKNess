# Fix UTF-8 encoding in PowerShell terminal
# Add this to your PowerShell profile to fix permanently

# Set UTF-8 encoding for console
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "✓ UTF-8 encoding configured for this session" -ForegroundColor Green
Write-Host "To make this permanent, add the above commands to your PowerShell profile:" -ForegroundColor Yellow
Write-Host "  1. Run: notepad `$PROFILE" -ForegroundColor Cyan
Write-Host "  2. Add the encoding lines from this file" -ForegroundColor Cyan
Write-Host "  3. Restart PowerShell" -ForegroundColor Cyan
