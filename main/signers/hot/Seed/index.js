const path = require('path')
const fs = require('fs')
const { app } = require('electron')
const EthTx = require('ethereumjs-tx')
const { hashPersonalMessage, toBuffer, ecsign, addHexPrefix, pubToAddress, ecrecover } = require('ethereumjs-util')
const log = require('electron-log')

const crypt = require('../../../crypt')
const store = require('../../../store')
const Signer = require('../../Signer')
const hdKey = require('ethereumjs-wallet/hdkey')
const uuid = require('uuid/v4')

// const addressSigner = (seed, index) => {
//   return hdKey.fromMasterSeed(Buffer.from(seed, 'hex')).derivePath('m/44\'/60\'/0\'/0').deriveChild(index).getWallet().getPrivateKey()
// }

class Seed extends Signer {
  constructor (signer) {
    super()
    log.info('Creating seed signer instance')
    this.type = signer.type
    this.addresses = signer.addresses
    this.seed = signer.seed
    this.unlockedSeed = ''
    this.unlock('frame')
    this.verifyAddress(0, this.addresses[0], (err, verified) => {
      if (err || !verified) return log.error(err || new Error(`Constructor of ${this.type} signer could not verify current index...`))
      log.info('Successfully verified address for initial index...')
      this.update()
    })
  }
  save () {
    const signersPath = path.resolve(app.getPath('userData'), 'signers.json')
    let storedSigners = {}

    // Try to read stored signers from disk
    try { storedSigners = JSON.parse(fs.readFileSync(signersPath, 'utf8')) }
    catch (e) { console.error(e) }

    // Add this signer to stored signers
    const { id, addresses, seed, type } = this
    storedSigners[id] = { addresses, seed, type }

    // Write to disk
    fs.writeFileSync(signersPath, JSON.stringify(storedSigners))
  }
  unlock (password) {
    crypt.decrypt(this.seed, password, (err, seed) => {
      if (err) return console.log(err)
      this.unlockedSeed = seed
    })
  }
  // Standard Methods
  signMessage (index, message, cb) {
    if (!this.unlockedSeed) return cb(new Error('Account locked'))
    const hash = hashPersonalMessage(toBuffer(message))
    const pk = hdKey.fromMasterSeed(Buffer.from(this.unlockedSeed, 'hex')).derivePath('m/44\'/60\'/0\'/0').deriveChild(index).getWallet().getPrivateKey()
    const signed = ecsign(hash, pk)
    const hex = Buffer.concat([Buffer.from(signed.r), Buffer.from(signed.s), Buffer.from([signed.v])]).toString('hex')
    cb(null, addHexPrefix(hex))
  }
  signTransaction (index, rawTx, cb) {
    if (!this.unlockedSeed) return cb(new Error('Account locked'))
    const tx = new EthTx(rawTx)
    // const addy = hdKey.fromMasterSeed(Buffer.from(this.unlockedSeed, 'hex')).derivePath('m/44\'/60\'/0\'/0').deriveChild(index).getWallet().getChecksumAddressString()
    const pk = hdKey.fromMasterSeed(Buffer.from(this.unlockedSeed, 'hex')).derivePath('m/44\'/60\'/0\'/0').deriveChild(index).getWallet().getPrivateKey()
    tx.sign(pk)
    setTimeout(() => cb(null, '0x' + tx.serialize().toString('hex')), 1000) // Response delay for development
  }
  verifyAddress (index, address, cb) {
    const message = uuid()
    this.signMessage(index, message, (err, signed) => {
      if (err) return cb(err)
      // Verify
      const signature = Buffer.from(signed.replace('0x', ''), 'hex')
      if (signature.length !== 65) cb(new Error(`Frame verifyAddress signature has incorrect length`))
      let v = signature[64]
      v = v === 0 || v === 1 ? v + 27 : v
      let r = toBuffer(signature.slice(0, 32))
      let s = toBuffer(signature.slice(32, 64))
      const hash = hashPersonalMessage(toBuffer(message))
      const verifiedAddress = '0x' + pubToAddress(ecrecover(hash, v, r, s)).toString('hex')
      cb(null, verifiedAddress.toLowerCase() === address.toLowerCase())
    })
  }
  update () {
    let id = this.addressesId()
    if (this.id !== id) { // Singer address representation changed
      store.removeSigner(this.id)
      this.id = id
    }
    store.updateSigner(this.summary())
  }
}

module.exports = Seed
