import { v4 as generateUuid, v5 as uuidv5 } from 'uuid'
import { z } from 'zod'
import log from 'electron-log'

import persist from '../persist'
import migrations from '../migrate'

import { MainSchema } from './types/main'
import { chainDefaults } from './types/chain'
import { chainMetaDefaults } from './types/chainMeta'

export type { ChainId, Chain } from './types/chain'
export type { Connection } from './types/connection'
export type { Origin } from './types/origin'
export type { Permission } from './types/permission'
export type { HardwareSignerType, HotSignerType, SignerType, Signer } from './types/signer'
export type { Account, AccountMetadata } from './types/account'
export type { Balance } from './types/balance'
export type { InventoryAsset, InventoryCollection } from './types/inventory'
export type { WithTokenId, Token } from './types/token'
export type { Dapp } from './types/dapp'
export type { NativeCurrency } from './types/nativeCurrency'
export type { Gas, GasFees } from './types/gas'
export type { Rate } from './types/rate'
export type { Frame, ViewMetadata } from './types/frame'
export type { Shortcut, ShortcutKey, ModifierKey } from './types/shortcuts'
export type { ColorwayPalette } from './types/colors'

const StateSchema = z.object({
  main: MainSchema.passthrough(), // TODO: remove passthrough once all pieces of state have been defined
  windows: z.any(),
  view: z.any(),
  selected: z.any(),
  panel: z.any(),
  tray: z.any(),
  platform: z.string()
})

export type Migration = {
  version: number
  migrate: (initial: unknown) => any
}

const latestStateVersion = () => {
  // TODO: validate state and type it here?
  // TODO: what does this top-level state object look like?
  const state = persist.get('main') as any
  if (!state || !state.__) {
    // log.info('Persisted state: returning base state')
    return state
  }

  // valid states are less than or equal to the latest migration we know about
  const versions = Object.keys(state.__)
    .filter((v) => parseInt(v) <= migrations.latest)
    .sort((a, b) => parseInt(a) - parseInt(b))

  if (versions.length === 0) {
    // log.info('Persisted state: returning base state')
    return state
  }

  const latest = versions[versions.length - 1]
  // log.info('Persisted state: returning latest state version: ', latest)
  return state.__[latest].main
}

const get = (path: string, obj = latestStateVersion()) => {
  path.split('.').some((key) => {
    if (typeof obj !== 'object') {
      obj = undefined
    } else {
      obj = obj[key]
    }
    return obj === undefined // Stop navigating the path if we get to undefined value
  })
  return obj
}

const main = (path: string, def: any) => {
  const found = get(path)
  if (found === undefined) return def
  return found
}

