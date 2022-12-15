import React, { useEffect, useRef, useState, useCallback } from 'react'
import Restore from 'react-restore'

import link from '../../../../../resources/link'
import { debounce } from '../../../../../resources/utils'
import RingIcon from '../../../../../resources/Components/RingIcon'
import { ethers } from 'ethers'
import zxcvbn from 'zxcvbn'

const removeLineBreaks = (str) => str.replace(/(\r\n|\n|\r)/gm, '')

const navForward = async (accountData) =>
  link.send('nav:forward', 'dash', {
    view: 'accounts',
    data: {
      showAddAccounts: true,
      newAccountType: 'seed',
      accountData
    }
  })

//TODO: CSS & class names...
function Boilerplate({ children }) {
  let itemClass = 'addAccountItem addAccountItemSmart addAccountItemAdding'

  return (
    <div className={itemClass}>
      <div className='addAccountItemBar addAccountItemHot' />
      <div className='addAccountItemWrap'>
        <div className='addAccountItemTop'>
          <div className='addAccountItemTopType'>
            <div className='addAccountItemIcon'>
              <div className='addAccountItemIconType addAccountItemIconHot'>
                <RingIcon svgName={'seedling'} />
              </div>
              <div className='addAccountItemIconHex addAccountItemIconHexHot' />
            </div>
            <div className='addAccountItemTopTitle'>Seed Phrase</div>
          </div>
          {/* <div className='addAccountItemClose' onMouseDown={() => this.props.close()}>{'DONE'}</div> */}
          <div className='addAccountItemSummary'>
            A phrase account uses a list of words to backup and restore your account
          </div>
        </div>
        <div className='addAccountItemOption'>
          <div
            className='addAccountItemOptionIntro'
            onMouseDown={() => {
              this.adding()
              setTimeout(
                () =>
                  link.send('tray:action', 'navDash', {
                    view: 'notify',
                    data: { notify: 'hotAccountWarning', notifyData: {} }
                  }),
                800
              )
            }}
          >
            Add Phrase Account
          </div>
          <div className='addAccountItemOptionSetupFrames'>{children}</div>
        </div>
        <div className='addAccountItemFooter' />
      </div>
    </div>
  )
}

const EnterPhrase = () => {
  const [phrase, setPhrase] = useState('')
  const [error, setError] = useState(null)

  const isValidMnemonic = () => ethers.utils.isValidMnemonic(phrase)

  const updateInput = (e) => {
    const value = removeLineBreaks(e.target.value)
    setPhrase(value)
  }

  const handleSubmit = (e) => {
    if (e?.type !== 'mousedown' && e?.key !== 'Enter') {
      return
    }

    if (!isValidMnemonic()) {
      return setError('INVALID SEED PHRASE')
    }

    return navForward({
      phrase
    })
  }

  return (
    <div className='addAccountItemOptionSetupFrame'>
      <div className='addAccountItemOptionTitle'>seed phrase</div>
      {error && <>{error}</>}
      <div className='addAccountItemOptionInputPhrase'>
        <textarea tabIndex='-1' value={phrase} onChange={updateInput} onKeyDown={handleSubmit} />
      </div>
      <div className='addAccountItemOptionSubmit' onMouseDown={handleSubmit}>
        Next
      </div>
    </div>
  )
}

