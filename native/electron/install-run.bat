@echo off
chcp 65001 >nul
title Atmosfera CRM — установка и запуск

echo ============================================
echo   Atmosfera CRM - Нативное приложение
echo ============================================
echo.

:: Проверка Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ОШИБКА] Node.js не найден. Установите с nodejs.org
    pause
    exit /b 1
)

:: Установка зависимостей Python
echo [1/3] Проверка Python-зависимостей...
cd /d "%~dp0..\..\..\shiny-falcon\backend"
pip install -r requirements.txt 2>nul
echo Готово.

:: Установка npm пакетов Electron
echo [2/3] Установка Electron...
cd /d "%~dp0"
call npm install
echo Готово.

:: Запуск
echo [3/3] Запуск приложения...
echo.
call npm start

pause
