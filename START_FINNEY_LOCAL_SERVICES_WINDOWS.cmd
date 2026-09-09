@echo off
setlocal
cd /d "%~dp0"

echo Finney local relay/keyserver - development only
echo.
echo This window must stay open while testing Finney.
echo Data is stored only in memory and is erased when this window closes.
echo Relay:    http://127.0.0.1:31337
echo Registry: http://127.0.0.1:31338
echo.

if not exist "node_modules\ws\package.json" (
  echo ERROR: Finney dependencies are not installed in this folder.
  echo Run SETUP_FINNEY_WINDOWS.cmd first.
  echo.
  pause
  exit /b 1
)

node local-services\server.js
set EXITCODE=%ERRORLEVEL%
echo.
echo Finney local services exited with code %EXITCODE%.
pause
exit /b %EXITCODE%
