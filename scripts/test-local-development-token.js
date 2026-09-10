const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const vm = require('vm')
const { randomBytes } = require('crypto')

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'finney-token-test-'))
const tokenFile = path.join(directory, '.relay-token')
const env = {}
const localModule = { exports: {} }
vm.runInNewContext(
  fs.readFileSync(path.join(__dirname, 'local-development-token.js'), 'utf8'),
  {
    require,
    module: localModule,
    process: { env },
    __dirname: path.join(directory, 'scripts'),
  },
)
const getToken = localModule.exports

try {
  const override = randomBytes(32).toString('hex')
  env.FINNEY_LOCAL_RELAY_TOKEN = override
  assert.strictEqual(getToken(), override)
  assert.strictEqual(fs.existsSync(tokenFile), false)
  delete env.FINNEY_LOCAL_RELAY_TOKEN

  const token = getToken()
  assert.match(token, /^[0-9a-f]{64}$/)
  assert.strictEqual(getToken(), token)
  assert.strictEqual(fs.readFileSync(tokenFile, 'utf8'), token)

  env.FINNEY_LOCAL_RELAY_TOKEN = override
  assert.strictEqual(getToken(), override)
  assert.strictEqual(fs.readFileSync(tokenFile, 'utf8'), token)
  delete env.FINNEY_LOCAL_RELAY_TOKEN

  fs.writeFileSync(tokenFile, '')
  assert.throws(getToken, /Local relay token is empty/)
  console.log(
    'PASS: token generation, persistence, override and empty-file rejection',
  )
} finally {
  if (fs.existsSync(tokenFile)) fs.unlinkSync(tokenFile)
  fs.rmdirSync(directory)
}
