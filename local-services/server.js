'use strict'

// Finney local protocol services (development only).
//
// This process intentionally binds only to 127.0.0.1 and stores everything in
// memory. It exists to validate the migrated Stamp/CashWeb client before any
// public relay, persistence layer, or real relay-access payment is introduced.

const http = require('http')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const { WebSocketServer, WebSocket } = require('ws')
const {
  PublicKey,
  Networks,
  Transaction,
  HDPublicKey,
  PrivateKey,
  crypto: bitcoreCrypto,
} = require('../local_modules/bitcore-lib-xec')

const relayPb = require('../src/cashweb/relay/relay_pb')
const wrapperPb = require('../src/cashweb/signed_payload/payload_pb')

const HOST = '127.0.0.1'
const RELAY_PORT = Number(process.env.FINNEY_RELAY_PORT || 31337)
const REGISTRY_PORT = Number(process.env.FINNEY_REGISTRY_PORT || 31338)
const TOKEN = require('../scripts/local-development-token')()
const NETWORK = 'xec-livenet'

// The Electron renderer registers this explicit eCash network during Quasar
// boot. The standalone local relay is a separate Node process, so it must
// register the same network itself before it can turn identity public keys
// into ecash: addresses or derive recipient-spendable stamp keys. alpha.13
// omitted this registration, which made every real message fail HTTP 400
// with an invalid/unknown-network error after its stamp transaction broadcast.
if (!Networks.get(NETWORK)) {
  Networks.add({
    name: NETWORK,
    alias: 'xec-mainnet',
    prefix: 'ecash',
    pubkeyhash: 0,
    privatekey: 0x80,
    scripthash: 5,
    xpubkey: 0x0488b21e,
    xprivkey: 0x0488ade4,
    networkMagic: 0xe3e1f3e8,
    port: 8333,
    dnsSeeds: [],
  })
}
const SERVICE_LOG = path.resolve(__dirname, '..', 'finney-local-services.log')

function serviceLog(line) {
  try {
    fs.appendFileSync(SERVICE_LOG, `${new Date().toISOString()} ${line}\n`)
  } catch (_) {
    // Development diagnostics must never take down the relay.
  }
}

try {
  fs.writeFileSync(SERVICE_LOG, `${new Date().toISOString()} Finney local services started\n`)
} catch (_) {}

const MAX_PROFILE_BYTES = 2 * 1024 * 1024
const MAX_MESSAGE_SET_BYTES = 8 * 1024 * 1024
const MAX_REGISTRY_BYTES = 2 * 1024 * 1024
const MAX_FORUM_BYTES = 2 * 1024 * 1024

const profiles = new Map()
const mailboxes = new Map()
const payloads = new Map()
const registryKeys = new Map()
const forumMessages = new Map()
const sockets = new Map()

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type')
  res.setHeader('Cache-Control', 'no-store')
}

function send(res, status, body, contentType = 'application/octet-stream') {
  cors(res)
  res.statusCode = status
  res.setHeader('Content-Type', contentType)
  res.end(body)
}

function json(res, status, value) {
  send(res, status, Buffer.from(JSON.stringify(value)), 'application/json')
}

function isAuthorized(req, url) {
  const header = req.headers.authorization
  const query = url.searchParams.get('access_token')
  return header === TOKEN || query === TOKEN
}

