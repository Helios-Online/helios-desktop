import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, dialog } from 'electron';
import * as path from 'path';
import log from 'electron-log';
import {
  installHermesAgent,
} from '../shared/installer';
import {
  deployAgent,
  stopAgent,
  restartAgent,
  getAgentStatus,
  getAgentLogs,
  startHealthCheck,
  stopHealthCheck,
} from '../shared/deployer';

log.initialize();
log.transports.file.level = 'info';
log.transports.console.level = 'debug';
log.info('Application starting...');

process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error);
  app.exit(1);
});

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled Rejection:', reason);
});

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const isDev = !app.isPackaged;

function createTray(): void {
  const iconPath = isDev
    ? path.join(__dirname, '../../resources/tray-icon.png')
    : path.join(process.resourcesPath, 'tray-icon.png');

  let trayIcon: nativeImage;
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) {
      trayIcon = nativeImage.createEmpty();
    }
  } catch {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('Helios Desktop');

  updateTrayMenu('not_installed');

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.focus();
      } else {
        mainWindow.show();
      }
    }
  });
}

function updateTrayMenu(status: 'running' | 'stopped' | 'installing' | 'error' | 'not_installed'): void {
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `Status: ${status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'Show Helios',
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        (app as any).isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip(`Helios Desktop - ${status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}`);
}

function createWindow(): void {
  log.info('Creating main window...');

  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 600,
    minHeight: 400,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    log.info('Main window ready to show');
    mainWindow?.show();
  });

  mainWindow.on('close', (event) => {
    if (!(app as any).isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      log.info('Window hidden to tray');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  log.info('Main window created successfully');
}

ipcMain.handle('get-agent-status', () => {
  return getAgentStatus();
});

ipcMain.handle('update-tray-status', (_, status: 'running' | 'stopped' | 'installing' | 'error' | 'not_installed') => {
  updateTrayMenu(status);
  return { success: true };
});

ipcMain.handle('show-error-dialog', async (_, options: { title: string; message: string }) => {
  if (!mainWindow) return { response: 0 };
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'error',
    title: options.title,
    message: options.message,
    buttons: ['Retry', 'Cancel'],
    defaultId: 0,
  });
  return { response: result.response };
});

ipcMain.handle('install-agent', async () => {
  updateTrayMenu('installing');
  try {
    const result = await installHermesAgent({
      onProgress: (progress) => {
        mainWindow?.webContents.send('installation-progress', progress);
      },
    });
    const status = getAgentStatus();
    mainWindow?.webContents.send('agent-status-change', status);
    updateTrayMenu(status.status);
    return result;
  } catch (err) {
    const status = getAgentStatus();
    mainWindow?.webContents.send('agent-status-change', { ...status, status: 'error' });
    updateTrayMenu('error');
    return { success: false, error: String(err) };
  }
});

ipcMain.handle('deploy-agent', async () => {
  const result = await deployAgent();
  const status = getAgentStatus();
  mainWindow?.webContents.send('agent-status-change', status);
  updateTrayMenu(status.status);
  return result;
});

ipcMain.handle('stop-agent', async () => {
  const result = await stopAgent();
  const status = getAgentStatus();
  mainWindow?.webContents.send('agent-status-change', status);
  updateTrayMenu(status.status);
  return result;
});

ipcMain.handle('restart-agent', async () => {
  const result = await restartAgent();
  const status = getAgentStatus();
  mainWindow?.webContents.send('agent-status-change', status);
  updateTrayMenu(status.status);
  return result;
});

ipcMain.handle('get-agent-logs', async (_, lines: number) => {
  return await getAgentLogs(lines);
});

(app as any).isQuitting = false;

app.on('before-quit', () => {
  (app as any).isQuitting = true;
});

app.whenReady().then(() => {
  log.info('App is ready');
  createWindow();
  createTray();
  startHealthCheck((status) => {
    mainWindow?.webContents.send('agent-status-change', status);
    if (status.status !== 'installing') {
      updateTrayMenu(status.status);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  } else {
    mainWindow.show();
  }
});

log.info('Main process initialized');
