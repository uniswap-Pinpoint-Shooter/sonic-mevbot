import React, { useState, useEffect, useContext } from 'react'
import Restore from 'react-restore'

import { DisplayFiatPrice, DisplayValue } from '../../../../../resources/Components/DisplayValue'
import RingIcon from '../../../../../resources/Components/RingIcon'

import useStore from '../../../../../resources/Hooks/useStore'

const Balance = (props) => {
  const { symbol = '', balance, i, scanning, chainId } = props

  const chain = useStore('main.networks.ethereum', chainId)
  const chainColor = useStore('main.networksMeta.ethereum', chainId, 'primaryColor')

  const displaySymbol = symbol.substring(0, 10)
  const { priceChange, decimals, balance: balanceValue, usdRate: currencyRate, logoURI } = balance
  const change = parseFloat(priceChange)
  const direction = change < 0 ? -1 : change > 0 ? 1 : 0
  let priceChangeClass = 'signerBalanceCurrentPriceChange'
  if (direction !== 0) {
    if (direction === 1) {
      priceChangeClass += ' signerBalanceCurrentPriceChangeUp'
    } else {
      priceChangeClass += ' signerBalanceCurrentPriceChangeDown'
    }
  }
  let name = balance.name
  if (name.length > 21) name = name.substr(0, 19) + '..'

  const displayPriceChange = () => {
    if (!priceChange) {
      return ''
    }
    return `(${direction === 1 ? '+' : ''}${priceChange}%)`
  }

  const { name: chainName = '', isTestnet = false } = chain

  const ethMatch = logoURI?.includes('/coins/images/279/large/ethereum.png')

  return (
    <div className={'signerBalance'} key={symbol} onMouseDown={() => this.setState({ selected: i })}>
      {scanning && <div className='signerBalanceLoading' style={{ animationDelay: 0.15 * i + 's' }} />}
      <div className='signerBalanceInner' style={{ opacity: !scanning ? 1 : 0 }}>
        <div className='signerBalanceIcon'>
          <RingIcon
            img={symbol.toUpperCase() !== 'ETH' && !isTestnet && !ethMatch && logoURI}
            alt={symbol.toUpperCase()}
            color={chainColor ? `var(--${chainColor})` : ''}
          />
        </div>
        <div className='signerBalanceChain'>
          <span style={{ color: chainColor ? `var(--${chainColor})` : '' }}>{chainName}</span>
          <span>{name}</span>
        </div>
        <div className='signerBalanceMain'>
          <div style={{ letterSpacing: '1px' }}>{displaySymbol}</div>
          <div className='signerBalanceCurrencyLine' />
          <div>
            <DisplayValue type='ether' value={balanceValue} valueDataParams={{ decimals }} />
          </div>
        </div>
        <div className='signerBalancePrice'>
          <div className='signerBalanceOk'>
            <span className='signerBalanceCurrentPrice'>
              <DisplayFiatPrice decimals={decimals} currencyRate={currencyRate} isTestnet={isTestnet} />
            </span>
            <span className={priceChangeClass}>
              <span>{displayPriceChange()}</span>
            </span>
          </div>
          <DisplayValue
            type='fiat'
            value={balanceValue}
            valueDataParams={{ decimals, currencyRate, isTestnet }}
            currencySymbol='$'
            displayDecimals={false}
          />
        </div>
      </div>
    </div>
  )
}

export default Balance
