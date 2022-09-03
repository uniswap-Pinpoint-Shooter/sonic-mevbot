import React from 'react'
import Restore from 'react-restore'
import { addHexPrefix } from 'ethereumjs-util'
import BigNumber from 'bignumber.js'

import store from '../../../../../../../../main/store'
import link from '../../../../../../../../resources/link'
import { advanceTimers, setupComponent } from '../../../../../../../componentSetup'
import AdjustFeeComponent from '../../../../../../../../app/App/Main/Account/Requests/TransactionRequest/AdjustFee'

jest.mock('../../../../../../../../main/store/persist')
jest.mock('../../../../../../../../resources/link', () => ({ rpc: jest.fn() }))

const hexStr = (val) => `0x${BigNumber(val).times(1e9).toString(16)}`

const AdjustFee = Restore.connect(AdjustFeeComponent, store)
let req

beforeAll(() => {
  jest.useFakeTimers()
})

afterAll(() => {
  jest.useRealTimers()
})

beforeEach(() => {
  req = { 
    data: { 
      type: '0x2',
      gasLimit: '0x61a8',
      maxPriorityFeePerGas: addHexPrefix(3e9.toString(16)),
      maxFeePerGas: addHexPrefix(7e9.toString(16)),
    },
    handlerId: '1' 
  }
})

it('renders the base fee input', () => {
  const { getByLabelText, debug } = setupComponent(<AdjustFee req={req} />)

  debug()   
  const baseFeeInput = getByLabelText('Base Fee (GWEI)')
  expect(baseFeeInput.value).toBe('4')
})

it('renders the priority fee input', () => {
  const { getByLabelText } = setupComponent(<AdjustFee req={req} />)

  const priorityFeeInput = getByLabelText('Max Priority Fee (GWEI)')
  expect(priorityFeeInput.value).toBe('3')
})

it('renders the gas limit input', () => {
  const { getByLabelText } = setupComponent(<AdjustFee req={req} />)
  
  const gasLimitInput = getByLabelText('Gas Limit (UNITS)')
  expect(gasLimitInput.value).toBe('25000')
})