function PasswordInput({ getError, nextStep, title, buttonText }) {
  const [error, setError] = useState(null)
  const [ready, setReady] = useState(false)
  const inputRef = useRef(null)

  const debounceInput = useCallback(
    debounce(() => {
      const {
        current: { value }
      } = inputRef
      const err = getError(value)
      if (value) {
        setError(err)
        setReady(!err)
      }
    }, 500),
    [debounce]
  )

  useEffect(() => {
    inputRef.current.addEventListener('input', debounceInput)
    //TODO: Do we need to do this, does react handle it?
    // return () => {
    //   inputRef.current.removeEventListener('input', debounceInput)
    // }
  })

  const resetState = () => {
    setReady(false)
    setError('')
  }

  const handleSubmit = () => {
    const {
      current: { value }
    } = inputRef
    const passwordError = getError(value)
    if (passwordError) return setError(passwordError)
    resetState()
    nextStep(value)
  }

  return (
    <div style={{ textAlign: 'center', width: '100%' }} className='addAccountItemOptionSetupFrame'>
      <div className='addAccountItemOptionTitle'>{title}</div>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <div className='addAccountItemOptionInputPhrase addAccountItemOptionInputPassword'>
        <div className='addAccountItemOptionSubtitle'>password must be 12 characters or longer</div>
        <form onSubmit={handleSubmit}>
          <input
            autoFocus
            type='password'
            tabIndex='-1'
            ref={inputRef}
            onChange={() => {
              setError('')
              setReady(false)
            }}
          />
        </form>
      </div>
      {/* TODO: Maybe use CSS to make button clearly un-clickable rather than dissappearing? */}
      {ready && (
        <div className={'addAccountItemOptionSubmit'} onMouseDown={handleSubmit}>
          {buttonText}
        </div>
      )}
    </div>
  )
}

function CreatePassword({ phrase }) {
  const title = 'Create Password'
  const buttonText = 'Continue'

  const getError = (password) => {
    if (password.length < 12) return 'PASSWORD MUST BE AT LEAST 12 CHARACTERS LONG'
    const {
      feedback: { warning },
      score
    } = zxcvbn(password)
    if (score > 3) return

    return (warning || 'PLEASE ENTER A STRONGER PASSWORD').toUpperCase()
  }

  const nextStep = (password) =>
    navForward({
      phrase,
      password
    })

  return <PasswordInput {...{ getError, phrase, nextStep, title, buttonText }} />
}

function ConfirmPassword({ password, phrase }) {
  const title = 'Confirm Password'
  const buttonText = 'create'

  const getError = (confirmedPassword) => {
    if (password !== confirmedPassword) return 'PASSWORDS DO NOT MATCH'
  }

  //TODO: Finish this last step...  show an overview screen like with the watch accounts (button to go back // button to view new added account)?
  const nextStep = (password) =>
    link.rpc('createFromPhrase', phrase, password, (err, signer) => {
      return navForward({
        error: err,
        signerId: signer?.id
      })
    })

  return <PasswordInput {...{ getError, phrase, nextStep, title, buttonText }} />
}

function Summary({ err, signerId }) {
  return (
    <div style={{ textAlign: 'center', width: '100%' }} className='addAccountItemOptionSetupFrame'>
      {err ? (
        <>
          <div className='addAccountItemOptionTitle'>{err}</div>
          <div
            role='button'
            className='addAccountItemOptionSubmit'
            onClick={() => link.send('nav:back', 'dash', 3)}
          >
            try again
          </div>
        </>
      ) : (
        <>
          <div className='addAccountItemOptionTitle'>{'account added successfully'}</div>
          <div
            role='button'
            className='addAccountItemOptionSubmit'
            onClick={() => {
              link.send('nav:back', 'dash', 5)
              link.send(`nav:forward`, 'dash', {
                view: 'expandedSigner',
                data: { signer: signerId }
              })
            }}
          >
            open account
          </div>
          <div
            role='button'
            className='addAccountItemOptionSubmit'
            onClick={() => link.send('nav:back', 'dash', 5)}
          >
            back
          </div>
        </>
      )}
    </div>
  )
}

class AddPhrase extends React.Component {
  constructor(...args) {
    super(...args)
  }

  getCurrentView({ phrase, password, err, signerId }) {
    if (err || signerId) return <Summary {...{ err, signerId }} />
    if (!phrase) return <EnterPhrase />
    if (!password) return <CreatePassword {...{ phrase }} />
    return <ConfirmPassword {...{ phrase, password }} />
  }

  render() {
    const { accountData } = this.props
    return <Boilerplate>{this.getCurrentView(accountData)}</Boilerplate>
  }
}

export default Restore.connect(AddPhrase)
