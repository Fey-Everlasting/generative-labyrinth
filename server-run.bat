@echo off
chcp 65001 >nul
title 迷宫艺术装置服务器

echo.
echo ============================================
echo   🎨 无限递归生成迷宫 - 艺术装置
echo ============================================
echo.

:: 检查 Node.js 是否安装
echo 🔍 检查 Node.js 环境...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ❌ 未检测到 Node.js！
    echo.
    echo 请先安装 Node.js：
    echo 1. 访问 https://nodejs.org
    echo 2. 下载并安装 LTS 版本
    echo 3. 重新运行此脚本
    echo.
    pause
    exit /b 1
)

:: 显示 Node.js 版本
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js 版本: %NODE_VERSION%

:: 检查必要文件
echo 🔍 检查项目文件...
if not exist "server.js" (
    echo ❌ 找不到 server.js 文件！
    echo 请确保在正确的项目目录中运行此脚本。
    pause
    exit /b 1
)

if not exist "package.json" (
    echo ❌ 找不到 package.json 文件！
    echo 项目配置文件缺失。
    pause
    exit /b 1
)

echo ✅ 项目文件检查完成
echo.
echo 🚀 正在启动服务器...
echo.

:: 启动服务器
node server.js 3001

:: 检查启动结果
if %errorlevel% neq 0 (
    echo.
    echo ❌ 服务器启动失败！
    echo.
    echo 可能的原因：
    echo 1. 端口被占用（尝试关闭其他程序）
    echo 2. Node.js 版本不兼容（需要 14.0.0 或更高版本）
    echo 3. 项目文件损坏
    echo.
    echo 当前 Node.js 版本: %NODE_VERSION%
    echo 要求版本: 14.0.0 或更高
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ 服务器已正常关闭
pause

