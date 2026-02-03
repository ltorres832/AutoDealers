@echo off
echo ========================================
echo   Panel Administrativo - AutoDealers
echo ========================================
echo.

REM Agregar Node.js al PATH
set PATH=C:\Program Files\nodejs;%PATH%

REM Cambiar al directorio del admin
cd /d "%~dp0"

echo [1/3] Verificando Node.js...
node --version
if errorlevel 1 (
    echo [ERROR] Node.js no encontrado. Instala Node.js desde https://nodejs.org/
    pause
    exit /b 1
)

echo.
echo [2/3] Verificando dependencias...
if not exist "node_modules" (
    echo [INFO] Instalando dependencias por primera vez...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Error al instalar dependencias
        pause
        exit /b 1
    )
)

echo.
echo [3/3] Iniciando servidor...
echo [INFO] El panel estara disponible en: http://localhost:3001
echo [INFO] Presiona Ctrl+C para detener el servidor
echo.
echo ========================================
echo.

call npm run dev

pause





