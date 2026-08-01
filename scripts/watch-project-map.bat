@echo off
rem Запускает фоновый watcher PROJECT_MAP.md (перегенерирует при изменениях).
rem Лог: scripts\project-map-watch.log
cd /d "%~dp0.."
start "project-map-watch" /min cmd /c "python scripts\generate_project_map.py --watch --interval 2 >> scripts\project-map-watch.log 2>&1"
echo Watcher запущен. Лог: scripts\project-map-watch.log