function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', chunk => {
      size += chunk.length
      if (size > maxBytes) {
        reject(Object.assign(new Error('request too large'), { statusCode: 413 }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function normalizeAddress(raw) {
  try {
    return decodeURIComponent(raw)
  } catch (_) {
    return raw
  }
}

function digestHex(bytes) {
  return Buffer.from(bytes).toString('hex')
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(Buffer.from(bytes)).digest()
}

function addressFromPubKey(bytes) {
  return PublicKey.fromBuffer(Buffer.from(bytes))
    .toAddress(NETWORK)
    .toCashAddress()
}

function verifyMessageEnvelope(message, destinationAddress) {
  const destinationKey = message.getDestinationPublicKey_asU8()
  if (!destinationKey || destinationKey.length === 0) {
    throw new Error('missing destination public key')
  }
  if (addressFromPubKey(destinationKey) !== destinationAddress) {
    throw new Error('destination address does not match message public key')
  }

  const payload = message.getPayload_asU8()
  const claimedDigest = message.getPayloadDigest_asU8()
  if (payload.length > 0) {
    const computed = sha256(payload)
    if (claimedDigest.length > 0 && !computed.equals(Buffer.from(claimedDigest))) {
      throw new Error('payload digest mismatch')
    }
    // Old constructors do not always populate payload_digest before the relay.
    // Normalize it here so retrieval and deletion have a stable identifier.
    if (claimedDigest.length === 0) {
      message.setPayloadDigest(computed)
    }
  }

  return digestHex(message.getPayloadDigest_asU8())
}

// Verify the original recipient-spendable stamp address derivation locally.
// This does not yet prove the transaction was accepted by XEC consensus; the
// recipient client still performs its own blockchain/UTXO checks. Production
// relay validation will add an XEC indexer check after this baseline works.
function verifyStampCommitment(message) {
  const stamp = message.getStamp()
  if (!stamp || stamp.getStampOutpointsList().length === 0) {
    return { total: 0, outputs: 0 }
  }

  const payloadDigest = Buffer.from(message.getPayloadDigest_asU8())
  const destinationPublicKey = PublicKey.fromBuffer(
    Buffer.from(message.getDestinationPublicKey_asU8()),
  )
  const digestPrivateKey = PrivateKey.fromBuffer(payloadDigest, NETWORK)
  const digestPublicKey = digestPrivateKey.toPublicKey()
  const stampPublicKey = PublicKey.fromPoint(
    digestPublicKey.point.add(destinationPublicKey.point),
  )
  const stampHdPublicKey = new HDPublicKey({
    publicKey: stampPublicKey.toBuffer(),
    depth: 0,
    network: NETWORK,
    childIndex: 0,
    chainCode: payloadDigest,
    parentFingerPrint: 0,
  })
    .deriveChild(44)
    .deriveChild(145)

  let total = 0
  let outputs = 0
  for (const [txIndex, stampOutpoints] of stamp
    .getStampOutpointsList()
    .entries()) {
    const tx = new Transaction(Buffer.from(stampOutpoints.getStampTx_asU8()))
    const txKey = stampHdPublicKey.deriveChild(txIndex)
    for (const [outputOrdinal, vout] of stampOutpoints
      .getVoutsList()
      .entries()) {
      if (vout >= tx.outputs.length) {
        throw new Error('stamp output index out of range')
      }
      const derivedPubKey = txKey.deriveChild(outputOrdinal).publicKey
      const expectedAddress = new PublicKey(
        bitcoreCrypto.Point.pointToCompressed(derivedPubKey.point),
      ).toAddress(NETWORK)
      const actualAddress = tx.outputs[vout].script.toAddress(NETWORK)
      if (!actualAddress.toBuffer().equals(expectedAddress.toBuffer())) {
        throw new Error('stamp output does not match recipient commitment')
      }
      total += tx.outputs[vout].satoshis
      outputs += 1
    }
  }
  return { total, outputs }
}

function messagePage(messages) {
  const page = new relayPb.MessagePage()
  page.setMessagesList(messages)
  if (messages.length > 0) {
    const first = messages[0]
    const last = messages[messages.length - 1]
    page.setStartTime(first.getReceivedTime())
    page.setEndTime(last.getReceivedTime())
    page.setStartDigest(first.getPayloadDigest_asU8())
    page.setEndDigest(last.getPayloadDigest_asU8())
  }
  return Buffer.from(page.serializeBinary())
}

function notifyMailbox(address, message) {
  const clients = sockets.get(address)
  if (!clients) return
  const raw = Buffer.from(message.serializeBinary())
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(raw)
    }
  }
}

async function relayHandler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return send(res, 204, Buffer.alloc(0))

  const url = new URL(req.url, `http://${HOST}:${RELAY_PORT}`)
  const parts = url.pathname.split('/').filter(Boolean)

  if (req.method === 'GET' && url.pathname === '/health') {
    return json(res, 200, {
      service: 'finney-local-relay',
      status: 'ok',
      profiles: profiles.size,
      mailboxes: mailboxes.size,
    })
  }

  if (parts[0] === 'profiles' && parts[1]) {
    const address = normalizeAddress(parts.slice(1).join('/'))
    if (req.method === 'GET') {
      const raw = profiles.get(address)
      return raw ? send(res, 200, raw) : send(res, 404, Buffer.alloc(0))
    }
    if (req.method === 'PUT') {
      if (!isAuthorized(req, url)) return send(res, 401, Buffer.alloc(0))
      const raw = await readBody(req, MAX_PROFILE_BYTES)
      wrapperPb.SignedPayload.deserializeBinary(raw)
      profiles.set(address, raw)
      return send(res, 204, Buffer.alloc(0))
    }
  }

  // Development-only preflight. It runs the exact same envelope/stamp
  // validation as delivery, but does not store or notify anything. This lets
  // the client prove that the relay will accept a paid message BEFORE the XEC
  // transaction is broadcast.
  if (parts[0] === 'validate' && parts[1] === 'messages' && parts[2] && req.method === 'PUT') {
    const address = normalizeAddress(parts.slice(2).join('/'))
    const raw = await readBody(req, MAX_MESSAGE_SET_BYTES)
    const set = relayPb.MessageSet.deserializeBinary(raw)
    const incoming = set.getMessagesList()
    if (incoming.length === 0) return send(res, 400, Buffer.from('empty message set'))
    for (const message of incoming) {
      verifyMessageEnvelope(message, address)
      verifyStampCommitment(message)
    }
    serviceLog(`[preflight] accepted ${incoming.length} message(s) for ${address}`)
    return send(res, 204, Buffer.alloc(0))
  }

  if (parts[0] === 'messages' && parts[1]) {
    const address = normalizeAddress(parts.slice(1).join('/'))
    if (req.method === 'GET') {
      if (!isAuthorized(req, url)) return send(res, 401, Buffer.alloc(0))
      const start = Number(url.searchParams.get('start_time') || 0)
      const end = Number(url.searchParams.get('end_time') || Number.MAX_SAFE_INTEGER)
      const mailbox = mailboxes.get(address) || []
      const selected = mailbox.filter(message => {
        const t = message.getReceivedTime()
        return t >= start && t <= end
      })
      return send(res, 200, messagePage(selected))
    }

    if (req.method === 'PUT') {
      const raw = await readBody(req, MAX_MESSAGE_SET_BYTES)
      const set = relayPb.MessageSet.deserializeBinary(raw)
      const incoming = set.getMessagesList()
      if (incoming.length === 0) return send(res, 400, Buffer.from('empty message set'))

      const mailbox = mailboxes.get(address) || []
      for (const message of incoming) {
        const digest = verifyMessageEnvelope(message, address)
        const stamp = verifyStampCommitment(message)
        message.setReceivedTime(Date.now())
        const payload = message.getPayload_asU8()
        if (digest && payload.length > 0) payloads.set(`${address}:${digest}`, Buffer.from(payload))

        // Deduplicate by payload digest. This also makes client retries safe.
        const exists = mailbox.some(existing =>
          Buffer.from(existing.getPayloadDigest_asU8()).equals(
            Buffer.from(message.getPayloadDigest_asU8()),
          ),
        )
        if (!exists) {
          mailbox.push(message)
          notifyMailbox(address, message)
          const acceptedLine =
            `[relay] accepted ${digest || '<no-digest>'} for ${address} ` +
            `(${stamp.total} sat stamp across ${stamp.outputs} output(s))`
          console.log(acceptedLine)
          serviceLog(acceptedLine)
        }
      }
      mailboxes.set(address, mailbox)
      return send(res, 204, Buffer.alloc(0))
    }

    if (req.method === 'DELETE') {
      if (!isAuthorized(req, url)) return send(res, 401, Buffer.alloc(0))
      const digest = url.searchParams.get('digest') || ''
      const mailbox = mailboxes.get(address) || []
      mailboxes.set(
        address,
        mailbox.filter(
          message => digestHex(message.getPayloadDigest_asU8()) !== digest,
        ),
      )
      payloads.delete(`${address}:${digest}`)
      return send(res, 204, Buffer.alloc(0))
    }
  }

  if (parts[0] === 'payloads' && parts[1] && req.method === 'GET') {
    if (!isAuthorized(req, url)) return send(res, 401, Buffer.alloc(0))
    const address = normalizeAddress(parts.slice(1).join('/'))
    const digest = url.searchParams.get('digest') || ''
    const raw = payloads.get(`${address}:${digest}`)
    return raw ? send(res, 200, raw) : send(res, 404, Buffer.alloc(0))
  }

  return send(res, 404, Buffer.alloc(0))
}

