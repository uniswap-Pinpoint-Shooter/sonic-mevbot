import { app, BrowserWindow, ipcMain, screen, globalShortcut, IpcMainEvent, WebContents } from 'electron'
import path from 'path'
import log from 'electron-log'
import EventEmitter from 'events'
import { hexToInt } from '../../resources/utils'

import store from '../store'
import FrameManager from './frames'
import { createWindow } from './window'
import {
  hasRecentClick as systemTrayHasRecentClick,
  setTitle as setSystemTrayTitle,
  init as initSystemTray,
  closeContextMenu,
  setContextMenu
} from './systemTray'

type Windows = { [key: string]: BrowserWindow }

const events = new EventEmitter()
const frameManager = new FrameManager()
const isDev = process.env.NODE_ENV === 'development'
const fullheight = !!process.env.FULL_HEIGHT
const openedAtLogin = app && app.getLoginItemSettings() && app.getLoginItemSettings().wasOpenedAtLogin
const windows: Windows = {}
const showOnReady = true
const trayWidth = 400
const devHeight = 800

let tray: Tray
let dash: Dash
let dawn: Dawn
let mouseTimeout: NodeJS.Timeout
let glide = false
let dashHiddenByAppHide = false

const enableHMR = isDev && process.env.HMR === 'true'

const menuClickHandlers = {
  hide: () => {
    tray.hide()
    if (dash.isVisible()) {
      dashHiddenByAppHide = true
      dash.hide()
    }
  },
  show: () => {
    tray.show()
    if (dashHiddenByAppHide) {
      dashHiddenByAppHide = false
      dash.show()
    }
  }
}
const getDisplaySummonShortcut = () => store('main.shortcuts.altSlash')

const topRight = (window: BrowserWindow) => {
  const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea
  const screenSize = area
  const windowSize = window.getSize()
  return {
    x: Math.floor(screenSize.x + screenSize.width - windowSize[0]),
    y: screenSize.y
  }
}

const detectMouse = () => {
  const m1 = screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(m1)
  const area = display.workArea
  const bounds = display.bounds
  const minX = area.width + area.x - 2
  const center = (area.height + (area.y - bounds.y)) / 2
  const margin = (area.height + (area.y - bounds.y)) / 2 - 5
  m1.y = m1.y - area.y
  const minY = center - margin
  const maxY = center + margin
  mouseTimeout = setTimeout(() => {
    if (m1.x >= minX && m1.y >= minY && m1.y <= maxY) {
      const m2 = screen.getCursorScreenPoint()
      const area = screen.getDisplayNearestPoint(m2).workArea
      m2.y = m2.y - area.y
      if (m2.x >= minX && m2.y === m1.y) {
        glide = true
        tray.show()
      } else {
        detectMouse()
      }
    } else {
      detectMouse()
    }
  }, 50)
}

function initWindow(id: string, opts: Electron.BrowserWindowConstructorOptions) {
  const windowDir = id === 'tray' ? 'app' : id
  const url = enableHMR
    ? `http://localhost:1234/${windowDir}/${id}.dev.html`
    : new URL(path.join(process.env.BUNDLE_LOCATION, `${id}.html`), 'file:')

  windows[id] = createWindow(id, opts)
  windows[id].loadURL(url.toString())
}

function initTrayWindow() {
  initWindow('tray', {
    width: trayWidth,
    icon: path.join(__dirname, './AppIcon.png')
  })

  windows.tray.on('closed', () => delete windows.tray)
  windows.tray.webContents.session.setPermissionRequestHandler((webContents, permission, res) => res(false))
  windows.tray.setResizable(false)
  windows.tray.setMovable(false)
  windows.tray.setSize(0, 0)

  const { width, height, x, y } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea
  windows.tray.setPosition(width + x, height + y)

  windows.tray.on('show', () => {
    if (process.platform === 'win32') {
      closeContextMenu()
    }
    setTimeout(() => {
      setContextMenu('hide', menuClickHandlers, getDisplaySummonShortcut())
    }, 100)
  })
  windows.tray.on('hide', () => {
    if (process.platform === 'win32') {
      closeContextMenu()
    }
    setTimeout(() => {
      setContextMenu('show', menuClickHandlers, getDisplaySummonShortcut())
    }, 100)
  })

  setTimeout(() => {
    windows.tray.on('focus', () => tray.show())
  }, 2000)

  if (isDev) {
    windows.tray.webContents.openDevTools()
  }

  setTimeout(() => {
    windows.tray.on('blur', () => {
      setTimeout(() => {
        if (tray.canAutoHide()) {
          tray.hide(true)
        }
      }, 100)
    })
    windows.tray.focus()
  }, 1260)

  windows.tray.once('ready-to-show', () => {
    if (!openedAtLogin) {
      tray.show()
    }
  })

  setTimeout(() => {
    screen.on('display-added', () => tray.hide())
    screen.on('display-removed', () => tray.hide())
    screen.on('display-metrics-changed', () => tray.hide())
  }, 30 * 1000)
}

