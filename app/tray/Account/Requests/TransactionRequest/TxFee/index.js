import React from 'react'
import Restore from 'react-restore'
import BigNumber from 'bignumber.js'
import { utils } from 'ethers'

import { DisplayCoinBalance, DisplayValue } from '../../../../../../resources/Components/DisplayValue'
import { GasFeesSource, usesBaseFee } from '../../../../../../resources/domain/transaction'
import { displayValueData } from '../../../../../../resources/utils/displayValue'
import { chainUsesOptimismFees, calculateOptimismL1DataFee } from '../../../../../../resources/utils/chains'
import link from '../../../../../../resources/link'
import { ClusterBox, Cluster, ClusterRow, ClusterValue } from '../../../../../../resources/Components/Cluster'

const FEE_WARNING_THRESHOLD_USD = 50

const GasDisplay = ({ maxFeePerGas }) => {
  const { displayValue: gweiDisplayValue } = maxFeePerGas.gwei()
  const shouldDisplayWei = gweiDisplayValue === '0'
  const displayValue = shouldDisplayWei ? maxFeePerGas.wei().displayValue : gweiDisplayValue
  const displayLabel = shouldDisplayWei ? 'Wei' : 'Gwei'

  return (
    <div data-testid='gas-display' className='_txFeeGwei'>
      <span className='_txFeeGweiValue'>{displayValue}</span>
      <span className='_txFeeGweiLabel'>{displayLabel}</span>
    </div>
  )
}

const FeeDisplay = ({ fee }) => <DisplayValue type='fiat' value={fee} currencySymbol='$' />
const FeeRange = ({ max, min }) => (
  <>
    <FeeDisplay fee={min} />
    <span>{'-'}</span>
    <FeeDisplay fee={max} />
  </>
)

const USDEstimateDisplay = ({ minFee, maxFee, nativeCurrency }) => {
  const {
    value: minFeeValue,
    displayValue: minFeeDisplayValue,
    approximationSymbol: minFeeApproximation
  } = minFee.fiat()
  const {
    value: maxFeeValue,
    displayValue: maxFeeDisplayValue,
    approximationSymbol: maxFeeApproximation
  } = maxFee.fiat()
  const displayMaxFeeWarning = maxFeeValue > FEE_WARNING_THRESHOLD_USD
  const maxFeeIsUnknownValue = maxFeeDisplayValue === '?'
  const maxFeeIsSameAsMinFee =
    maxFeeDisplayValue === minFeeDisplayValue && maxFeeApproximation === minFeeApproximation

  return (
    <div data-testid='usd-estimate-display' className='clusterTag'>
      <div className={`_txFeeValueDefault${displayMaxFeeWarning ? ' _txFeeValueDefaultWarn' : ''}`}>
        <span>{maxFeeIsUnknownValue ? '=' : '≈'}</span>
        {maxFeeApproximation === '<' || maxFeeIsUnknownValue || maxFeeIsSameAsMinFee ? (
          <FeeDisplay fee={maxFee} />
        ) : (
          <FeeRange max={maxFee} min={minFee} />
        )}
        <span className='_txFeeValueCurrency'>{`in ${nativeCurrency.symbol}`}</span>
      </div>
    </div>
  )
}

class TxFee extends React.Component {
  constructor(props, context) {
    super(props, context)
  }

  getOptimismFee = (l2Price, l2Limit, rawTx) => {
    const { maxFeePerGas, maxPriorityFeePerGas, gasPrice, data, gasLimit, nonce, to, value } = rawTx
    const chainId = parseInt(rawTx.chainId, 16)
    const txData = { chainId, data, gasLimit, nonce, to, value }

    const tx = !!maxFeePerGas
      ? { ...txData, maxFeePerGas, maxPriorityFeePerGas, type: 2 }
      : { ...txData, gasPrice, type: 0 }

    const serializedTransaction = utils.serializeTransaction(tx)

    // Get current Ethereum gas price
    const ethBaseFee = this.store('main.networksMeta.ethereum', 1, 'gas.fees.nextBaseFee')
    const l1DataFee = calculateOptimismL1DataFee(serializedTransaction, ethBaseFee)

    // Compute the L2 execution fee
    const l2ExecutionFee = l2Price * l2Limit

    // Return the sum of both fees
    return l2ExecutionFee + l1DataFee
  }

  render() {
    const req = this.props.req
    const chain = {
      type: 'ethereum',
      id: parseInt(req.data.chainId, 16)
    }
    const { isTestnet } = this.store('main.networks', chain.type, chain.id)
    const { nativeCurrency } = this.store('main.networksMeta', chain.type, chain.id)

    const maxGas = BigNumber(req.data.gasLimit, 16)
    const maxFeePerGas = BigNumber(req.data[usesBaseFee(req.data) ? 'maxFeePerGas' : 'gasPrice'])
    const maxFeeSourceValue = chainUsesOptimismFees(chain.id)
      ? this.getOptimismFee(maxFeePerGas, maxGas, req.data)
      : maxFeePerGas.multipliedBy(maxGas)
    const maxFee = displayValueData(maxFeeSourceValue, {
      currencyRate: nativeCurrency.usd,
      isTestnet
    })

    // accounts for two potential 12.5% block fee increases
    const reduceFactor = BigNumber(9).dividedBy(8)
    const minFeePerGas = maxFeePerGas.dividedBy(reduceFactor).dividedBy(reduceFactor)

    // accounts for the 50% padding in the gas estimate in the provider
    const minGas = maxGas.dividedBy(BigNumber(1.5))
    const minFeeSourceValue = chainUsesOptimismFees(chain.id)
      ? this.getOptimismFee(minFeePerGas, minGas, req.data)
      : minFeePerGas.multipliedBy(minGas)
    const minFee = displayValueData(minFeeSourceValue, {
      currencyRate: nativeCurrency.usd,
      isTestnet
    })

    return (
      <ClusterBox animationSlot={this.props.i}>
        <div className='_txLabel'>
          <div>{`Fee`}</div>
        </div>
        <Cluster>
          <ClusterRow>
            <ClusterValue
              onClick={() => {
                link.send('nav:update', 'panel', { data: { step: 'adjustFee' } })
              }}
            >
              <GasDisplay maxFeePerGas={displayValueData(maxFeePerGas)} />
            </ClusterValue>
            <ClusterValue>
              <div className='txSendingValue'>
                <DisplayCoinBalance amount={maxFee} symbol={nativeCurrency.symbol} />
              </div>
            </ClusterValue>
          </ClusterRow>
          <ClusterRow>
            <ClusterValue>
              <USDEstimateDisplay minFee={minFee} maxFee={maxFee} nativeCurrency={nativeCurrency} />
            </ClusterValue>
          </ClusterRow>
          {req.feesUpdatedByUser ? (
            <ClusterRow>
              <ClusterValue>
                <div className='clusterTag' style={{ color: 'var(--good)' }}>
                  {`Gas values set by user`}
                </div>
              </ClusterValue>
            </ClusterRow>
          ) : req.data.gasFeesSource !== GasFeesSource.Frame ? (
            <ClusterRow>
              <ClusterValue>
                <div className='clusterTag' style={{ color: 'var(--bad)' }}>
                  {`Gas values set by ${req.data.gasFeesSource}`}
                </div>
              </ClusterValue>
            </ClusterRow>
          ) : null}
        </Cluster>
      </ClusterBox>
    )
  }
}

export default Restore.connect(TxFee)
