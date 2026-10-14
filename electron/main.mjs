import { app, BrowserWindow, Tray, Menu, nativeImage, globalShortcut, session } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import http from 'node:http'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let mainWindow = null
let tray = null
let bridgeProcess = null
let viteProcess = null
let isQuitting = false

const isDev = !app.isPackaged || process.env.NODE_ENV === 'development'
const BRIDGE_PORT = 8787
const FRONTEND_PORT = 5173

import fs from 'node:fs'

// Load .env.local if present
function loadLocalEnv() {
  const envPath = path.join(__dirname, '..', '.env.local')
  const envVars = {}
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx > 0) {
        const k = trimmed.slice(0, idx).trim()
        const v = trimmed.slice(idx + 1).trim()
        envVars[k] = v
      }
    }
  }
  return envVars
}

const localEnv = loadLocalEnv()

// Start the bridge (Node backend)
function startBridge() {
  const bridgePath = path.join(__dirname, '..', 'bridge', 'server.mjs')
  console.log('[Electron] Starting bridge server from:', bridgePath)

  bridgeProcess = spawn(process.execPath, [bridgePath], {
    env: {
      ...process.env,
      ...localEnv,
      ELECTRON_RUN_AS_NODE: '1',
      JARVIS_ALLOWED_ORIGINS: `http://localhost:${FRONTEND_PORT},http://127.0.0.1:${FRONTEND_PORT}`,
      JARVIS_ALLOW_NO_ORIGIN: '1',
    },
    stdio: 'inherit',
  })

  bridgeProcess.on('exit', (code) => {
    console.log(`[Electron] Bridge exited with code ${code}`)
  })
}

// Start Vite preview/server in dev or serve statically
function startDevServer() {
  if (isDev) {
    const viteBin = path.join(__dirname, '..', 'node_modules', 'vite', 'bin', 'vite.js')
    viteProcess = spawn(process.execPath, [viteBin, '--port', String(FRONTEND_PORT)], {
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
      },
      stdio: 'inherit',
    })
  }
}

function waitForServer(url, timeout = 30000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const check = () => {
      http
        .get(url, (res) => {
          if (res.statusCode && res.statusCode < 500) {
            resolve(true)
          } else {
            retry()
          }
        })
        .on('error', retry)
    }

    const retry = () => {
      if (Date.now() - start > timeout) {
        reject(new Error(`Timeout waiting for ${url}`))
      } else {
        setTimeout(check, 300)
      }
    }

    check()
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'Framio Jarvis AI',
    backgroundColor: '#05070a',
    frame: true,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webgl: true,
      backgroundThrottling: false, // Keep voice listening alive even in background
    },
  })

  // Grant microphone & camera permissions automatically
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true)
      return
    }
    callback(false)
  })
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    if (permission === 'media') return true
    return false
  })
  session.defaultSession.setDevicePermissionHandler((details) => {
    if (details.deviceType === 'media') return true
    return false
  })

  const loadUrl = `http://localhost:${FRONTEND_PORT}`
  mainWindow.loadURL(loadUrl)

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Minimize to tray instead of quitting
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow.hide()
      if (tray) {
        tray.displayBalloon?.({
          title: 'Framio Jarvis AI',
          content: 'Jarvis arka planda çalışmaya devam ediyor.',
        })
      }
    }
  })
}

function createTray() {
  // Simple 16x16 transparent/colored icon or default app icon
  const icon = nativeImage.createFromPath(path.join(__dirname, '..', 'public', 'favicon.svg'))
  tray = new Tray(icon.isEmpty() ? nativeImage.createEmpty() : icon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Framio Jarvis\'i Göster',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      },
    },
    {
      label: 'Gizle',
      click: () => {
        if (mainWindow) mainWindow.hide()
      },
    },
    { type: 'separator' },
    {
      label: 'Çıkış',
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])

  tray.setToolTip('Framio Jarvis AI')
  tray.setContextMenu(contextMenu)

  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })
}

app.whenReady().then(async () => {
  startBridge()
  if (isDev) {
    startDevServer()
  }

  // Global hotkey to toggle window (Ctrl + Space or Alt + J)
  globalShortcut.register('CommandOrControl+Alt+J', () => {
    if (mainWindow) {
      if (mainWindow.isVisible() && mainWindow.isFocused()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })

  try {
    await waitForServer(`http://localhost:${FRONTEND_PORT}`)
    createWindow()
    createTray()
  } catch (err) {
    console.error('Failed to connect to dev server:', err)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('will-quit', () => {
  isQuitting = true
  globalShortcut.unregisterAll()
  if (bridgeProcess) bridgeProcess.kill()
  if (viteProcess) viteProcess.kill()
})
