const assert = require('assert')
const fs = require('fs')
const Module = require('module')
const path = require('path')
const ts = require('typescript')
const { PrivateKey } = require('bitcore-lib-xec')

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

const { RelayClient } = require('../src/cashweb/relay/index.ts')
const privateKey = new PrivateKey()
const output = {
  type: 'stamp',
  address: privateKey.toAddress().toCashAddress(),
  satoshis: 546,
  txId: '00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff',
  outputIndex: 1,
  privKey: privateKey,
}

function clientFor(utxos) {
  return {
    wallet: {
      chronikClient: {
        address(address) {
          assert.strictEqual(address, output.address)
          return {
            async utxos() {
              return { utxos }
            },
          }
        },
      },
    },
  }
}

async function validate(utxos) {
  return RelayClient.prototype.validateReceivedOutput.call(
    clientFor(utxos),
    output,
  )
}

;(async () => {
  const valid = await validate([
    {
      outpoint: { txid: output.txId, outIdx: output.outputIndex },
      sats: BigInt(output.satoshis),
      blockHeight: 42,
    },
  ])
  assert(valid)
  assert.strictEqual(valid.confirmed, true)
  assert.strictEqual(valid.utxo.privKey, privateKey)

  const wrongOutpoint = await validate([
    {
      outpoint: { txid: output.txId, outIdx: output.outputIndex + 1 },
      sats: BigInt(output.satoshis),
      blockHeight: 42,
    },
  ])
  assert.strictEqual(wrongOutpoint, null)

  const wrongAmount = await validate([
    {
      outpoint: { txid: output.txId, outIdx: output.outputIndex },
      sats: BigInt(output.satoshis + 1),
      blockHeight: 42,
    },
  ])
  assert.strictEqual(wrongAmount, null)

  const mempool = await validate([
    {
      outpoint: { txid: output.txId, outIdx: output.outputIndex },
      sats: BigInt(output.satoshis),
      blockHeight: -1,
    },
  ])
  assert(mempool)
  assert.strictEqual(mempool.confirmed, false)

  console.log('PASS: received outputs require exact Chronik outpoint and value')
})().catch(err => {
  console.error(err)
  process.exitCode = 1
})
