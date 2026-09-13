const assert = require('assert')
const { deps } = require('../local_modules/bitcore-lib-xec')

const BN = deps.bnjs
const packagePath = require.resolve('bn.js/package.json')

assert.strictEqual(require(packagePath).version, '4.12.3')
assert.strictEqual(new BN(42).imaskn(0).toString(), '0')
assert.strictEqual(new BN(42).imaskn(0).toString(16), '0')
console.log('PASS: XEC bn.js zero-bit mask remains usable')
