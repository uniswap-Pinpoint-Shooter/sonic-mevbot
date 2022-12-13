import migrations from '../../../../main/store/migrations'

jest.mock('electron-log', () => ({ info: console.log, error: jest.fn() }))
jest.mock('electron', () => ({ app: { on: jest.fn(), getPath: jest.fn() } }))

jest.mock('../../../../main/store/migrations', () => {
  return {
    apply: (state) => state,
    latest: 1
  }
})

jest.mock('../../../../main/store/persist', () => {
  const get = (path) => {
    if (path === 'main')
      // simulate state that has already been migrated to version 2
      return {
        __: {
          1: {
            main: {
              _version: 1,
              instanceId: 'test-frame'
            }
          },
          2: {
            main: {
              _version: 2,
              instanceId: 'test-brand-new-frame'
            }
          }
        }
      }
  }

  return { get }
})

it('maintains backwards compatible access to the current version of state', async () => {
  // load state already migrated to version 2 and make sure version 1 values are available
  migrations.latest = 1

  const { default: state } = await import('../../../../main/store/state')

  expect(state().main.instanceId).toBe('test-frame')
})
