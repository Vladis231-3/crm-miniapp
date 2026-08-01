Option Explicit
Dim fso, root, sh
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")

' корень репозитория = родитель каталога scripts
root = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
sh.CurrentDirectory = root

' запуск watcher'а полностью скрыто, лог в scripts\project-map-watch.log
sh.Run "cmd /c python scripts\generate_project_map.py --watch --interval 2 >> scripts\project-map-watch.log 2>&1", 0, False
