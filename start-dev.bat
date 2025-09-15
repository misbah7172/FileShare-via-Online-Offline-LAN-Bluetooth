@echo off
echo Starting FileShare Development Server...
echo.

echo [1/3] Starting backend server...
cd server
start "FileShare Server" cmd /k "npm run dev"

echo [2/3] Waiting for server to start...
timeout /t 3 /nobreak

echo [3/3] Starting frontend development server...
cd ..\client
start "FileShare Client" cmd /k "npm start"

echo.
echo ✅ FileShare is starting up!
echo.
echo Backend: http://localhost:3001
echo Frontend: http://localhost:3000
echo.
echo Press any key to exit this script (servers will continue running)...
pause
