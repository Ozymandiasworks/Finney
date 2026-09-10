const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const level = require('level')

async function run() {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), 'finney-storage-test-'),
  )
  let database
  try {
    database = level(directory, { valueEncoding: 'json' })
    await database.open()
    await database.batch([
      { type: 'put', key: 'session', value: { revision: 1 } },
      { type: 'put', key: 'pending', value: { message: 'storage-test' } },
    ])
    await database.close()
    database = level(directory, { valueEncoding: 'json' })
    await database.open()
    assert.deepStrictEqual(await database.get('session'), { revision: 1 })
    assert.deepStrictEqual(await database.get('pending'), {
      message: 'storage-test',
    })
    await database.del('pending')
    await assert.rejects(database.get('pending'), error => error.notFound)
    console.log(
      `PASS: LevelDB batch write, reopen and delete on Node ${process.versions.node}`,
    )
  } finally {
    if (database) await database.close()
    for (const name of fs.readdirSync(directory)) {
      const file = path.join(directory, name)
      if (!fs.lstatSync(file).isFile())
        throw new Error('Unexpected test directory entry')
      fs.unlinkSync(file)
    }
    fs.rmdirSync(directory)
  }
}

run().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
