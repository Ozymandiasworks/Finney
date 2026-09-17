#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const root = path.resolve(__dirname, '..')
let failed = false

function walk(target, extensions = null) {
  const absolute = path.join(root, target)
  if (!fs.existsSync(absolute)) return []
  const stat = fs.statSync(absolute)
  if (stat.isFile()) return [absolute]
  const out = []
  for (const name of fs.readdirSync(absolute)) {
    if (name === 'node_modules' || name === '.git' || name === 'dist') continue
    const full = path.join(absolute, name)
    const childStat = fs.statSync(full)
    if (childStat.isDirectory()) out.push(...walk(path.relative(root, full), extensions))
    else if (!extensions || extensions.includes(path.extname(full))) out.push(full)
  }
  return out
}

function checkAbsent(description, regex, targets, extensions = null) {
  const matches = []
  for (const target of targets) {
    for (const file of walk(target, extensions)) {
      let text
      try {
        text = fs.readFileSync(file, 'utf8')
      } catch (_) {
        continue
      }
      const lines = text.split(/\r?\n/)
      lines.forEach((line, index) => {
        if (regex.test(line)) {
          matches.push(`${path.relative(root, file)}:${index + 1}: ${line.trim()}`)
        }
        regex.lastIndex = 0
      })
    }
  }
  if (matches.length) {
    failed = true
    console.error(`FAIL: ${description}`)
    matches.slice(0, 20).forEach(match => console.error(`  ${match}`))
  } else {
    console.log(`PASS: ${description}`)
  }
}

checkAbsent(
  'obsolete Lotus public infrastructure is absent from active app configuration',
  /https:\/\/chronik\.be\.cash\/xpi|https:\/\/mainnet-relay\.cashweb\.io|https:\/\/mainnet-keyserver\.cashweb\.io|explorer\.givelotus|t\.me\/givelotus/,
  ['src', 'src-electron', 'quasar.conf.js', 'package.json'],
)

checkAbsent(
  'active source no longer imports bitcore-lib-xpi',
  /from ['"]bitcore-lib-xpi['"]|app\/local_modules\/bitcore-lib-xpi/,
  ['src', 'test', 'package.json', 'yarn.lock'],
)

checkAbsent(
  'old one-XPI raw-unit literals are absent from application TypeScript/Vue source',
  /1_000_000|1000000/,
  ['src'],
  ['.ts', '.vue'],
)

checkAbsent(
  'no known broad-replacement artifacts remain',
  /eXEC|XECres|XECred/,
  ['src'],
)

checkAbsent(
  'obsolete Chronik wallet API calls are absent',
  /chronikClient\.validateUtxos|chronikWs\.subscribe\(|new ChronikClient\(chronikConf\.url\)/,
  ['src'],
)

checkAbsent(
  'active source does not log wallet private keys, transactions or relay authorization tokens',
  /console\.(log|debug|info)\(\s*(utxo|transaction)\s*\)|console\.(log|debug|info)\([^\n]*(xPrivKey|relayToken|mnemonic|seed|privateKey)/,
  ['src', 'src-electron'],
)


try {
  const txSource = fs.readFileSync(
    path.join(
      root,
      'local_modules/bitcore-lib-xec/lib/transaction/transaction.js',
    ),
    'utf8',
  )
  const txidBlock = txSource.match(
    /Transaction\.prototype\._getTxid = function\(\) \{([\s\S]*?)\n\}/,
  )
  if (!txidBlock || !/return this\._getHash\(\);/.test(txidBlock[1])) {
    failed = true
    console.error('FAIL: local bitcore txid is not using canonical XEC transaction hashing')
  } else {
    console.log('PASS: local bitcore txid uses canonical XEC transaction hashing')
  }
} catch (err) {
  failed = true
  console.error('FAIL: unable to verify local bitcore XEC txid implementation', err)
}

try {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
  if (pkg.dependencies?.['chronik-client'] !== '4.3.0') {
    failed = true
    console.error(
      `FAIL: expected chronik-client 4.3.0, found ${pkg.dependencies?.['chronik-client']}`,
    )
  } else {
    console.log('PASS: chronik-client is pinned to 4.3.0')
  }
} catch (err) {
  failed = true
  console.error('FAIL: unable to verify chronik-client dependency', err)
}

// Files that are executed directly by Node as CommonJS can be checked with
// `node --check`. Quasar's Electron entry/preload sources use ES-module import
// syntax and are transpiled as part of the Quasar build, so feeding them to
// Node's CommonJS syntax checker creates a false failure on Node 16.
for (const file of [
  'quasar.conf.js',
  'scripts/check-runtime.js',
  'scripts/static-audit.js',
  'local-services/server.js',
]) {
  const result = spawnSync(process.execPath, ['--check', path.join(root, file)], {
    stdio: 'inherit',
  })
  if (result.status !== 0) failed = true
}

// Parse Quasar-transpiled ES-module source with Babel's parser when the locked
// dependency tree is present. This checks syntax without pretending the files
// are CommonJS modules.
try {
  const babelParser = require('@babel/parser')
  for (const file of [
    'src-electron/electron-main.js',
    'src-electron/electron-preload.js',
  ]) {
    const source = fs.readFileSync(path.join(root, file), 'utf8')
    try {
      babelParser.parse(source, {
        sourceType: 'module',
        plugins: ['dynamicImport'],
      })
      console.log(`PASS: ES-module syntax: ${file}`)
    } catch (err) {
      failed = true
      console.error(`FAIL: ES-module syntax: ${file}`)
      console.error(err.message)
    }
  }
} catch (_) {
  console.log(
    'INFO: @babel/parser is unavailable; Electron ES-module syntax will be checked by the Quasar build.',
  )
}

const gitCheck = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], {
  cwd: root,
  encoding: 'utf8',
  shell: process.platform === 'win32',
})
if (gitCheck.status === 0 && gitCheck.stdout.trim() === 'true') {
  const diffCheck = spawnSync('git', ['diff', '--check'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (diffCheck.status !== 0) failed = true
} else {
  console.log('INFO: git metadata not present; skipping git diff --check.')
}

if (failed) process.exit(1)
console.log('Finney static audit passed.')
