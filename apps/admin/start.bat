@echo off
echo ========================================
echo   Iniciando Panel Administrativo
echo ========================================
echo.

REM Verificar si node_modules existe
if not exist "node_modules" (
    echo [INFO] Instalando dependencias...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Error al instalar dependencias
        echo [INFO] Asegurate de tener Node.js instalado
        pause
        exit /b 1
    )
)

echo [INFO] Iniciando servidor de desarrollo...
echo [INFO] El panel estara disponible en: http://localhost:3001
echo [INFO] Presiona Ctrl+C para detener el servidor
echo.

call npm run dev

pause





