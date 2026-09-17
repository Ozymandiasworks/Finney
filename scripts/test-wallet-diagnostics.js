const assert = require('assert')
const fs = require('fs')
const Module = require('module')
const path = require('path')
const ts = require('typescript')
const { PrivateKey, Script, Transaction } = require('bitcore-lib-xec')

const root = path.join(__dirname, '..')
process.env.NODE_PATH = root
Module._initPaths()

require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
      esModuleInterop: true,
    },
  }).outputText
  module._compile(compiled, filename)
}

const { Wallet } = require('../src/cashweb/wallet/index.ts')
const privateKey = new PrivateKey()
const utxo = {
  txId: '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
  outputIndex: 0,
  address: privateKey.toAddress().toString(),
  privKey: privateKey,
  satoshis: 100000,
  type: 'p2pkh',
}
const wallet = Object.create(Wallet.prototype)
wallet.storage = {
  getUtxoMap() {
    return new Map([['test', utxo]])
  },
  freezeById() {},
}
wallet.finalizeTransaction = ({ transaction }) => transaction

const calls = []
const originalLog = console.log
console.log = (...args) => calls.push(args)
try {
  Wallet.prototype.constructTransaction.call(wallet, {
    outputs: [
      new Transaction.Output({
        script: Script.buildPublicKeyHashOut(privateKey.toAddress()),
        satoshis: 1000,
      }),
    ],
  })
} finally {
  console.log = originalLog
}

assert.strictEqual(
  calls.some(args => args.some(value => value === utxo || value?.privKey)),
  false,
)
console.log('PASS: wallet transaction construction does not log key-bearing UTXOs')