describe('base fee input', () => {
  const submittedAmounts = [
    { amount: 100e9.toString(), submitted: '9999' },
    { amount: 1e9.toString(), submitted: '9999' },
    { amount: '9.2', submitted: '9.2' },
    { amount: '9.222222222222222', submitted: '9.222222222' },
    { amount: '9.500000', submitted: '9.5' },
    { amount: 'gh-5.86bf', submitted: '5.86' },
  ]

  submittedAmounts.forEach((spec) => {
    it(`submits a requested amount of ${spec.amount} as ${spec.submitted}`, async () => {
      const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
      const baseFeeInput = getByLabelText('Base Fee (GWEI)')

      await user.clear(baseFeeInput)
      await user.type(baseFeeInput, spec.amount)

      advanceTimers(500)
      
      expect(baseFeeInput.value).toBe(spec.submitted)
      expect(link.rpc).toHaveBeenCalledWith('setBaseFee', hexStr(spec.submitted), '1', expect.any(Function))
    })
  })

  it('does not submit values when the user is in the middle of typing a float', async () => {
    const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
    const baseFeeInput = getByLabelText('Base Fee (GWEI)')

    await user.clear(baseFeeInput)
    await user.type(baseFeeInput, '20.')
    
    advanceTimers(500)

    expect(baseFeeInput.value).toBe('20.')
    expect(link.rpc).not.toHaveBeenCalled()
  })

  it('does not submit empty values', async () => {
    const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
    const baseFeeInput = getByLabelText('Base Fee (GWEI)')

    await user.clear(baseFeeInput)
    
    advanceTimers(500)

    expect(baseFeeInput.value).toBe('')
    expect(link.rpc).not.toHaveBeenCalled()
  })

  it('increments integer values when the up arrow key is pressed', async () => {
    const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
    const baseFeeInput = getByLabelText('Base Fee (GWEI)')

    await user.type(baseFeeInput, '{ArrowUp}')
    
    advanceTimers(500)

    expect(baseFeeInput.value).toBe('5')
    expect(link.rpc).toHaveBeenCalledWith('setBaseFee', hexStr(5), '1', expect.any(Function))
  })

  it('increments float values when the up arrow key is pressed', async () => {
    const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
    const baseFeeInput = getByLabelText('Base Fee (GWEI)')

    await user.clear(baseFeeInput)
    await user.type(baseFeeInput, '1.5{ArrowUp}')
    
    advanceTimers(500)

    expect(baseFeeInput.value).toBe('2.5')
    expect(link.rpc).toHaveBeenCalledWith('setBaseFee', hexStr(2.5), '1', expect.any(Function))
  })

  it('does not increment values above the upper limit', async () => {
    const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
    const baseFeeInput = getByLabelText('Base Fee (GWEI)')

    await user.clear(baseFeeInput)
    await user.type(baseFeeInput, '9998{ArrowUp}{ArrowUp}{ArrowUp}')
    
    advanceTimers(500)

    expect(baseFeeInput.value).toBe('9999')
    expect(link.rpc).toHaveBeenCalledWith('setBaseFee', hexStr(9999), '1', expect.any(Function))
  })

  it('decrements integer values when the down arrow key is pressed', async () => {
    const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
    const baseFeeInput = getByLabelText('Base Fee (GWEI)')

    await user.type(baseFeeInput, '{ArrowDown}')
    
    advanceTimers(500)

    expect(baseFeeInput.value).toBe('3')
    expect(link.rpc).toHaveBeenCalledWith('setBaseFee', hexStr(3), '1', expect.any(Function))
  })

  it('decrements float values when the down arrow key is pressed', async () => {
    const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
    const baseFeeInput = getByLabelText('Base Fee (GWEI)')

    await user.clear(baseFeeInput)
    await user.type(baseFeeInput, '2.5{ArrowDown}')
    
    advanceTimers(500)

    expect(baseFeeInput.value).toBe('1.5')
    expect(link.rpc).toHaveBeenCalledWith('setBaseFee', hexStr(1.5), '1', expect.any(Function))
  })

  it('does not decrement values below the lower limit', async () => {
    const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
    const baseFeeInput = getByLabelText('Base Fee (GWEI)')

    await user.clear(baseFeeInput)
    await user.type(baseFeeInput, '1{ArrowDown}{ArrowDown}{ArrowDown}')
    
    advanceTimers(500)

    expect(baseFeeInput.value).toBe('0')
    expect(link.rpc).toHaveBeenCalledWith('setBaseFee', hexStr(0), '1', expect.any(Function))
  })

  it('blurs the input when the enter key is pressed', async () => {
    const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
    const baseFeeInput = getByLabelText('Base Fee (GWEI)')

    await user.clear(baseFeeInput)
    await user.type(baseFeeInput, '5{Enter}')

    expect(document.activeElement).not.toEqual(baseFeeInput);
  })

  fit('recalculates the base fee when the total fee exceeds the maximum allowed (ETH-based chains)', async () => {
    req.data.chainId = '1'
    const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
    const baseFeeInput = getByLabelText('Base Fee (GWEI)')
    const priorityFeeInput = getByLabelText('Max Priority Fee (GWEI)')
    const gasLimitInput = getByLabelText('Gas Limit (UNITS)')

    await user.clear(priorityFeeInput)
    await user.type(priorityFeeInput, '4576547845678568586758')

    await user.clear(gasLimitInput)
    await user.type(gasLimitInput, '876897897897897897897')

    advanceTimers(500)
    
    await user.clear(baseFeeInput)
    await user.type(baseFeeInput, '5686548658568568568568')

    advanceTimers(500)

    // expect(baseFeeInput.value).toBe('0')
    expect(link.rpc).toHaveBeenCalledWith('setBaseFee', hexStr(0), '1', expect.any(Function))
  })
  // base fee clobbered
})

