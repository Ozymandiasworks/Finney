const assert = require('assert')
const { PrivateKey, Script, Transaction } = require('../local_modules/bitcore-lib-xec')

const sender = new PrivateKey()
const recipient = new PrivateKey()
const senderAddress = sender.toAddress()
const transaction = new Transaction()
  .from({
    txId: '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
    outputIndex: 0,
    address: senderAddress.toString(),
    script: Script.buildPublicKeyHashOut(senderAddress).toHex(),
    satoshis: 100000,
  })
  .to(recipient.toAddress(), 90000)
  .fee(1000)
  .sign(sender)

const signatures = transaction.getSignatures(sender)
assert.strictEqual(transaction.isFullySigned(), true)
assert.strictEqual(signatures.length, 1)
assert.strictEqual(
  transaction.inputs[0].isValidSignature(transaction, signatures[0]),
  true,
)
console.log('PASS: XEC P2PKH transaction signs and verifies')
