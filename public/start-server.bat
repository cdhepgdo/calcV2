@echo off
echo ========================================
echo   Sistema de Ventas iPhone
echo   Iniciando servidor local...
echo ========================================
echo.
echo Servidor corriendo en:
echo   http://localhost:8000
echo.
echo Presiona Ctrl+C para detener
echo ========================================
echo.
python -m http.server 8000
