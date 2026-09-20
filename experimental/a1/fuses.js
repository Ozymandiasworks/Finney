const { refuse } = require('./app/policy')

const SENTINEL = Buffer.from('dL7pKGdnNz796PbbjQWNKmHXBZaB9tsX')
const REQUIRED = Object.freeze({ 0: 0x30, 2: 0x30, 3: 0x30, 5: 0x31, 7: 0x30 })

function locate(buffer) {
  const position = buffer.indexOf(SENTINEL)
  if (position < 0 || buffer.indexOf(SENTINEL, position + 1) !== -1) refuse('INVALID_FUSE_SENTINEL')
  const header = position + SENTINEL.length
  const length = buffer[header + 1]
  if (buffer[header] !== 1 || length !== 9 || buffer.length < header + 2 + length) {
    refuse('UNSUPPORTED_FUSE_SCHEMA')
  }
  for (let index = 0; index < length; index++) {
    if (![0x30, 0x31, 0x72].includes(buffer[header + 2 + index])) refuse('INVALID_FUSE_STATE')
  }
  return header + 2
}

function restrictFuses(buffer) {
  const position = locate(buffer)
  for (const index of Object.keys(REQUIRED)) {
    if (buffer[position + Number(index)] === 0x72) refuse('REQUIRED_FUSE_REMOVED')
  }
  const updated = Buffer.from(buffer)
  for (const [index, state] of Object.entries(REQUIRED)) updated[position + Number(index)] = state
  verifyFuses(updated)
  return updated
}

function verifyFuses(buffer) {
  const position = locate(buffer)
  for (const [index, state] of Object.entries(REQUIRED)) {
    if (buffer[position + Number(index)] !== state) refuse('UNSAFE_FUSE_STATE')
  }
}

module.exports = { restrictFuses, verifyFuses }
