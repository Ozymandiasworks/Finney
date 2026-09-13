const assert = require('assert')
const { pbkdf2Sync } = require('crypto')
const { entropyToMnemonic, mnemonicToSeedSync, validateMnemonic } = require('bip39')

const mnemonic = entropyToMnemonic(Buffer.alloc(16))
const seed = mnemonicToSeedSync(mnemonic)
const reference = pbkdf2Sync(
  mnemonic.normalize('NFKD'),
  'mnemonic'.normalize('NFKD'),
  2048,
  64,
  'sha512',
)

assert.strictEqual(validateMnemonic(mnemonic), true)
assert.deepStrictEqual(seed, reference)
console.log('PASS: wallet mnemonic derives the standard BIP39 seed')
