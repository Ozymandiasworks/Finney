const assert = require('assert')
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const ts = require('typescript')

const sourcePath = path.join(__dirname, '../src/cashweb/pop.ts')
const source = fs.readFileSync(sourcePath, 'utf8')
const relaySource = fs.readFileSync(
  path.join(__dirname, '../src/cashweb/relay/index.ts'),
  'utf8',
)
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2019,
    esModuleInterop: true,
  },
}).outputText
const exportsObject = {}
let constructTransactionCalls = 0
const sourceRequire = name => {
  if (name === 'assert') return require('assert')
  if (name === 'axios') return {}
  if (name === 'bitcore-lib-xec') return { Transaction: class Transaction {} }
  if (name === './bip70/paymentrequest_pb') return {}
  throw new Error(`Unexpected module request: ${name}`)
}

vm.runInNewContext(compiled, {
  exports: exportsObject,
  require: sourceRequire,
  Buffer,
  Uint8Array,
})

const wallet = {
  constructTransaction() {
    constructTransactionCalls += 1
  },
}

assert.rejects(
  () =>
    exportsObject.default.constructPaymentTransaction(wallet, {
      getOutputsList() {
        return []
      },
    }),
  new RegExp(exportsObject.legacyPaymentDisabledMessage),
)
  .then(() => {
    assert.strictEqual(constructTransactionCalls, 0)
    const handlerStart = relaySource.indexOf('if (response?.status !== 402)')
    const handlerEnd = relaySource.indexOf(
      '\n  async messagePaymentRequest',
      handlerStart,
    )
    const handler = relaySource.slice(handlerStart, handlerEnd)
    assert(
      handler.includes('throw new Error(legacyPaymentDisabledMessage)'),
      'Relay 402 handling must reject payment requests',
    )
    assert(
      !handler.includes('constructPaymentTransaction('),
      'Relay 402 handling must not construct a payment transaction',
    )
    console.log('PASS: legacy HTTP 402 requests cannot construct a payment transaction')
  })
  .catch(err => {
    process.nextTick(() => {
      throw err
    })
  })
