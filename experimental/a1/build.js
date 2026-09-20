const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const { requireGuest } = require('./guest')
const { validateConfig, parseRecord, refuse, NETWORKS } = require('./app/policy')
const { restrictFuses, verifyFuses } = require('./fuses')

async function build() {
  requireGuest('offline')
  if (process.version !== 'v24.19.0') refuse('UNQUALIFIED_BUILD_NODE')
  const network = process.argv[2]
  if (process.argv.length !== 3 || !NETWORKS.includes(network)) refuse('INVALID_BUILD_TARGET')
  const root = path.resolve(__dirname, '../..')
  const expected = { electron: '44.3.0', 'chronik-client': '4.3.0', level: '7.0.1', leveldown: '6.1.0' }
  for (const [name, version] of Object.entries(expected)) {
    if (require(path.join(root, 'node_modules', name, 'package.json')).version !== version) {
      refuse('LOCKED_DEPENDENCY_MISMATCH')
    }
  }
  const policy = fs.readFileSync(path.join(__dirname, 'config', `${network}.json`), 'utf8')
  validateConfig(parseRecord(policy))
  const destination = path.join(root, 'dist', 'a1', network)
  if (fs.existsSync(destination)) refuse('BUILD_OUTPUT_ALREADY_EXISTS')
  const application = path.join(destination, 'application')
  fs.mkdirSync(application, { recursive: true })
  fs.cpSync(path.join(__dirname, 'app'), application, { recursive: true, errorOnExist: true })
  fs.writeFileSync(path.join(application, 'configuration.json'), policy, { flag: 'wx' })
  const { build: packageApplication, Platform, Arch } = require('electron-builder')
  await packageApplication({
    projectDir: root,
    targets: Platform.WINDOWS.createTarget('dir', Arch.x64),
    publish: 'never',
    config: {
      appId: `org.finney.experimental.a1.${network}`,
      productName: `Finney A1 ${network}`,
      electronVersion: '44.3.0',
      electronDist: path.join(root, 'node_modules', 'electron', 'dist'),
      directories: { app: application, output: path.join(destination, 'package') },
      files: ['**/*'], asar: true, npmRebuild: false, nodeGypRebuild: false,
      forceCodeSigning: false, publish: [],
      win: { executableName: 'FinneyA1', signAndEditExecutable: false },
      afterPack: async context => {
        const executable = path.join(context.appOutDir, 'FinneyA1.exe')
        fs.writeFileSync(executable, restrictFuses(fs.readFileSync(executable)))
        verifyFuses(fs.readFileSync(executable))
      },
    },
  })
  const packageRoot = path.join(destination, 'package', 'win-unpacked')
  const files = {}
  for (const relative of ['FinneyA1.exe', 'resources/app.asar']) {
    files[relative] = crypto.createHash('sha256').update(fs.readFileSync(path.join(packageRoot, relative))).digest('hex')
  }
  fs.writeFileSync(path.join(destination, 'package-hashes.json'), JSON.stringify({
    network, node: process.version, dependencies: expected, files,
    signed: false, tested: false, publish: false,
  }, null, 2) + '\n', { flag: 'wx' })
}

build().catch(error => { console.error(error.code || 'A1_BUILD_FAILED'); process.exitCode = 1 })
