const assert = require('assert')
const baseX = require('base-x')

const alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const codec = baseX(alphabet)
const packagePath = require.resolve('base-x/package.json')
const payload = Buffer.from('00112233445566778899aabbccddeeff', 'hex')

assert.strictEqual(require(packagePath).version, '3.0.11')
assert.deepStrictEqual(codec.decode(codec.encode(payload)), payload)
assert.throws(() => codec.decode('ABC\\u0100DEF'), /Non-base58 character/)
console.log('PASS: Base58 rejects high Unicode character codes')
