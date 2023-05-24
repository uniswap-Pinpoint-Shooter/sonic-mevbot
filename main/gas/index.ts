import { addHexPrefix, intToHex } from '@ethereumjs/util'
import log from 'electron-log'
import { BigNumber } from 'bignumber.js'

import { Block, estimateGasFees, feesToHex } from './calculator'
import { Provider } from '../provider'
import { Chain, GasFees } from '../store/state'
import { frameOriginId } from '../../resources/utils'
import { TransactionData } from '../../resources/domain/transaction'

interface FeeHistoryResponse {
  baseFeePerGas: string[]
  gasUsedRatio: number[]
  reward: Array<string[]>
  oldestBlock: string
}

interface GasPrices {
  slow: string
  standard: string
  fast: string
  asap: string
}

async function getGasPrices(provider: Provider): Promise<GasPrices> {
  const gasPrice = (await provider.send({
    id: 1,
    jsonrpc: '2.0',
    method: 'eth_gasPrice',
    params: [],
    _origin: frameOriginId
  })) as unknown as string

  // in the future we may want to have specific calculators to calculate variations
  // in the gas price or eliminate this structure altogether
  return {
    slow: gasPrice,
    standard: gasPrice,
    fast: gasPrice,
    asap: gasPrice
  }
}

// These chain IDs are known to not support EIP-1559 and will be forced
// not to use that mechanism
// TODO: create a more general chain config that can use the block number
// and ethereumjs/common to determine the state of various EIPs
// Note that Arbitrum is in the list because it does not currently charge priority fees
// https://support.arbitrum.io/hc/en-us/articles/4415963644955-How-the-fees-are-calculated-on-Arbitrum
const legacyChains = [250, 4002, 42161]

export const eip1559Allowed = (chainId: number) => !legacyChains.includes(chainId)

class DefaultGas {
  protected chainId: number
  protected provider: Provider
  protected feeMarket: GasFees | null = null

  constructor(chainId: number, provider: Provider) {
    this.chainId = chainId
    this.provider = provider
  }

  async getFeeHistory(
    numBlocks: number,
    rewardPercentiles: number[],
    newestBlock = 'latest'
  ): Promise<Block[]> {
    const blockCount = intToHex(numBlocks)
    const payload = { method: 'eth_feeHistory', params: [blockCount, newestBlock, rewardPercentiles] }

    const feeHistory = (await this.provider.send({
      ...payload,
      id: 1,
      jsonrpc: '2.0',
      _origin: frameOriginId
    })) as unknown as FeeHistoryResponse

    const feeHistoryBlocks = feeHistory.baseFeePerGas.map((baseFee, i) => {
      return {
        baseFee: parseInt(baseFee, 16),
        gasUsedRatio: feeHistory.gasUsedRatio[i],
        rewards: (feeHistory.reward[i] || []).map((reward) => parseInt(reward, 16))
      }
    })

    return feeHistoryBlocks
  }

  protected async calculateFees(block: Block) {
    if (eip1559Allowed(this.chainId) && 'baseFeePerGas' in block) {
      try {
        // only consider this an EIP-1559 block if fee market can be loaded
        const feeHistory = await this.getFeeHistory(10, [10])
        const estimatedGasFees = estimateGasFees(feeHistory)

        this.feeMarket = feesToHex(estimatedGasFees)
      } catch (e) {
        this.feeMarket = null
      }
    }

    return this.feeMarket
  }

  protected async getGasPrices() {
    let gasPrice

    try {
      if (this.feeMarket) {
        const gasPriceBN = BigNumber(this.feeMarket.maxBaseFeePerGas).plus(
          BigNumber(this.feeMarket.maxPriorityFeePerGas)
        )
        gasPrice = { fast: addHexPrefix(gasPriceBN.toString(16)) }
      } else {
        gasPrice = await getGasPrices(this.provider)
      }
    } catch (e) {
      log.error(`could not fetch gas prices for chain ${this.chainId}`, { feeMarket: this.feeMarket }, e)
    }

    return gasPrice
  }

  async getGas(block: Block) {
    const feeMarket = await this.calculateFees(block)
    const gasPrice = await this.getGasPrices()

    return { feeMarket, gasPrice }
  }

  async getGasEstimate(rawTx: TransactionData) {
    const { from, to, value, data, nonce } = rawTx
    const txParams = { from, to, value, data, nonce }

    const payload: JSONRPCRequestPayload = {
      method: 'eth_estimateGas',
      params: [txParams],
      jsonrpc: '2.0',
      id: 1
    }
    const targetChain = {
      type: 'ethereum',
      id: parseInt(rawTx.chainId, 16)
    }

    return new Promise<string>((resolve, reject) => {
      this.provider.connection.send(
        payload,
        (response) => {
          if (response.error) {
            log.warn(`error estimating gas for tx to ${txParams.to}: ${response.error}`)
            return reject(response.error)
          }

          const estimatedLimit = parseInt(response.result, 16)
          const paddedLimit = Math.ceil(estimatedLimit * 1.5)

          log.verbose(
            `gas estimate for tx to ${txParams.to}: ${estimatedLimit}, using ${paddedLimit} as gas limit`
          )
          return resolve(addHexPrefix(paddedLimit.toString(16)))
        },
        targetChain as Chain
      )
    })
  }
}

class PolygonGas extends DefaultGas {
  async calculateFees(block: Block) {
    if ('baseFeePerGas' in block) {
      try {
        const feeHistory = await this.getFeeHistory(10, [10])
        const estimatedGasFees = estimateGasFees(feeHistory)
        const maxPriorityFeePerGas = Math.max(estimatedGasFees.maxPriorityFeePerGas, 30e9)

        this.feeMarket = feesToHex({
          ...estimatedGasFees,
          maxPriorityFeePerGas,
          maxFeePerGas: estimatedGasFees.maxBaseFeePerGas + maxPriorityFeePerGas
        })
      } catch (e) {
        this.feeMarket = null
      }
    }

    return this.feeMarket
  }
}

const gasChainMap = {
  137: PolygonGas,
  80001: PolygonGas
}

// TODO: rationalise use of provider / provider.connection
export function init(provider: Provider, chainIdStr: string) {
  const chainId = parseInt(chainIdStr)
  const ChainSpecificGas = gasChainMap[chainId as keyof typeof gasChainMap]
  return ChainSpecificGas ? new ChainSpecificGas(chainId, provider) : new DefaultGas(chainId, provider)
}
