const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const net = require('net');

const PORT = 8000;
const BACKEND_URL = `http://127.0.0.1:${PORT}`;

// Path to project root (concept1.0 or shiny-falcon)
const PROJECT_DIR = path.resolve(__dirname, '..', '..', '..');
const BACKEND_DIR = path.join(PROJECT_DIR, 'backend');
const BACKEND_SCRIPT = path.join(BACKEND_DIR, 'run_desktop.py');
const BACKEND_ENV = path.join(BACKEND_DIR, '.env');

let backendProcess = null;
let mainWindow = null;

function waitForPort(port, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function check() {
      if (Date.now() - start > timeout) {
        reject(new Error('Backend did not start within timeout'));
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

function startBackend() {
  console.log('Starting backend...');
  console.log(`  Script: ${BACKEND_SCRIPT}`);

  backendProcess = spawn('python', [BACKEND_SCRIPT], {
    cwd: BACKEND_DIR,
    env: {
      ...process.env,
      APP_ENV: 'development',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

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
    width: 1100,
    height: 800,
    minWidth: 375,
    minHeight: 600,
    title: 'Atmosfera CRM',
    icon: path.join(__dirname, '..', 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(BACKEND_URL);

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
    // Still try to open the window even if backend isn't ready
  }

  createWindow();
});

app.on('window-all-closed', () => {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
  app.quit();
});

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
});
