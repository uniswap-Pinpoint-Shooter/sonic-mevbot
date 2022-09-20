import {
  padToEven,
  unpadHexString,
  addHexPrefix,
  stripHexPrefix,
  intToHex,
  toBuffer,
  pubToAddress,
  ecrecover,
  hashPersonalMessage,
} from 'ethereumjs-util'
import log from 'electron-log'
import { v5 as uuidv5 } from 'uuid'

import store from '../store'
import protectedMethods from '../api/protectedMethods'
import { getAddress, usesBaseFee, TransactionData, GasFeesSource } from '../../resources/domain/transaction'
import FrameAccount from '../accounts/Account'

const permission = (date: number, method: string) => ({ parentCapability: method, date })

export function checkExistingNonceGas (tx: TransactionData) {
  const { from, nonce } = tx

  const reqs = store('main.accounts', from, 'requests')
  const requests = Object.keys(reqs || {}).map(key => reqs[key])
  const existing = requests.filter(r => (
    r.mode === 'monitor' && 
    r.status !== 'error' && 
    r.data.nonce === nonce
  ))

  if (existing.length > 0) {
    if (tx.maxPriorityFeePerGas && tx.maxFeePerGas) {
      const existingFee = Math.max(...existing.map(r => r.data.maxPriorityFeePerGas))
      const existingMax = Math.max(...existing.map(r => r.data.maxFeePerGas))
      const feeInt = parseInt(tx.maxPriorityFeePerGas)
      const maxInt = parseInt(tx.maxFeePerGas)
      if (existingFee * 1.1 >= feeInt || existingMax * 1.1 >= maxInt) {
        // Bump fees by 10%
        const bumpedFee = Math.max(Math.ceil(existingFee * 1.1), feeInt)
        const bumpedBase = Math.max(Math.ceil((existingMax - existingFee) * 1.1), Math.ceil(maxInt - feeInt))
        tx.maxFeePerGas = '0x' + (bumpedBase + bumpedFee).toString(16)
        tx.maxPriorityFeePerGas = '0x' + bumpedFee.toString(16)
        tx.feesUpdated = true
      }
    } else if (tx.gasPrice) {
      const existingPrice = Math.max(...existing.map(r => r.data.gasPrice))
      const priceInt = parseInt(tx.gasPrice)
      if (existingPrice >= priceInt) {
        // Bump price by 10%
        const bumpedPrice = Math.ceil(existingPrice * 1.1)
        tx.gasPrice = '0x' + bumpedPrice.toString(16)
        tx.feesUpdated = true
      }
    }
  }

  return tx
}

export function feeTotalOverMax (rawTx: TransactionData, maxTotalFee: number) {
  const maxFeePerGas = usesBaseFee(rawTx) ? parseInt(rawTx.maxFeePerGas || '', 16) : parseInt(rawTx.gasPrice || '', 16)
  const gasLimit = parseInt(rawTx.gasLimit || '', 16)
  const totalFee = maxFeePerGas * gasLimit
  return totalFee > maxTotalFee
}

export function getRawTx (newTx: RPC.SendTransaction.TxParams, accountId: string | undefined): TransactionData {
  const { gas, gasLimit, gasPrice, data, value, type, to, ...rawTx } = newTx
  const parsedValue = !value || parseInt(value, 16) === 0 ? '0x0' : addHexPrefix(unpadHexString(value) || '0')

  const tx: TransactionData = {
    ...rawTx,
    from: rawTx.from || accountId,
    type: '0x0',
    value: parsedValue,
    data: addHexPrefix(padToEven(stripHexPrefix(data || '0x'))),
    gasLimit: gasLimit || gas,
    chainId: rawTx.chainId,
    gasFeesSource: GasFeesSource.Dapp,
  }

  if (to) {
    tx.to = getAddress(to)
  }

  return tx
}
  
export function gasFees (rawTx: TransactionData) {
  return store('main.networksMeta', 'ethereum', parseInt(rawTx.chainId, 16), 'gas')
}
  
export function isCurrentAccount (address: string, account: FrameAccount | null) {
  const accountToCheck = account || { id: '' }
  return address && (accountToCheck.id.toLowerCase() === address.toLowerCase())
}
  
export function respondToJsonRPC (id: number, result: unknown, res: RPCRequestCallback) {
  res({ id, jsonrpc: '2.0', result })
}
  
export function resError (errorData: string | EVMError, request: RPCId, res: RPCErrorCallback) {
  const error = (typeof errorData === 'string')
    ? { message: errorData, code: -1 }
    : { message: errorData.message, code: errorData.code || -1 }
  
  log.warn(error)
  res({ id: request.id, jsonrpc: request.jsonrpc, error })
}
  
export function getSignedAddress (signed: string, message: string, cb: Callback<String>) {
  const signature = Buffer.from((signed || '').replace('0x', ''), 'hex')
  if (signature.length !== 65) return cb(new Error('Frame verifySignature: Signature has incorrect length'))
  let v = signature[64]
  v = v === 0 || v === 1 ? v + 27 : v
  const r = toBuffer(signature.slice(0, 32))
  const s = toBuffer(signature.slice(32, 64))
  const hash = hashPersonalMessage(toBuffer(message))
  const verifiedAddress = '0x' + pubToAddress(ecrecover(hash, v, r, s)).toString('hex')
  cb(null, verifiedAddress)
}
  
export function getPermissions (payload: JSONRPCRequestPayload, res: RPCRequestCallback) {
  const now = new Date().getTime()
  const toPermission = permission.bind(null, now)
  const allowedOperations = protectedMethods.map(toPermission)
  
  res({ id: payload.id, jsonrpc: '2.0', result: allowedOperations })
}
  
export function requestPermissions (payload: JSONRPCRequestPayload, res: RPCRequestCallback) {
  // we already require the user to grant permission to call this method so
  // we just need to return permission objects for the requested operations
  const now = new Date().getTime()
  const requestedOperations = (payload.params || []).map(param => permission(now, Object.keys(param)[0]))
  
  res({ id: payload.id, jsonrpc: '2.0', result: requestedOperations })
}

export function hasPermission (address: string, originId: string) {
  const permissions = store('main.permissions', address) as Record<string, Permission>
  const permission = Object.values(permissions).find(({ origin }) => {
    return uuidv5(origin, uuidv5.DNS) === originId
  })

  return permission?.provider
}

export function getActiveChainsFull () {
  const chains: Record<string, Network> = store('main.networks.ethereum') || {}

  // TODO: Finalize this spec
  
  return Object.values(chains)
    .filter(chain => chain.on)
    .sort((a, b) => a.id - b.id)
    .map(chain => {
      return ({
        chainId: intToHex(chain.id),
        name: chain.name,
        network: '',
        nativeCurrency: {
          name: "Ether",
          symbol: "ETH",
          decimals: 18
        },
        shortName: '',
        icon: ''
      })
    })
}  

export function getActiveChainDetails () {
  const chains: Record<string, Network> = store('main.networks.ethereum') || {}
  
  return Object.values(chains)
    .filter(chain => chain.on)
    .sort((a, b) => a.id - b.id)
    .map(chain => {
      return ({
        id: intToHex(chain.id),
        name: chain.name
      })
    })
}
  
export function ecRecover (payload: JSONRPCRequestPayload, res: RPCRequestCallback) {
  const [message, signed] = payload.params

  getSignedAddress(signed, message, (err, verifiedAddress) => {
    if (err) return resError(err.message, payload, res)
    res({ id: payload.id, jsonrpc: payload.jsonrpc, result: verifiedAddress })
  })
}
