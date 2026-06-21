@echo off
chcp 65001 >nul
title Atmosfera CRM - Сборка и запуск

echo ============================================
echo   Atmosfera CRM - Установка и запуск
echo ============================================
echo.

:: Проверка Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ОШИБКА] Python не найден.
    echo Установите Python 3.10-3.12 с python.org
    pause
    exit /b 1
)

:: Проверяем версию
python -c "import sys; v=sys.version_info; exit(0 if v.major==3 and v.minor>=10 and v.minor<=12 else 1)"
if %errorlevel% neq 0 (
    echo [ОШИБКА] Нужен Python 3.10-3.12
    pause
    exit /b 1
)

:: Определяем папку
set "ROOT=%~dp0..\..\shiny-falcon"
if not exist "%ROOT%" (
    echo [ОШИБКА] Не найдена папка проекта shiny-falcon
    pause
    exit /b 1
)

echo [1/4] Устанавливаю зависимости бэкенда...
cd /d "%ROOT%\backend"
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ОШИБКА] Установка зависимостей не удалась
    pause
    exit /b 1
)

echo [2/4] Собираю фронтенд...
cd /d "%ROOT%\frontend"
if not exist "node_modules" (
    call npm install
)
set VITE_API_BASE_URL=
set VITE_MOCK_INIT_DATA=desktop_473645426
call npm run build
if %errorlevel% neq 0 (
    echo [ОШИБКА] Сборка фронтенда не удалась
    pause
    exit /b 1
)

echo [3/4] Собираю бэкенд в exe...
cd /d "%ROOT%\desktop"
pip install pyinstaller
pyinstaller --clean atmosfera-backend.spec
if %errorlevel% neq 0 (
    echo [ОШИБКА] Сборка exe не удалась
    pause
    exit /b 1
)

echo [4/4] Копирую в portable...
copy /Y "%ROOT%\desktop\dist\atmosfera-backend.exe" "%~dp0atmosfera-backend.exe" >nul
copy /Y "%ROOT%\backend\.env.desktop" "%~dp0.env" >nul

echo.
echo ============================================
echo   Готово! Запускаю приложение...
echo ============================================
start "" "%~dp0atmosfera-backend.exe"

pause