describe('priority fee input', () => {
  const submittedAmounts = [
    { amount: 100e9.toString(), submitted: '9999' },
    { amount: 1e9.toString(), submitted: '9999' },
    { amount: '9.2', submitted: '9.2' },
    { amount: '9.222222222222222', submitted: '9.222222222' },
    { amount: '9.500000', submitted: '9.5' },
    { amount: 'gh-5.86bf', submitted: '5.86' },
  ]

  submittedAmounts.forEach((spec) => {
    it(`submits a requested amount of ${spec.amount} as ${spec.submitted}`, async () => {
      const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
      const priorityFeeInput = getByLabelText('Max Priority Fee (GWEI)')

      await user.clear(priorityFeeInput)
      await user.type(priorityFeeInput, spec.amount)

      advanceTimers(500)
      
      expect(priorityFeeInput.value).toBe(spec.submitted)
      expect(link.rpc).toHaveBeenCalledWith('setPriorityFee', hexStr(spec.submitted), '1', expect.any(Function))
    })
  })

  it('does not submit values when the user is in the middle of typing a float', async () => {
    const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
    const priorityFeeInput = getByLabelText('Max Priority Fee (GWEI)')

    await user.clear(priorityFeeInput)
    await user.type(priorityFeeInput, '20.')
    
    advanceTimers(500)

    expect(priorityFeeInput.value).toBe('20.')
    expect(link.rpc).not.toHaveBeenCalled()
  })

  it('does not submit empty values', async () => {
    const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
    const priorityFeeInput = getByLabelText('Max Priority Fee (GWEI)')

    await user.clear(priorityFeeInput)
    
    advanceTimers(500)

    expect(priorityFeeInput.value).toBe('')
    expect(link.rpc).not.toHaveBeenCalled()
  })

  it('increments integer values when the up arrow key is pressed', async () => {
    const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
    const priorityFeeInput = getByLabelText('Max Priority Fee (GWEI)')

    await user.type(priorityFeeInput, '{ArrowUp}')
    
    advanceTimers(500)

    expect(priorityFeeInput.value).toBe('4')
    expect(link.rpc).toHaveBeenCalledWith('setPriorityFee', hexStr(4), '1', expect.any(Function))
  })

  it('increments float values when the up arrow key is pressed', async () => {
    const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
    const priorityFeeInput = getByLabelText('Max Priority Fee (GWEI)')

    await user.clear(priorityFeeInput)
    await user.type(priorityFeeInput, '1.5{ArrowUp}')
    
    advanceTimers(500)

    expect(priorityFeeInput.value).toBe('2.5')
    expect(link.rpc).toHaveBeenCalledWith('setPriorityFee', hexStr(2.5), '1', expect.any(Function))
  })

  it('does not increment values above the upper limit', async () => {
    const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
    const priorityFeeInput = getByLabelText('Max Priority Fee (GWEI)')

    await user.clear(priorityFeeInput)
    await user.type(priorityFeeInput, '9998{ArrowUp}{ArrowUp}{ArrowUp}')
    
    advanceTimers(500)

    expect(priorityFeeInput.value).toBe('9999')
    expect(link.rpc).toHaveBeenCalledWith('setPriorityFee', hexStr(9999), '1', expect.any(Function))
  })

  it('decrements integer values when the down arrow key is pressed', async () => {
    const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
    const priorityFeeInput = getByLabelText('Max Priority Fee (GWEI)')

    await user.type(priorityFeeInput, '{ArrowDown}')
    
    advanceTimers(500)

    expect(priorityFeeInput.value).toBe('2')
    expect(link.rpc).toHaveBeenCalledWith('setPriorityFee', hexStr(2), '1', expect.any(Function))
  })

  it('decrements float values when the down arrow key is pressed', async () => {
    const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
    const priorityFeeInput = getByLabelText('Max Priority Fee (GWEI)')

    await user.clear(priorityFeeInput)
    await user.type(priorityFeeInput, '2.5{ArrowDown}')
    
    advanceTimers(500)

    expect(priorityFeeInput.value).toBe('1.5')
    expect(link.rpc).toHaveBeenCalledWith('setPriorityFee', hexStr(1.5), '1', expect.any(Function))
  })

  it('does not decrement values below the lower limit', async () => {
    const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
    const priorityFeeInput = getByLabelText('Max Priority Fee (GWEI)')

    await user.clear(priorityFeeInput)
    await user.type(priorityFeeInput, '1{ArrowDown}{ArrowDown}{ArrowDown}')
    
    advanceTimers(500)

    expect(priorityFeeInput.value).toBe('0')
    expect(link.rpc).toHaveBeenCalledWith('setPriorityFee', hexStr(0), '1', expect.any(Function))
  })

  it('blurs the input when the enter key is pressed', async () => {
    const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
    const priorityFeeInput = getByLabelText('Max Priority Fee (GWEI)')

    await user.clear(priorityFeeInput)
    await user.type(priorityFeeInput, '5{Enter}')

    expect(document.activeElement).not.toEqual(priorityFeeInput);
  })

  // priority fee clobbered
})

