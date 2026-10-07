require('../guest').requireGuest('offline')

const { test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

test('synthetic traversal faults cannot return a partially inspected tree', () => {
  const result = spawnSync('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', path.join(__dirname, 'boundary-walk-fixtures.ps1')],
    { encoding: 'utf8', timeout: 15000, windowsHide: true })
  assert.equal(result.status, 0, result.error?.message || result.stderr)
  const report = JSON.parse(result.stdout.trim())
  assert.equal(report.result, 'synthetic-walk-faults-pass')
  assert.equal(report.cases.length, 12)
  assert.equal(new Set(report.cases.map(item => item.name)).size, 12)
  process.stdout.write(JSON.stringify(report) + '\n')
})

test('protection traversal inspects real nested fixtures and preserves them', () => {
  const result = spawnSync('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    ['-NoLogo', '-NoProfile', '-NonInteractive', '-File', path.join(__dirname, 'boundary-tree-fixtures.ps1')],
    { encoding: 'utf8', timeout: 120000, maxBuffer: 1024 * 1024, windowsHide: true })
  assert.equal(result.status, 0, result.error?.message || result.stderr)
  const report = JSON.parse(result.stdout.trim())
  assert.equal(report.result, 'on-disk-tree-fixtures-pass')
  assert.equal(report.cases.length, 14)
  assert.equal(new Set(report.cases.map(item => item.name)).size, 14)
  assert.equal(report.preserved, true)
  process.stdout.write(JSON.stringify(report) + '\n')
})
