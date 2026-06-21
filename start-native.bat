@echo off
chcp 65001 >nul
title Atmosfera CRM

:: Убедимся что Electron установлен
if not exist "%~dp0native\electron\node_modules" (
    echo Установка Electron...
    cd /d "%~dp0native\electron"
    call npm install
    if %errorlevel% neq 0 (
        echo [ОШИБКА] npm install не удался
        pause
        exit /b 1
    )
    cd /d "%~dp0"
)

:: Убедимся что Python зависимости установлены
echo Установка Python-зависимостей...
cd /d "%~dp0backend"
pip install -r requirements.txt 2>nul
cd /d "%~dp0"

:: Запускаем
echo Запуск Atmosfera CRM...
cd /d "%~dp0native\electron"
call npm start
