@echo off
setlocal EnableExtensions
REM ==========================================================
REM  Car Quality Analytics - one-click launcher (Windows)
REM  1) makes sure .env exists and has DATABASE_URL
REM  2) then installs / prepares / builds if needed
REM  3) starts the app and opens the browser
REM  Usage:  run-app.bat           (normal)
REM          run-app.bat rebuild   (force a fresh build)
REM ==========================================================
cd /d "%~dp0"
title Car Quality Analytics
set "PORT=3000"
set "URL=http://localhost:%PORT%"

echo.
echo ==========================================
echo    Car Quality Analytics - starting
echo ==========================================
echo.

REM ---------- 0) Node.js must be installed ----------
where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed.
  echo         Download the LTS version from https://nodejs.org then run this file again.
  goto :fail
)

REM ---------- 1) Initialize .env FIRST ----------
if exist ".env" (
  echo [OK] .env found
) else (
  if exist ".env.example" (
    copy /y ".env.example" ".env" >nul
  ) else (
    > ".env" echo DATABASE_URL="file:./dev.db"
  )
  echo [OK] Created .env
)

REM .env must contain DATABASE_URL, add it if missing (new line first, in case the file has none at the end)
findstr /b /c:"DATABASE_URL=" ".env" >nul 2>nul
if errorlevel 1 (
  >> ".env" echo.
  >> ".env" echo DATABASE_URL="file:./dev.db"
  echo [OK] Added DATABASE_URL to .env
)

REM Final check: only continue when .env is really ready
findstr /b /c:"DATABASE_URL=" ".env" >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Could not initialize .env - check folder permissions.
  goto :fail
)
echo [OK] .env is initialized

REM ---------- 2) Already running? just open it ----------
netstat -ano | findstr /r /c:":%PORT% .*LISTENING" >nul 2>nul
if not errorlevel 1 (
  echo [i] The app is already running - opening %URL%
  start "" "%URL%"
  goto :eof
)

REM ---------- 3) Packages - first run only ----------
if not exist "node_modules\" (
  echo [..] Installing packages - first run only, please wait...
  call npm install
  if errorlevel 1 goto :fail
)

REM ---------- 4) Database: create / update tables - keeps your data ----------
echo [..] Preparing database...
call npx prisma migrate deploy
if errorlevel 1 goto :fail
call npx prisma generate >nul
if errorlevel 1 goto :fail

REM ---------- 5) Build when missing, outdated, or "rebuild" ----------
set "NEED_BUILD="
if /i "%~1"=="rebuild" set "NEED_BUILD=1"
if not exist ".next\BUILD_ID" set "NEED_BUILD=1"
if not defined NEED_BUILD (
  node -e "const fs=require('fs'),p=require('path');const t=fs.statSync('.next/BUILD_ID').mtimeMs;const w=d=>fs.readdirSync(d,{withFileTypes:true}).some(e=>{const f=p.join(d,e.name);return e.isDirectory()?w(f):fs.statSync(f).mtimeMs>t});const n=f=>fs.existsSync(f)&&fs.statSync(f).mtimeMs>t;process.exit(w('src')||w('prisma/migrations')||n('prisma/schema.prisma')||n('package.json')?1:0)"
  if errorlevel 1 set "NEED_BUILD=1"
)
if defined NEED_BUILD (
  echo [..] Building the app - takes about a minute...
  call npm run build
  if errorlevel 1 goto :fail
)

REM ---------- 6) Start + open the browser ----------
echo.
echo [OK] Starting on %URL%
echo      Keep this window open. Close it to stop the app.
echo.
start "" /min cmd /c "timeout /t 6 /nobreak >nul & start %URL%"
call npm start -- -p %PORT%
goto :eof

:fail
echo.
echo [ERROR] Something went wrong - see the messages above.
pause
exit /b 1