const mainState = {
  _version: main('_version', 38),
  instanceId: main('instanceId', generateUuid()),
  colorway: main('colorway', 'dark'),
  colorwayPrimary: {
    dark: {
      background: 'rgb(26, 22, 28)',
      text: 'rgb(241, 241, 255)'
    },
    light: {
      background: 'rgb(240, 230, 243)',
      text: 'rgb(20, 40, 60)'
    }
  },
  mute: {
    alphaWarning: main('mute.alphaWarning', false),
    welcomeWarning: main('mute.welcomeWarning', false),
    externalLinkWarning: main('mute.externalLinkWarning', false),
    explorerWarning: main('mute.explorerWarning', false),
    signerRelockChange: main('mute.signerRelockChange', false),
    gasFeeWarning: main('mute.gasFeeWarning', false),
    betaDisclosure: main('mute.betaDisclosure', false),
    onboardingWindow: main('mute.onboardingWindow', false),
    migrateToPylon: main('mute.migrateToPylon', false),
    signerCompatibilityWarning: main('mute.signerCompatibilityWarning', false)
  },
  shortcuts: {
    altSlash: main('shortcuts.altSlash', true),
    summon: main('shortcuts.summon', {
      modifierKeys: ['Alt'],
      shortcutKey: 'Slash',
      enabled: true,
      configuring: false
    })
  },
  // showUSDValue: main('showUSDValue', true),
  launch: main('launch', false),
  reveal: main('reveal', false),
  showLocalNameWithENS: main('showLocalNameWithENS', false),
  autohide: main('autohide', false),
  accountCloseLock: main('accountCloseLock', false),
  hardwareDerivation: main('hardwareDerivation', 'mainnet'),
  menubarGasPrice: main('menubarGasPrice', false),
  lattice: main('lattice', {}),
  latticeSettings: {
    accountLimit: main('latticeSettings.accountLimit', 5),
    derivation: main('latticeSettings.derivation', 'standard'),
    endpointMode: main('latticeSettings.endpointMode', 'default'),
    endpointCustom: main('latticeSettings.endpointCustom', '')
  },
  ledger: {
    derivation: main('ledger.derivation', 'live'),
    liveAccountLimit: main('ledger.liveAccountLimit', 5)
  },
  trezor: {
    derivation: main('trezor.derivation', 'standard')
  },
  origins: main('origins', {}),
  knownExtensions: main('knownExtensions', {}),
  privacy: {
    errorReporting: main('privacy.errorReporting', true)
  },
  accounts: main('accounts', {}),
  accountsMeta: main('accountsMeta', {}),
  addresses: main('addresses', {}), // Should be removed after 0.5 release
  permissions: main('permissions', {}),
  balances: {},
  tokens: main('tokens', { custom: [], known: {} }),
  rates: {}, // main('rates', {}),
  inventory: {}, // main('rates', {}),
  signers: {},
  updater: {
    dontRemind: main('updater.dontRemind', [])
  },
  networks: main('networks', { ethereum: chainDefaults }),
  networksMeta: main('networksMeta', { ethereum: chainMetaDefaults }),
  dapps: main('dapps', {}),
  ipfs: {},
  frames: {},
  openDapps: [],
  dapp: {
    details: {},
    map: {
      added: [],
      docked: []
    },
    storage: {},
    removed: []
  }
}

const initial = {
  windows: {
    panel: {
      show: false,
      nav: [],
      footer: {
        height: 40
      }
    },
    dash: {
      show: false,
      nav: [],
      footer: {
        height: 40
      }
    },
    frames: []
  },
  panel: {
    // Panel view
    showing: false,
    nav: [],
    show: false,
    view: 'default',
    viewData: '',
    account: {
      moduleOrder: [
        'requests',
        // 'activity',
        // 'gas',
        'chains',
        'balances',
        'inventory',
        'permissions',
        // 'verify',
        'signer',
        'settings'
      ],
      modules: {
        requests: {
          height: 0
        },
        activity: {
          height: 0
        },
        balances: {
          height: 0
        },
        inventory: {
          height: 0
        },
        permissions: {
          height: 0
        },
        verify: {
          height: 0
        },
        gas: {
          height: 100
        }
      }
    }
  },
  view: {
    current: '',
    list: [],
    data: {},
    notify: '',
    notifyData: {},
    badge: '',
    addAccount: '', // Add view (needs to be merged into Phase)
    addNetwork: false, // Phase view (needs to be merged with Add)
    clickGuard: false
  },
  tray: {
    open: false,
    initial: true
  },
  selected: {
    minimized: true,
    open: false,
    current: '',
    view: 'default',
    settings: {
      viewIndex: 0,
      views: ['permissions', 'verify', 'control'],
      subIndex: 0
    },
    addresses: [],
    showAccounts: false,
    accountPage: 0,
    position: {
      scrollTop: 0,
      initial: {
        top: 5,
        left: 5,
        right: 5,
        bottom: 5,
        height: 5,
        index: 0
      }
    }
  },
  platform: process.platform,
  main: mainState
}

// --- remove state that should not persist from session to session

Object.keys(initial.main.accounts).forEach((id) => {
  // Remove permissions granted to unknown origins
  const permissions = initial.main.permissions[id]
  if (permissions) delete permissions[uuidv5('Unknown', uuidv5.DNS)]

  // remote lastUpdated timestamp from balances
  // TODO: define account schema more accurately
  initial.main.accounts[id].balances = { lastUpdated: undefined }
})

initial.main.knownExtensions = Object.fromEntries(
  Object.entries(initial.main.knownExtensions).filter(([_id, allowed]) => allowed)
)

// ---

export default function () {
  const migratedState = migrations.apply(initial)
  const result = StateSchema.safeParse(migratedState)

  if (!result.success) {
    const issues = result.error.issues
    log.warn(`Found ${issues.length} issues while parsing saved state`, issues)

    return migratedState
  }

  return result.data
}
