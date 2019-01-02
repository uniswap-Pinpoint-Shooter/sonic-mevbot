const { shell } = require('electron')
const { autoUpdater } = require('electron-updater')
const https = require('https')
const log = require('electron-log')
const version = require('../../package.json').version
const windows = require('../windows')

const dev = process.env.NODE_ENV === 'development'

const compareVersions = (a, b) => {
  var pa = a.split('.')
  var pb = b.split('.')
  for (var i = 0; i < 3; i++) {
    var na = Number(pa[i])
    var nb = Number(pb[i])
    if (na > nb) return 1
    if (nb > na) return -1
    if (!isNaN(na) && isNaN(nb)) return 1
    if (isNaN(na) && !isNaN(nb)) return -1
  }
  return 0
}

const checkErr = (err) => log.error('Error checking latest version:', err)
const options = { host: 'api.github.com', path: '/repos/floating/frame/releases', headers: { 'User-Agent': 'request' } }

autoUpdater.allowPrerelease = true
autoUpdater.autoDownload = false

autoUpdater.on('error', err => {
  log.error(' > Auto Update Error: ' + err.message)
  updater.checkManualUpdate()
})

autoUpdater.on('update-available', (r) => { //  Ask if they want to download it
  log.info(' > autoUpdated found that an update is available...')
  updater.updateAvailable(r.version, 'auto')
})

autoUpdater.on('update-not-available', () => {
  log.info(' > autoUpdate found no updates, check manually')
  updater.checkManualUpdate()
})

autoUpdater.on('update-downloaded', res => {
  if (!updater.updatePending) updater.updateReady()
  updater.updatePending = true
})

const updater = {
  updatePending: false,
  availableUpdate: '',
  updateAvailable: (version, location) => { // An update is available
    this.availableUpdate = location
    if (!updater.notified[version]) windows.broadcast('main:action', 'updateBadge', 'updateAvailable')
    updater.notified[version] = true
  },
  updateReady: () => { // An update is ready
    windows.broadcast('main:action', 'updateBadge', 'updateReady')
  },
  installAvailableUpdate: (install) => {
    if (install) {
      if (this.availableUpdate === 'auto') {
        autoUpdater.downloadUpdate()
      } else if (this.availableUpdate.startsWith('https')) {
        shell.openExternal(this.availableUpdate)
      }
    }
    windows.broadcast('main:action', 'updateBadge', '')
    this.availableUpdate = ''
  },
  quitAndInstall: (...args) => {
    if (updater.updatePending) autoUpdater.quitAndInstall(...args)
  },
  notified: {},
  checkManualUpdate: () => {
    https.get(options, res => {
      let rawData = ''
      res.on('data', chunk => { rawData += chunk })
      res.on('end', () => {
        try {
          let releases = JSON.parse(rawData)
          if (!updater.notified[releases[0].tag_name]) {
            log.info('Updater: User has not been notified of this version yet')
            if (compareVersions(releases[0].tag_name, version) === 1) {
              log.info('Updater: Current version is behind latest, notify user')
              updater.updateAvailable(releases[0].tag_name, releases[0].html_url)
            }
          }
        } catch (err) { checkErr(err) }
      })
    }).on('error', checkErr)
  }
}

if (!dev) {
  if (process.platform === 'darwin' || process.platform === 'win32') {
    setTimeout(() => {
      autoUpdater.checkForUpdates()
      setInterval(() => autoUpdater.checkForUpdates(), 30 * 1000)
    }, 2000)
  } else {
    setTimeout(() => {
      updater.checkManualUpdate()
      setInterval(() => updater.checkManualUpdate(), 30 * 1000)
    }, 2000)
  }
}

module.exports = updater