export class Tray {
  private recentAutohide = false
  private recentAutoHideTimeout?: NodeJS.Timeout
  private gasObserver: Observer
  private ready: boolean
  private readyHandler: () => void

  constructor() {
    this.ready = false
    this.gasObserver = store.observer(() => {
      let title = ''
      if (store('platform') === 'darwin' && store('main.menubarGasPrice')) {
        const gasPrice = store('main.networksMeta.ethereum', 1, 'gas.price.levels.fast')
        if (!gasPrice) return
        const gasDisplay = Math.round(hexToInt(gasPrice) / 1000000000).toString()
        title = gasDisplay // ɢ 🄶 Ⓖ ᴳᵂᴱᴵ
      }
      setSystemTrayTitle(title)
    })
    this.readyHandler = () => {
      initSystemTray(this.toggle)
      if (showOnReady) {
        store.trayOpen(true)
      }
      this.ready = true
      if (store('windows.dash.showing')) {
        setTimeout(() => {
          dash.show()
        }, 300)
      }
      if (dawn) {
        setTimeout(() => {
          dawn.show()
        }, 600)
      }
    }
    ipcMain.on('tray:ready', this.readyHandler)
    initTrayWindow()
  }

  isReady() {
    return this.ready
  }

  isVisible() {
    return (windows.tray as BrowserWindow).isVisible()
  }

  canAutoHide() {
    return (
      !systemTrayHasRecentClick() &&
      store('main.autohide') &&
      !store('windows.dash.showing') &&
      !frameManager.isFrameShowing()
    )
  }

  hide(autohide: boolean = false) {
    store.toggleDash('hide')
    if (autohide) {
      this.recentAutohide = true
      clearTimeout(this.recentAutoHideTimeout as NodeJS.Timeout)
      this.recentAutoHideTimeout = setTimeout(() => {
        this.recentAutohide = false
      }, 50)
    }

    if (windows && windows.tray) {
      store.trayOpen(false)
      if (store('main.reveal')) {
        detectMouse()
      }
      windows.tray.emit('hide')
      windows.tray.hide()
      events.emit('tray:hide')
    }
  }

  public show() {
    clearTimeout(mouseTimeout)
    if (!windows.tray) {
      return init()
    }
    // windows.tray.setPosition(0, 0)
    windows.tray.setAlwaysOnTop(true)
    windows.tray.setVisibleOnAllWorkspaces(true, {
      visibleOnFullScreen: true,
      skipTransformProcessType: true
    })
    windows.tray.setResizable(false) // Keeps height consistent
    const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea
    const height = isDev && !fullheight ? devHeight : area.height
    windows.tray.setMinimumSize(trayWidth, height)
    windows.tray.setSize(trayWidth, height)
    windows.tray.setMaximumSize(trayWidth, height)
    const pos = topRight(windows.tray)
    windows.tray.setPosition(pos.x, pos.y)
    if (!glide) {
      windows.tray.focus()
    }
    store.trayOpen(true)
    windows.tray.emit('show')
    windows.tray.show()
    events.emit('tray:show')
    if (windows && windows.tray && windows.tray.focus && !glide) {
      windows.tray.focus()
    }
    windows.tray.setVisibleOnAllWorkspaces(false, {
      visibleOnFullScreen: true,
      skipTransformProcessType: true
    })
  }

  toggle() {
    if (!this.isReady() || this.recentAutohide) return

    this.isVisible() ? this.hide() : this.show()
  }

  destroy() {
    this.gasObserver.remove()
    ipcMain.off('tray:ready', this.readyHandler)
  }
}

class Dash {
  constructor() {
    initWindow('dash', {
      width: trayWidth
    })
  }

  public hide() {
    if (windows.dash && windows.dash.isVisible()) {
      windows.dash.hide()
    }
  }

  public show() {
    if (!tray.isReady()) {
      return
    }
    setTimeout(() => {
      windows.dash.setAlwaysOnTop(true)
      windows.dash.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true,
        skipTransformProcessType: true
      })
      windows.dash.setResizable(false) // Keeps height consistent
      const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea
      const height = isDev && !fullheight ? devHeight : area.height
      windows.dash.setMinimumSize(trayWidth, height)
      windows.dash.setSize(trayWidth, height)
      windows.dash.setMaximumSize(trayWidth, height)
      const { x, y } = topRight(windows.dash)
      windows.dash.setPosition(x - trayWidth - 5, y)
      windows.dash.show()
      windows.dash.focus()
      windows.dash.setVisibleOnAllWorkspaces(false, {
        visibleOnFullScreen: true,
        skipTransformProcessType: true
      })
      if (isDev) {
        windows.dash.webContents.openDevTools()
      }
    }, 10)
  }

  isVisible() {
    return (windows.dash as BrowserWindow).isVisible()
  }
}

