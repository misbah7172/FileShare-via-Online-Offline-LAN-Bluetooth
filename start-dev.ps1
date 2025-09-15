Write-Host "Starting FileShare Development Server..." -ForegroundColor Green
Write-Host ""

Write-Host "[1/3] Starting backend server..." -ForegroundColor Yellow
Set-Location "server"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal

Write-Host "[2/3] Waiting for server to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "[3/3] Starting frontend development server..." -ForegroundColor Yellow
Set-Location "..\client"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm start" -WindowStyle Normal

Set-Location ".."

Write-Host ""
Write-Host "✅ FileShare is starting up!" -ForegroundColor Green
Write-Host ""
Write-Host "Backend: http://localhost:3001" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit this script (servers will continue running)..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
