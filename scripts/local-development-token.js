const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

module.exports = function getLocalDevelopmentToken() {
  if (process.env.FINNEY_LOCAL_RELAY_TOKEN) {
    return process.env.FINNEY_LOCAL_RELAY_TOKEN
  }

  const tokenFile = path.join(__dirname, '..', '.relay-token')
  try {
    fs.writeFileSync(tokenFile, crypto.randomBytes(32).toString('hex'), {
      flag: 'wx',
      mode: 0o600,
    })
  } catch (err) {
    if (err.code !== 'EEXIST') throw err
  }

  const token = fs.readFileSync(tokenFile, 'utf8').trim()
  if (!token) throw new Error('Local relay token is empty')
  return token
}
