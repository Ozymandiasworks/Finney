@echo off
setlocal
cd /d "%~dp0"
echo Starting isolated Finney Test Client B.
echo Start Test Client A first and wait until its window is open.
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\run-second-test-client.ps1" -TorBrowser -InstanceId Test-B
exit /b %ERRORLEVEL%