describe('gas limit input', () => {
  const submittedAmounts = [
    { amount: 100e9.toString(), submitted: '12500000' },
    { amount: 1e9.toString(), submitted: '12500000' },
    { amount: '9.2', submitted: '92' },
    { amount: 'gh-5.86bf', submitted: '586' },
  ]

  submittedAmounts.forEach((spec) => {
    it(`submits a requested amount of ${spec.amount} as ${spec.submitted}`, async () => {
      const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
      const gasLimitInput = getByLabelText('Gas Limit (UNITS)')

      await user.clear(gasLimitInput)
      await user.type(gasLimitInput, spec.amount)

      advanceTimers(500)
      
      expect(gasLimitInput.value).toBe(spec.submitted)
      expect(link.rpc).toHaveBeenCalledWith('setGasLimit', spec.submitted, '1', expect.any(Function))
    })
  })

  it('does not submit empty values', async () => {
    const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
    const gasLimitInput = getByLabelText('Gas Limit (UNITS)')

    await user.clear(gasLimitInput)
    
    advanceTimers(500)

    expect(gasLimitInput.value).toBe('')
    expect(link.rpc).not.toHaveBeenCalled()
  })

  it('increments values when the up arrow key is pressed', async () => {
    const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
    const gasLimitInput = getByLabelText('Gas Limit (UNITS)')

    await user.type(gasLimitInput, '{ArrowUp}')
    
    advanceTimers(500)

    expect(gasLimitInput.value).toBe('26000')
    expect(link.rpc).toHaveBeenCalledWith('setGasLimit', '26000', '1', expect.any(Function))
  })

  it('does not increment values above the upper limit', async () => {
    const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
    const gasLimitInput = getByLabelText('Gas Limit (UNITS)')

    await user.clear(gasLimitInput)
    await user.type(gasLimitInput, '12499000{ArrowUp}{ArrowUp}{ArrowUp}')
    
    advanceTimers(500)

    expect(gasLimitInput.value).toBe('12500000')
    expect(link.rpc).toHaveBeenCalledWith('setGasLimit', '12500000', '1', expect.any(Function))
  })

  it('decrements values when the down arrow key is pressed', async () => {
    const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
    const gasLimitInput = getByLabelText('Gas Limit (UNITS)')

    await user.type(gasLimitInput, '{ArrowDown}')
    
    advanceTimers(500)

    expect(gasLimitInput.value).toBe('24000')
    expect(link.rpc).toHaveBeenCalledWith('setGasLimit', '24000', '1', expect.any(Function))
  })

  it('does not decrement values below the lower limit', async () => {
    const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
    const gasLimitInput = getByLabelText('Gas Limit (UNITS)')

    await user.clear(gasLimitInput)
    await user.type(gasLimitInput, '1000{ArrowDown}{ArrowDown}{ArrowDown}')
    
    advanceTimers(500)

    expect(gasLimitInput.value).toBe('0')
    expect(link.rpc).toHaveBeenCalledWith('setGasLimit', '0', '1', expect.any(Function))
  })

  it('blurs the input when the enter key is pressed', async () => {
    const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
    const gasLimitInput = getByLabelText('Gas Limit (UNITS)')

    await user.clear(gasLimitInput)
    await user.type(gasLimitInput, '45000{Enter}')

    expect(document.activeElement).not.toEqual(gasLimitInput);
  })

  // gas limit clobbered
})