class Dawn {
  constructor() {
    initWindow('dawn', {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      titleBarStyle: 'hidden',
      trafficLightPosition: { x: 10, y: 9 },
      icon: path.join(__dirname, './AppIcon.png')
    })
  }

  public hide() {
    if (windows.dawn && windows.dawn.isVisible()) {
      windows.dawn.hide()
    }
  }

  public show() {
    log.warn('loading dawn url', tray.isReady())
    if (!tray.isReady()) {
      return
    }
    setTimeout(() => {
      windows.dawn.on('ready-to-show', () => {
        windows.dawn.show()
      })

      const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea
      const height = area.height - 160
      const maxWidth = Math.floor(height * 1.24)
      const targetWidth = area.width - 460
      const width = targetWidth > maxWidth ? maxWidth : targetWidth
      windows.dawn.setMinimumSize(400, 300)
      windows.dawn.setSize(width, height)
      const pos = topRight(windows.dawn)
      windows.dawn.setPosition(pos.x - 440, pos.y + 80)
      windows.dawn.setAlwaysOnTop(true)
      windows.dawn.show()
      windows.dawn.focus()
      windows.dawn.setVisibleOnAllWorkspaces(false, {
        visibleOnFullScreen: true,
        skipTransformProcessType: true
      })
      if (isDev) {
        windows.dawn.webContents.openDevTools()
      }
    }, 10)
  }
}

ipcMain.on('tray:quit', () => app.quit())
ipcMain.on('tray:mouseout', () => {
  if (glide && !store('windows.dash.showing')) {
    glide = false
    tray.hide()
  }
})

// deny navigation, webview attachment & new windows on creation of webContents
// also set elsewhere but enforced globally here to minimize possible vectors of attack
// - in the case of e.g. dependency injection
// - as a 'to be sure' against possibility of misconfiguration in the future
app.on('web-contents-created', (_e, contents) => {
  contents.on('will-navigate', (e) => e.preventDefault())
  contents.on('will-attach-webview', (e) => e.preventDefault())
  contents.setWindowOpenHandler(() => ({ action: 'deny' }))
})

app.on('ready', () => {
  frameManager.start()
})

if (isDev) {
  app.on('ready', () => {
    globalShortcut.register('CommandOrControl+R', () => {
      Object.keys(windows).forEach((win) => {
        windows[win].reload()
      })

      frameManager.reloadFrames()
    })
  })
}

ipcMain.on('*:contextmenu', (e, x, y) => {
  if (isDev) {
    e.sender.inspectElement(x, y)
  }
})

const windowFromWebContents = (webContents: WebContents) =>
  BrowserWindow.fromWebContents(webContents) as BrowserWindow

const init = () => {
  if (tray) {
    tray.destroy()
  }
  tray = new Tray()
  dash = new Dash()
  if (!store('main.mute.onboardingWindow')) {
    dawn = new Dawn()
  }
}

const send = (id: string, channel: string, ...args: string[]) => {
  if (windows[id] && !windows[id].isDestroyed()) {
    windows[id].webContents.send(channel, ...args)
  } else {
    log.error(new Error(`A window with id "${id}" does not exist (windows.send)`))
  }
}

const broadcast = (channel: string, ...args: string[]) => {
  Object.keys(windows).forEach((id) => send(id, channel, ...args))
  frameManager.broadcast(channel, args)
}

// Data Change Events
store.observer(() => broadcast('permissions', JSON.stringify(store('permissions'))))
store.observer(() => {
  const displaySummonShortcut = store('main.shortcuts.altSlash')
  if (tray?.isReady()) {
    setContextMenu(tray.isVisible() ? 'hide' : 'show', menuClickHandlers, displaySummonShortcut)
  }
})

store.api.feed((_state, actions) => {
  actions.forEach((action) => {
    action.updates.forEach((update) => {
      broadcast('main:action', 'pathSync', update.path, update.value)
    })
  })
})

export default {
  toggleTray() {
    tray.toggle()
  },
  showTray() {
    tray.show()
  },
  showDash() {
    dash.show()
  },
  hideDawn() {
    dawn.hide()
  },
  hideDash() {
    dash.hide()
  },
  focusTray() {
    windows.tray.focus()
  },
  refocusFrame(frameId: string) {
    frameManager.refocus(frameId)
  },
  close(e: IpcMainEvent) {
    windowFromWebContents(e.sender).close()
  },
  max(e: IpcMainEvent) {
    windowFromWebContents(e.sender).maximize()
  },
  unmax(e: IpcMainEvent) {
    windowFromWebContents(e.sender).unmaximize()
  },
  min(e: IpcMainEvent) {
    windowFromWebContents(e.sender).minimize()
  },
  send,
  broadcast,
  init
}
