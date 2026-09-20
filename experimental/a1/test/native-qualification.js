require('../guest').requireGuest('offline')

const { app, safeStorage } = require('electron')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const assert = require('assert/strict')
const { LAB_ROOT } = require('../app/policy')

const directory = fs.mkdtempSync(path.join(LAB_ROOT, 'runtime', 'a1-native-probe-'))
app.setPath('userData', directory)
app.enableSandbox()

app.whenReady().then(async () => {
  assert.equal(process.versions.electron, '44.3.0')
  assert.equal(safeStorage.isEncryptionAvailable(), true, 'DPAPI unavailable; no fallback')
  const marker = 'Finney A1 nonsecret provider qualification marker'
  const protectedMarker = safeStorage.encryptString(marker)
  assert.equal(safeStorage.decryptString(protectedMarker), marker)
  assert.throws(() => safeStorage.decryptString(Buffer.from('nonsecret invalid ciphertext')))
  const level = require('level')
  let database = level(path.join(directory, 'probe'), { valueEncoding: 'json' })
  await database.open()
  await database.batch([{ type: 'put', key: 'marker', value: { fixture: 'nonsecret', revision: 1 } }], { sync: true })
  await database.close()
  database = level(path.join(directory, 'probe'), { valueEncoding: 'json' })
  await database.open()
  assert.deepEqual(await database.get('marker'), { fixture: 'nonsecret', revision: 1 })
  await database.close()
  await assert.rejects(database.put('closed', { fixture: 'nonsecret' }))
  const loadedBinaries = Object.keys(require.cache).filter(filename => filename.endsWith('.node'))
    .map(filename => ({ filename: path.basename(filename), sha256:
      crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex') }))
  assert.ok(loadedBinaries.length > 0, 'Native backend identity not observed')
  process.stdout.write(JSON.stringify({ versions: process.versions, loadedBinaries,
    level: require('level/package.json').version, leveldown: require('leveldown/package.json').version,
    packaged: app.isPackaged, result: 'nonsecret-probe-pass',
    limitation: 'Clean reopen only; not wallet custody, durability, unavailable-provider or OS-crash acceptance' }) + '\n')
  app.quit()
}).catch(error => { process.stderr.write(`${error.code || 'NATIVE_QUALIFICATION_FAILED'}\n`); app.exit(1) })
