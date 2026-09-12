const assert = require('assert')
const { randomBytes } = require('crypto')
const net = require('net')
const path = require('path')
const { spawn } = require('child_process')
const axios = require('axios')
const { SignedPayload } = require('../src/cashweb/signed_payload/payload_pb')

function getPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      server.close(error => {
        if (error) return reject(error)
        resolve(address.port)
      })
    })
  })
}

async function waitForHealth(url) {
  let lastError
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await axios.get(url, { timeout: 250 })
      if (response.status === 200) return
    } catch (error) {
      lastError = error
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw lastError || new Error('local services did not start')
}

async function expectStatus(request, status) {
  try {
    await request()
  } catch (error) {
    assert.strictEqual(error.response?.status, status)
    return
  }
  assert.fail(`expected HTTP ${status}`)
}

async function main() {
  const relayPort = await getPort()
  const registryPort = await getPort()
  const token = randomBytes(24).toString('hex')
  const server = spawn(process.execPath, ['local-services/server.js'], {
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      FINNEY_RELAY_PORT: String(relayPort),
      FINNEY_REGISTRY_PORT: String(registryPort),
      FINNEY_LOCAL_RELAY_TOKEN: token,
    },
    stdio: 'ignore',
  })

  try {
    const relayUrl = `http://127.0.0.1:${relayPort}`
    const registryUrl = `http://127.0.0.1:${registryPort}`
    await Promise.all([
      waitForHealth(`${relayUrl}/health`),
      waitForHealth(`${registryUrl}/health`),
    ])

    const rawPayload = Buffer.from(new SignedPayload().serializeBinary())
    const headers = { Authorization: token }

    await expectStatus(
      () => axios.put(`${relayUrl}/profiles/test-address`, rawPayload),
      401,
    )
    await axios.put(`${relayUrl}/profiles/test-address`, rawPayload, { headers })
    const profile = await axios.get(`${relayUrl}/profiles/test-address`, {
      responseType: 'arraybuffer',
    })
    assert.deepStrictEqual(Buffer.from(profile.data), rawPayload)

    await expectStatus(
      () => axios.put(`${registryUrl}/keys/test-address`, rawPayload),
      401,
    )
    await axios.put(`${registryUrl}/keys/test-address`, rawPayload, { headers })
    const key = await axios.get(`${registryUrl}/keys/test-address`, {
      responseType: 'arraybuffer',
    })
    assert.deepStrictEqual(Buffer.from(key.data), rawPayload)

    console.log('PASS: local relay and registry HTTP authorization and binary payloads')
  } finally {
    server.kill()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