async function registryHandler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return send(res, 204, Buffer.alloc(0))

  const url = new URL(req.url, `http://${HOST}:${REGISTRY_PORT}`)
  const parts = url.pathname.split('/').filter(Boolean)

  if (req.method === 'GET' && url.pathname === '/health') {
    return json(res, 200, {
      service: 'finney-local-registry',
      status: 'ok',
      keys: registryKeys.size,
      forumMessages: forumMessages.size,
    })
  }

  if (parts[0] === 'keys' && parts[1]) {
    const address = normalizeAddress(parts.slice(1).join('/'))
    if (req.method === 'GET') {
      const raw = registryKeys.get(address)
      return raw ? send(res, 200, raw) : send(res, 404, Buffer.alloc(0))
    }
    if (req.method === 'PUT') {
      if (!isAuthorized(req, url)) return send(res, 401, Buffer.alloc(0))
      const raw = await readBody(req, MAX_REGISTRY_BYTES)
      wrapperPb.SignedPayload.deserializeBinary(raw)
      registryKeys.set(address, raw)
      return send(res, 204, Buffer.alloc(0))
    }
  }

  if (parts[0] === 'messages' && !parts[1]) {
    if (req.method === 'GET') {
      const from = Number(url.searchParams.get('from') || 0)
      const to = Number(url.searchParams.get('to') || Number.MAX_SAFE_INTEGER)
      const topic = url.searchParams.get('topic') || ''
      const set = new wrapperPb.SignedPayloadSet()
      for (const item of forumMessages.values()) {
        // Keep the local baseline deliberately permissive; the client performs
        // the forum-specific parse. Topic/time indexing is deferred until the
        // forum path is part of the test milestone.
        if (topic || from || to) set.addItems(item)
      }
      return send(res, 200, Buffer.from(set.serializeBinary()))
    }
    if (req.method === 'PUT') {
      const raw = await readBody(req, MAX_FORUM_BYTES)
      const item = wrapperPb.SignedPayload.deserializeBinary(raw)
      const payload = item.getPayload_asU8()
      const digest = payload.length ? sha256(payload).toString('hex') : sha256(raw).toString('hex')
      forumMessages.set(digest, item)
      return send(res, 204, Buffer.alloc(0))
    }
  }

  if (parts[0] === 'messages' && parts[1] && req.method === 'GET') {
    const item = forumMessages.get(parts[1])
    return item
      ? send(res, 200, Buffer.from(item.serializeBinary()))
      : send(res, 404, Buffer.alloc(0))
  }

  return send(res, 404, Buffer.alloc(0))
}