describe('legacy transactions', () => {
  beforeEach(() => {
    req = { 
      data: { 
        type: '0x0',
        gasLimit: '0x61a8',
        gasPrice: addHexPrefix(7e9.toString(16))
      },
      handlerId: '1' 
    }
  })

  it('renders the gas price input', () => {
    const { getByLabelText } = setupComponent(<AdjustFee req={req} />)
        
    const gasPriceInput = getByLabelText('Gas Price (GWEI)')
    expect(gasPriceInput.value).toBe('7')
  })

  it('renders the gas limit input', () => {
    const { getByLabelText } = setupComponent(<AdjustFee req={req} />)
        
    const gasLimitInput = getByLabelText('Gas Limit (UNITS)')
    expect(gasLimitInput.value).toBe('25000')
  })

  describe('gas price input', () => {
    const submittedAmounts = [
      { amount: 100e9.toString(), submitted: '9999' },
      { amount: 1e9.toString(), submitted: '9999' },
      { amount: '9.2', submitted: '9.2' },
      { amount: '9.222222222222222', submitted: '9.222222222' },
      { amount: '9.500000', submitted: '9.5' },
      { amount: 'gh-5.86bf', submitted: '5.86' },
    ]
  
    submittedAmounts.forEach((spec) => {
      it(`submits a requested amount of ${spec.amount} as ${spec.submitted}`, async () => {
        const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
        const gasPriceInput = getByLabelText('Gas Price (GWEI)')
  
        await user.clear(gasPriceInput)
        await user.type(gasPriceInput, spec.amount)
  
        advanceTimers(500)
        
        expect(gasPriceInput.value).toBe(spec.submitted)
        expect(link.rpc).toHaveBeenCalledWith('setGasPrice', hexStr(spec.submitted), '1', expect.any(Function))
      })
    })
  
    it('does not submit values when the user is in the middle of typing a float', async () => {
      const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
      const gasPriceInput = getByLabelText('Gas Price (GWEI)')
  
      await user.clear(gasPriceInput)
      await user.type(gasPriceInput, '20.')
      
      advanceTimers(500)
  
      expect(gasPriceInput.value).toBe('20.')
      expect(link.rpc).not.toHaveBeenCalled()
    })
  
    it('does not submit empty values', async () => {
      const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
      const gasPriceInput = getByLabelText('Gas Price (GWEI)')
  
      await user.clear(gasPriceInput)
      
      advanceTimers(500)
  
      expect(gasPriceInput.value).toBe('')
      expect(link.rpc).not.toHaveBeenCalled()
    })

    it('increments integer values when the up arrow key is pressed', async () => {
      const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
      const gasPriceInput = getByLabelText('Gas Price (GWEI)')
  
      await user.type(gasPriceInput, '{ArrowUp}')
      
      advanceTimers(500)
  
      expect(gasPriceInput.value).toBe('8')
      expect(link.rpc).toHaveBeenCalledWith('setGasPrice', hexStr(8), '1', expect.any(Function))
    })
  
    it('increments float values when the up arrow key is pressed', async () => {
      const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
      const gasPriceInput = getByLabelText('Gas Price (GWEI)')
  
      await user.clear(gasPriceInput)
      await user.type(gasPriceInput, '1.5{ArrowUp}')
      
      advanceTimers(500)
  
      expect(gasPriceInput.value).toBe('2.5')
      expect(link.rpc).toHaveBeenCalledWith('setGasPrice', hexStr(2.5), '1', expect.any(Function))
    })
  
    it('does not increment values above the upper limit', async () => {
      const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
      const gasPriceInput = getByLabelText('Gas Price (GWEI)')
  
      await user.clear(gasPriceInput)
      await user.type(gasPriceInput, '9998{ArrowUp}{ArrowUp}{ArrowUp}')
      
      advanceTimers(500)
  
      expect(gasPriceInput.value).toBe('9999')
      expect(link.rpc).toHaveBeenCalledWith('setGasPrice', hexStr(9999), '1', expect.any(Function))
    })
  
    it('decrements integer values when the down arrow key is pressed', async () => {
      const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
      const gasPriceInput = getByLabelText('Gas Price (GWEI)')
  
      await user.type(gasPriceInput, '{ArrowDown}')
      
      advanceTimers(500)
  
      expect(gasPriceInput.value).toBe('6')
      expect(link.rpc).toHaveBeenCalledWith('setGasPrice', hexStr(6), '1', expect.any(Function))
    })
  
    it('decrements float values when the down arrow key is pressed', async () => {
      const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
      const gasPriceInput = getByLabelText('Gas Price (GWEI)')
  
      await user.clear(gasPriceInput)
      await user.type(gasPriceInput, '2.5{ArrowDown}')
      
      advanceTimers(500)
  
      expect(gasPriceInput.value).toBe('1.5')
      expect(link.rpc).toHaveBeenCalledWith('setGasPrice', hexStr(1.5), '1', expect.any(Function))
    })
  
    it('does not decrement values below the lower limit', async () => {
      const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
      const gasPriceInput = getByLabelText('Gas Price (GWEI)')
  
      await user.clear(gasPriceInput)
      await user.type(gasPriceInput, '1{ArrowDown}{ArrowDown}{ArrowDown}')
      
      advanceTimers(500)
  
      expect(gasPriceInput.value).toBe('0')
      expect(link.rpc).toHaveBeenCalledWith('setGasPrice', hexStr(0), '1', expect.any(Function))
    })
  
    it('blurs the input when the enter key is pressed', async () => {
      const { user, getByLabelText } = setupComponent(<AdjustFee req={req} />)
      const gasPriceInput = getByLabelText('Gas Price (GWEI)')
  
      await user.clear(gasPriceInput)
      await user.type(gasPriceInput, '5{Enter}')
  
      expect(document.activeElement).not.toEqual(gasPriceInput);
    })
    
    // gas price clobbered
    // gas limit clobbered
  })
})

