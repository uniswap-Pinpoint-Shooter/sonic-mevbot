import React, {  createRef } from 'react'
import Restore from 'react-restore'
import link from '../../../../resources/link'
import RingIcon from '../../../../resources/Components/RingIcon'
import svg from '../../../../resources/svg'

class DappDetails extends React.Component {
  updateOriginChain () {
    const origin = this.store('main.origins', this.props.originId)
    return (
      <div className='originSwapChainList'>
        {Object.keys(this.store('main.networks.ethereum')).filter(id => {
          return this.store('main.networks.ethereum', id, 'on')
        }).map((id, chain) => {
          const selected = origin.chain.id === parseInt(id)
          const chainColor = this.store('main.networksMeta.ethereum', id, 'primaryColor')
          return (
            <div 
              className={'originChainItem'} 
              style={selected ? {
                color: 'var(--ghostB)',
                background: chainColor ? `var(--${chainColor})` : 'var(--moon)'
              } : {}}
              onClick={() => {
                link.send('tray:action', 'switchOriginChain', this.props.originId, parseInt(id), 'ethereum')
              }}
            >
              <div className='originChainItemIcon'>
                <RingIcon 
                  color={`var(--${chainColor})`}
                  svgLookup={{ name }}
                />
              </div>
              
              {chain.name}

              <div 
                className='originChainItemCheck'
                style={selected ? {
                  background: chainColor ? `var(--${chainColor})` : 'var(--moon)'
                } : {}}
              >
                {selected ? svg.check(28) : null}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  render () {
    const origin = this.store('main.origins', this.props.originId)
    return (
      <div className='cardShow'>
        <div className='originSwapOrigin'>
          {svg.window(20)}
          <div className='originSwapOriginText'>{origin.name}</div>
        </div>
        <div className='originSwapTitle'>
          default chain
        </div>
        <div>{this.updateOriginChain()}</div>
        <div 
          className='clearOriginsButton'
          style={{ color: 'var(--good)' }}
          onClick={() => {
            link.send('tray:openExternal', `https://${origin.name}/`)
          }
        }>{'launch dapp'}</div>
        <div 
          className='clearOriginsButton' 
          style={{ color: 'var(--bad)', marginTop: '10px' }}
          onClick={() => {
            link.send('tray:removeOrigin', this.props.originId)
            link.send('tray:action', 'backDash')
          }}
        >
          Remove Dapp
        </div>  
      </div>
    )
  }
  
}

export default Restore.connect(DappDetails)