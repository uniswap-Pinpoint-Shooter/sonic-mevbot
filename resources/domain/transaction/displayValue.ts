import BigNumber from 'bignumber.js'
import { isHexString } from 'ethers/lib/utils'

export class DisplayValue {
  public bn: BigNumber

  constructor(value: string | number | BigNumber) {
    this.bn = BigNumber(value, isHexString(value) ? 16 : undefined)
  }
  
  toUSD (currencyRate: Rate, isTestnet = false) {
    const nativeUSD = BigNumber(isTestnet || !currencyRate ? 0 : currencyRate.usd.price)
    const usd = this.bn.shiftedBy(-18).multipliedBy(nativeUSD).decimalPlaces(2, BigNumber.ROUND_FLOOR)
  
    return {
      usd,
      displayUSD: usd.isZero() ? '< $0.01' : `$${usd.toFormat()}`
    }
  }

  toEther (decimalPlaces = 18, shiftedBy?: number) {
    const ether = this.bn.shiftedBy(shiftedBy !== undefined ? shiftedBy : -decimalPlaces).decimalPlaces(decimalPlaces, BigNumber.ROUND_FLOOR)
  
    return {
      ether,
      displayEther: decimalPlaces < 18 && ether.isZero() ? `< ${BigNumber(`1e-${decimalPlaces}`).toFormat()}` : ether.toFormat()
    }
  }

  toGwei (decimalPlaces = 6) {
    const gwei = this.bn.shiftedBy(-9).decimalPlaces(decimalPlaces, BigNumber.ROUND_FLOOR)
  
    return gwei.isZero() ? '' : gwei.toFormat()
  }
  
  toWei () {
    return this.bn.toFormat(0)
  }
}