function safeHandler(handler) {
  return (req, res) => {
    Promise.resolve(handler(req, res)).catch(err => {
      const status = err.statusCode || 400
      const line = `[local-services] ${req.method} ${req.url}: ${err.message || 'error'}`
      console.error(line)
      serviceLog(line)
      if (!res.headersSent) send(res, status, Buffer.from(err.message || 'error'))
      else res.end()
    })
  }
}

const relayServer = http.createServer(safeHandler(relayHandler))
const registryServer = http.createServer(safeHandler(registryHandler))
const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_SET_BYTES })

relayServer.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, `http://${HOST}:${RELAY_PORT}`)
  const parts = url.pathname.split('/').filter(Boolean)
  if (parts[0] !== 'ws' || !parts[1] || !isAuthorized(req, url)) {
    socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n')
    socket.destroy()
    return
  }
  const address = normalizeAddress(parts.slice(1).join('/'))
  wss.handleUpgrade(req, socket, head, ws => {
    ws.finneyAddress = address
    wss.emit('connection', ws, req)
  })
})

wss.on('connection', ws => {
  const address = ws.finneyAddress
  const set = sockets.get(address) || new Set()
  set.add(ws)
  sockets.set(address, set)
  console.log(`[relay] websocket open for ${address}`)
  ws.on('close', () => {
    set.delete(ws)
    if (set.size === 0) sockets.delete(address)
  })
})

function listen(server, port, label) {
  server.listen(port, HOST, () => {
    console.log(`${label}: http://${HOST}:${port}`)
  })
  server.on('error', err => {
    console.error(`${label} failed:`, err.message)
    process.exitCode = 1
  })
}

console.log('Finney local services (development only)')
console.log('Storage: memory only; nothing is persisted after this process exits.')
console.log('Binding: loopback only (127.0.0.1).')
console.log(`Diagnostics: ${SERVICE_LOG}`)
listen(relayServer, RELAY_PORT, 'Relay')
listen(registryServer, REGISTRY_PORT, 'Registry')

function shutdown() {
  console.log('\nStopping Finney local services...')
  for (const set of sockets.values()) for (const ws of set) ws.close()
  relayServer.close()
  registryServer.close()
  setTimeout(() => process.exit(0), 100).unref()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
