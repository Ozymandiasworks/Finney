@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\setup-windows.ps1"
if errorlevel 1 (
  echo.
  echo Finney setup did not complete. Copy the error shown above if you need help.
  pause
  exit /b 1
)
echo.
pause
