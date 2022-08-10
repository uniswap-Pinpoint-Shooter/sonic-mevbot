import React, { Component } from 'react'
import Restore from 'react-restore'
import BigNumber from 'bignumber.js'

import svg from '../../svg'
import { weiToGwei, hexToInt } from '../../utils'

// estimated gas to perform various common tasks
const gasToSendEth = 21 * 1000
const gasToSendToken = 65 * 1000
const gasForDexSwap = 200 * 1000

function roundGwei(gwei) {
  if (gwei && gwei < 0.001) return '‹0.001'
  return parseFloat(
    gwei >= 10 ? Math.round(gwei) :
    gwei >= 5 ? Math.round(gwei * 10) / 10 :
    gwei >= 1 ? Math.round(gwei * 100) / 100 :
    Math.round(gwei * 1000) / 1000
  )
}

function levelDisplay (level) {
  const gwei = weiToGwei(hexToInt(level)) 
  return roundGwei(gwei) || 0
}

function toDisplayUSD (bn) {
  return parseFloat(
    bn.toNumber() >= 1 ? bn.toFixed(0, BigNumber.ROUND_UP).toString() :
    bn.toFixed(2, BigNumber.ROUND_UP).toString()     
  )
}

function txEstimate (value, gasLimit, nativeUSD) {
  return toDisplayUSD(BigNumber(value * gasLimit).shiftedBy(-9).multipliedBy(nativeUSD))
}

class GasFees extends Component {
  constructor (...args) {
    super(...args)
  }

  render () {
    return <>
      <div className='gasItem gasItemLarge'>
        <div className='gasGweiNum'>
          {gasPrice}
        </div >
        <span className='gasGweiLabel'>{'GWEI'}</span>
        <span className='gasLevelLabel'>{'Recommended'}</span>
      </div>
    </>
  }
}

class GasFeesMarket extends Component {
  constructor (...args) {
    super(...args)
    this.state = {
      baseHover: false,
      prioHover: false
    }
  }

  render () {
    const { gasPrice, fees: { nextBaseFee, maxPriorityFeePerGas } } = this.props 
    const calculatedFees = {
      actualBaseFee: roundGwei((weiToGwei(hexToInt(nextBaseFee)))),
      priorityFee: levelDisplay(maxPriorityFeePerGas)
    }

    return <>
      {this.state.baseHover && <div className='feeToolTip feeToolTipBase cardShow'>
        The current base fee is added with a buffer to cover the next 3 blocks, any amount greater than your block's base fee is refunded
      </div>}
      {this.state.prioHover && <div className='feeToolTip feeToolTipPriority cardShow'>
        A priority tip paid to validators is added to incentivize quick inclusion of your transaction into a block
      </div>}
      <div className='gasItem gasItemSmall'>
        <div className='gasGweiNum'>
          {calculatedFees.actualBaseFee}
        </div >
        <span className='gasGweiLabel'>{'GWEI'}</span>
        <span className='gasLevelLabel'>{'Current Base'}</span>
      </div>
      <div className='gasItem gasItemLarge'>
        <div 
          className='gasArrow' 
          onClick={() => this.setState({ baseHover: true })}
          onMouseLeave={() => this.setState({ baseHover: false })}
        >
          <div className='gasArrowNotify'>+</div>
          <div className='gasArrowInner'>{svg.chevron(27)}</div>
        </div>
        <div className='gasGweiNum'>
          {gasPrice}
        </div >
        <span className='gasGweiLabel'>{'GWEI'}</span>
        <span className='gasLevelLabel'>{'Recommended'}</span>
        <div 
          className='gasArrow gasArrowRight'
          onClick={() => this.setState({ prioHover: true })}
          onMouseLeave={() => this.setState({ prioHover: false })}
        >
          <div className='gasArrowInner'>{svg.chevron(27)}</div>
        </div>
      </div>
      <div className='gasItem gasItemSmall'>
        <div className='gasGweiNum'>
          {calculatedFees.priorityFee}
        </div >
        <span className='gasGweiLabel'>{'GWEI'}</span>
        <span className='gasLevelLabel'>{'Priority Tip'}</span>
      </div>
    </>
  }
}

class GasSummaryComponent extends Component {
  constructor (...args) {
    super(...args)
  }

