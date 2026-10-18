const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

const STATE_FILE = path.join(app.getPath('userData'), 'state.json');
const DEFAULT_URL = 'https://puh.gg/dashboard';

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveState(data) {
  try {
    fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
    fs.writeFileSync(STATE_FILE, JSON.stringify(data), 'utf8');
  } catch {}
}

function isOnScreen(x, y, width, height) {
  const { screen } = require('electron');
  return screen.getAllDisplays().some(d => {
    const b = d.workArea;
    return x >= b.x - 100 && y >= b.y - 100 &&
           x + width <= b.x + b.width + 100 &&
           y + height <= b.y + b.height + 100;
  });
}

function createWindow() {
  const state = loadState();
  const width = state.width || 1280;
  const height = state.height || 800;

  const usePosition = typeof state.x === 'number' &&
                      typeof state.y === 'number' &&
                      isOnScreen(state.x, state.y, width, height);

  const win = new BrowserWindow({
    width,
    height,
    ...(usePosition ? { x: state.x, y: state.y } : {}),
    show: false,
    titleBarStyle: 'hiddenInset',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      partition: 'persist:puh',
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadURL(state.lastUrl || DEFAULT_URL);

  win.once('ready-to-show', () => win.show());
  const showTimer = setTimeout(() => win.show(), 8000);
  win.once('ready-to-show', () => clearTimeout(showTimer));

  win.webContents.on('did-navigate', (_, url) => {
    saveState({ ...loadState(), lastUrl: url });
  });

  win.webContents.on('did-navigate-in-page', (_, url) => {
    saveState({ ...loadState(), lastUrl: url });
  });

  win.webContents.on('did-fail-load', (_, errCode) => {
    if (errCode !== -3) win.loadURL(DEFAULT_URL);
  });

  win.on('close', () => {
    const bounds = win.getBounds();
    saveState({ ...loadState(), ...bounds });
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
