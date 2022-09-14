import log from 'electron-log'
import nock from 'nock'

import { fetchSourcifyContract } from '../../../main/contracts/sourcifyContract'

function mockApiResponse (domain, path, status, body, delay = 0, headers = { 'content-type': 'application/json' }) {
  nock(`https://${domain}`)
    .get(path)
    .delay(delay)
    .reply(status, body, headers)
}

const mockAbi = [
  { 
    inputs: [],
    name: 'retrieve',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  },
  { 
    inputs:[{ internalType:'uint256', name: 'num', type:'uint256'}],
    name: 'store',
    outputs:[],
    stateMutability: 'nonpayable',
    type: 'function'
  }
]

const flushPromises = () => new Promise(jest.requireActual('timers').setImmediate)

const sourcifyResponse = {
  status: 'partial',
  files: [{
    name: 'metadata.json',
    path: '',
    content: JSON.stringify({
      output: {
        abi: mockAbi, 
        devdoc: { title: 'mock sourcify abi' }
      }
    })
  }]
}

const sourcifyNotFoundResponse = {
  error: 'Files have not been found!'
}

beforeAll(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] })
  nock.disableNetConnect()
  log.transports.console.level = false
})

afterAll(() => {
  nock.cleanAll()
  nock.enableNetConnect()
  log.transports.console.level = 'debug'
})

beforeEach(() => {
  // jest.spyOn(global, 'clearTimeout')  
})

describe('#fetchSourcifyContract', () => {
  const contractAddress = '0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0'
  const domain = 'sourcify.dev'
  const endpoint = `/server/files/any/137/${contractAddress}`

  const mockSourcifyApi = (status, response, delay) => {
    mockApiResponse(domain, endpoint, status, response, delay)
  }

  it('retrieves a contract from sourcify', async () => {
    mockSourcifyApi(200, sourcifyResponse)

    const contract = fetchSourcifyContract(contractAddress, '0x89')
    
    jest.advanceTimersByTime(0);

    return expect(contract).resolves.toStrictEqual({
      abi: JSON.stringify(mockAbi), 
      name: 'mock sourcify abi', 
      source: 'sourcify'
    })
  })

  it('does not retrieve a contract when the request fails', async () => {
    mockSourcifyApi(400)

    const contract = fetchSourcifyContract(contractAddress, '0x89')
    
    jest.advanceTimersByTime(0);

    return expect(contract).resolves.toBeUndefined()
  })

  it('does not retrieve a contract when the contract is not found', async () => {
    mockSourcifyApi(200, sourcifyNotFoundResponse)

    const contract = fetchSourcifyContract(contractAddress, '0x89')
    
    jest.advanceTimersByTime(0);

    return expect(contract).resolves.toBeUndefined()
  })

  it('does not retrieve a contract when the request times out', async () => {
   
    mockSourcifyApi(200, sourcifyNotFoundResponse, 10000)

    const contract = fetchSourcifyContract(contractAddress, '0x89')
    
    jest.advanceTimersByTime(5010)
    // jest.runOnlyPendingTimers()
    await flushPromises()

    return expect(contract).resolves.toBeUndefined()
  })
})
