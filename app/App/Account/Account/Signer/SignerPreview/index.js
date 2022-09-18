import React from 'react'
import Restore from 'react-restore'
import link from '../../../../../../resources/link'
import svg from '../../../../../../resources/svg'

import Verify from '../Verify'

const isHardwareSigner = (account = {}) => {
  return ['ledger', 'lattice', 'trezor'].includes(account.lastSignerType)
}

const isWatchOnly = (account = {}) => {
  return ['address'].includes(account.lastSignerType.toLowerCase())
}

class Signer extends React.Component {
  constructor (...args) {
    super(...args)
    this.moduleRef = React.createRef()
    if (!this.props.expanded) {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.moduleRef && this.moduleRef.current) {
          link.send('tray:action', 'updateAccountModule', this.props.moduleId, { height: this.moduleRef.current.clientHeight })
        }
      })
    }
  }

  componentDidMount () {
    if (this.resizeObserver) this.resizeObserver.observe(this.moduleRef.current)
  }

  componentWillUnmount () {
    if (this.resizeObserver) this.resizeObserver.disconnect()
  }

  renderSignerType (type) {
    if (type === 'lattice') {
      return (
        <div className='moduleItemSignerType'>
          <div className='moduleItemIcon'>{svg.lattice(18)}</div>
          <div>{'GridPlus'}</div>
        </div>
      )
    } else if (type === 'ledger') {
      return (
        <div className='moduleItemSignerType'>
          <div className='moduleItemIcon'>{svg.ledger(16)}</div>
          <div>{'Ledger'}</div>
        </div>
      )
    } else if (type === 'trezor') {
      return (
        <div className='moduleItemSignerType'>
          <div className='moduleItemIcon'>{svg.trezor(15)}</div>
          <div>{'Trezor'}</div>
        </div>
      )
    } else if (type === 'aragon') {
      return (
        <div className='moduleItemSignerType'>
          <div className='moduleItemIcon'>{svg.aragon(26)}</div>
          <div>{'Aragon Agent'}</div>
        </div>
      )
    } else if (type === 'seed') {
      return (
        <div className='moduleItemSignerType'>
          <div className='moduleItemIcon'>{svg.seedling(16)}</div>
          <div>{'Seed'}</div>
        </div>
      )
    } else if (type === 'keyring') {
      return (
        <div className='moduleItemSignerType'>
          <div className='moduleItemIcon'>{svg.key(17)}</div>
          <div>{'Keyring'}</div>
        </div>
      )
    } else {
      return (
        <div className='moduleItemSignerType'>
          <div className='moduleItemIcon'>{svg.mask(20)}</div>
          <div>{'Watch-only'}</div>
        </div>
      )
    }
  }

  render () {
    const activeAccount =  this.store('main.accounts', this.props.account)

    let signer

    if (activeAccount.signer) {
      signer = this.store('main.signers', activeAccount.signer)
    } else if (activeAccount .smart)  {
      const actingSigner = this.store('main.accounts', activeAccount.smart.actor, 'signer')
      if (actingSigner) signer = this.store('main.signers', actingSigner)
    }

    const hardwareSigner = isHardwareSigner(activeAccount)
    const watchOnly = isWatchOnly(activeAccount)
    const status = (signer && signer.status) || (hardwareSigner ? 'Disconnected' : 'No Signer')

    return (
      <div 
        className='balancesBlock'
        ref={this.moduleRef}
      >
        <div className='moduleHeader'>
          <span style={{ position: 'relative', top: '2px' }}>{svg.sign(19)}</span>
          <span>{'Signer'}</span>
        </div>
        <div className='moduleMainPermissions'>
          <div 
            className='moduleItem moduleItemSpace moduleItemButton' 
            onClick={() => {
              const crumb = {
                view: 'expandedSigner', 
                data: { signer: signer.id }
              }
              // link.send('nav:forward', 'dash', crumb)
              link.send('tray:action', 'navDash', crumb)
          }}>
            {this.renderSignerType(activeAccount.lastSignerType)}
            <div>{status}</div>
          </div>
          {!watchOnly ? (
            <Verify 
              id={this.props.account}
            />
          ) : null}
        </div>
      </div>
    )
  }
}

export default Restore.connect(Signer)

