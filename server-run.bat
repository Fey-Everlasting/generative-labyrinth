@echo off
chcp 65001 >nul
title Labyrinth Art Installation Server

echo.
echo ============================================
echo   🎨 Infinite Recursive Maze - Art Installation
echo ============================================
echo.

:: Check if Node.js is installed
echo 🔍 Checking Node.js environment...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ❌ Node.js not detected!
    echo.
    echo Please install Node.js first:
    echo 1. Visit https://nodejs.org
    echo 2. Download and install LTS version
    echo 3. Run this script again
    echo.
    pause
    exit /b 1
)

:: Display Node.js version
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js version: %NODE_VERSION%

:: Check necessary files
echo 🔍 Checking project files...
if not exist "server.js" (
    echo ❌ Cannot find server.js file!
    echo Please make sure to run this script in the correct project directory.
    pause
    exit /b 1
)

if not exist "package.json" (
    echo ❌ Cannot find package.json file!
    echo Project configuration file is missing.
    pause
    exit /b 1
)

echo ✅ Project file check completed
echo.
echo 🚀 Starting server...
echo.

:: Start server
node server.js 3001

:: Check startup result
if %errorlevel% neq 0 (
    echo.
    echo ❌ Server startup failed!
    echo.
    echo Possible causes:
    echo 1. Port is occupied (try closing other programs)
    echo 2. Node.js version incompatible (requires 14.0.0 or higher)
    echo 3. Project files corrupted
    echo.
    echo Current Node.js version: %NODE_VERSION%
    echo Required version: 14.0.0 or higher
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Server closed normally
pause