  txEstimates (type, id, gasPrice, calculatedFees, currentSymbol) {
    const estimates = [
      {
        label: 'Send ' + currentSymbol,
        estimatedGas: gasToSendEth
      },
      {
        label: 'Send Tokens',
        estimatedGas: gasToSendToken
      },
      {
        label: 'Dex Swap',
        estimatedGas: gasForDexSwap
      }
    ]

    const layer = this.store('main.networks', type, id, 'layer')
    const nativeCurrency = this.store('main.networksMeta', type, id, 'nativeCurrency')
    const nativeUSD = BigNumber(nativeCurrency && nativeCurrency.usd && layer !== 'testnet' ? nativeCurrency.usd.price : 0)

    if (id === 10) {
      // Optimism specific calculations
      // TODO: re-structure the way we store and model gas fees

      const l1GasEstimates = [4300, 5100, 6900]
      const ethPriceLevels = this.store('main.networksMeta.ethereum', 1, 'gas.price.levels')
      const l1Price = levelDisplay(ethPriceLevels.fast)

      const optimismEstimate = (l1Limit, l2Limit) => {
        const l1Estimate = BigNumber(l1Price * l1Limit * 1.5)
        const l2Estimate = BigNumber(gasPrice * l2Limit)

        return toDisplayUSD(l1Estimate.plus(l2Estimate).shiftedBy(-9).multipliedBy(nativeUSD))
      }

      return estimates.map(({ label, estimatedGas }, i) => (
        {
          low: optimismEstimate(l1GasEstimates[i], estimatedGas),
          high: optimismEstimate(l1GasEstimates[i], estimatedGas),
          label
        }
      ))
    }
      
    const low = calculatedFees ? roundGwei(calculatedFees.actualBaseFee + calculatedFees.priorityFee) : gasPrice

    return estimates.map(({ label, estimatedGas }) => (
      {
        low: txEstimate(low, estimatedGas, nativeUSD),
        high: txEstimate(gasPrice, estimatedGas, nativeUSD),
        label
      }
    ))
  }

  feeEstimatesUSD () {
    const { id, displayFeeMarket } = this.props
    const type = 'ethereum'
    const currentSymbol = this.store('main.networks', type, id, 'symbol') || 'ETH'
    
    if (!displayFeeMarket) {
      return this.txEstimates(type, id, gasPrice, null, currentSymbol)
    }

    const { nextBaseFee, maxPriorityFeePerGas } = this.store('main.networksMeta', type, id, 'gas.price.fees')  
    const calculatedFees = {
      actualBaseFee: roundGwei((weiToGwei(hexToInt(nextBaseFee)))),
      priorityFee: levelDisplay(maxPriorityFeePerGas)
    }

    return this.txEstimates(type, id, gasPrice, calculatedFees, currentSymbol)
  }

  render () {
    const { gasPrice } = this.props

    return (
      <>
        <div className='sliceTileGasPrice'> 
          <div className='sliceTileGasPriceIcon'>{svg.gas(9)}</div>
          <div className='sliceTileGasPriceNumber'>{gasPrice}</div>
          <div className='sliceTileGasPriceUnit'>{'gwei'}</div>
        </div>
        <div className='sliceGasEstimateBlock'>
          {this.feeEstimatesUSD().map((estimate) =>{
            return (
              <div className='gasEstimate'>
                <div className='gasEstimateRange'>
                  <span className='gasEstimateSymbol'>{!estimate.low || estimate.low >= 0.01 ? `$` : '<$'}</span>
                  <span className='gasEstimateRangeLow'>{`${!estimate.low ? 0 : estimate.low < 0.01 ? 0.01 : estimate.low < 1 ? estimate.low.toFixed(2) : estimate.low}`}</span>
                </div>
                <div className='gasEstimateLabel'>{estimate.label}</div>
              </div>
            )
          })}
        </div>
      </>
    )
  }
}

const GasSummary = Restore.connect(GasSummaryComponent)

class Gas extends Component {
  constructor (...args) {
    super(...args)
    this.state = {
      expand: false
    }
  }

  render () {
    const { id } = this.props
    const type = 'ethereum'
    const fees = this.store('main.networksMeta', type, id, 'gas.price.fees')
    const levels = this.store('main.networksMeta', type, id, 'gas.price.levels')
    const gasPrice = levelDisplay(levels.fast)
    const displayFeeMarket = !!Object.keys(fees).length

    return (
      <div className='sliceContainer' ref={this.ref}>
        <div className='sliceTile sliceTileClickable' 
             onClick={() => {
               this.setState({ expanded: !this.state.expanded })
             }} 
        >
          <GasSummary displayFeeMarket={displayFeeMarket} gasPrice={gasPrice} />  
        </div>
        {this.state.expanded ? (
          <div className='sliceGasBlock'>
            {displayFeeMarket ? <GasFeesMarket gasPrice={gasPrice} fees={fees} /> : <GasFees gasPrice={gasPrice} />}
          </div>
        ) : null }
      </div>
    )
  }
}

export default Restore.connect(Gas)
