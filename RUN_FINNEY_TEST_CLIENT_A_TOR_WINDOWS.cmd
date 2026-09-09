@echo off
setlocal
cd /d "%~dp0"
echo Starting isolated Finney Test Client A.
echo Keep this window open while testing.
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\run-windows.ps1" -TorBrowser -InstanceId Test-A
exit /b %ERRORLEVEL%
