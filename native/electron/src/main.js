const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const net = require('net');

const PORT = 8000;
const BACKEND_URL = `http://127.0.0.1:${PORT}`;

let backendProcess = null;
let mainWindow = null;
let bootTimedOut = false;

// В собранном (packaged) приложении extraResources кладёт собранный
// PyInstaller-бэкенд в resources/backend. В dev (npm start) — берём из
// desktop/build рядом с корнем проекта.
function resolveBackendDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'backend');
  }
  // dev-режим: <project>/desktop/build/atmosfera-backend
  const projectRoot = path.resolve(__dirname, '..', '..', '..');
  return path.join(projectRoot, 'desktop', 'build', 'atmosfera-backend');
}

function backendExeName() {
  return process.platform === 'win32' ? 'atmosfera-backend.exe' : 'atmosfera-backend';
}

function waitForPort(port, timeout = 60000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function check() {
      if (Date.now() - start > timeout) {
        reject(new Error('Бэкенд не запустился за отведённое время'));
        return;
      }
      const sock = new net.Socket();
      sock.once('connect', () => {
        sock.destroy();
        resolve();
      });
      sock.once('error', () => {
        sock.destroy();
        setTimeout(check, 500);
      });
      sock.connect(port, '127.0.0.1');
    }
    check();
  });
}

// Надёжно завершаем дерево процессов бэкенда (PyInstaller onedir порождает
// дочерний процесс; обычный kill() оставляет его висеть).
function killBackendTree() {
  if (!backendProcess || backendProcess.killed) {
    backendProcess = null;
    return;
  }
  try {
    // taskkill /T убивает и дочерние процессы. Используем PID, не имя exe,
    // чтобы не задеть другие копии CRM.
    if (process.platform === 'win32') {
      spawn('taskkill', ['/F', '/T', '/PID', String(backendProcess.pid)], {
        windowsHide: true,
        stdio: 'ignore',
      });
    }
  } catch (_) {
    /* best effort */
  }
  try {
    backendProcess.kill();
  } catch (_) {
    /* best effort */
  }
  backendProcess = null;
}

function startBackend() {
  const backendDir = resolveBackendDir();
  const exe = path.join(backendDir, backendExeName());
  console.log(`Starting backend: ${exe}`);

  backendProcess = spawn(exe, [], {
    cwd: backendDir,
    windowsHide: false, // консоль бэкенда полезна при отладке
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  // Закрываем stdin сразу — PyInstaller-бэкенд на Windows виснет на startup,
  // если stdin-pipe остаётся открытым (ждёт ввода). EOF позволяет uvicorn
  // продолжить запуск.
  backendProcess.stdin.end();

  backendProcess.stdout.on('data', (data) => {
    console.log(`[backend] ${data.toString().trim()}`);
  });
  backendProcess.stderr.on('data', (data) => {
    console.error(`[backend:err] ${data.toString().trim()}`);
  });
  backendProcess.on('close', (code) => {
    console.log(`Backend exited with code ${code}`);
    backendProcess = null;
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 375,
    minHeight: 600,
    title: 'Atmosfera CRM',
    icon: path.join(__dirname, '..', 'icon.ico'),
    backgroundColor: '#0b1220',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(BACKEND_URL);

  // Внешние ссылки открываем в системном браузере, не в окне приложения.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://127.0.0.1:') || url.startsWith('http://localhost:')) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', async () => {
  startBackend();

  try {
    console.log('Waiting for backend...');
    await waitForPort(PORT);
    console.log('Backend is ready!');
  } catch (err) {
    console.error(err.message);
    bootTimedOut = true;
  }

  createWindow();

  // Если бэкенд ещё не успел подняться — показываем заглушку и ретраим.
  if (bootTimedOut) {
    mainWindow.loadURL(
      'data:text/html;charset=utf-8,' +
        encodeURIComponent(
          '<html><body style="font-family:sans-serif;padding:40px">' +
            '<h2>Запуск Atmosfera CRM…</h2>' +
            '<p>Сервер ещё поднимается. Окно обновится автоматически.</p></body></html>'
        )
    );
    waitForPort(PORT, 120000)
      .then(() => mainWindow && mainWindow.loadURL(BACKEND_URL))
      .catch(() => console.error('Бэкенд так и не поднялся'));
  }
});

app.on('window-all-closed', () => {
  killBackendTree();
  app.quit();
});

app.on('before-quit', () => {
  killBackendTree();
});

process.on('exit', () => {
  killBackendTree();
});
