import { Networks } from 'bitcore-lib-xec'
import { boot } from 'quasar/wrappers'

/**
 * Register explicit eCash networks in the legacy bitcore compatibility layer.
 * Mainnet values match Bitcoin ABC/eCash chain parameters. CashAddr is used
 * for all application-facing addresses.
 */
export default boot(() => {
  const dnsSeeds = [
    'seed.bitcoinabc.org',
    'seeder.fabien.cash',
    'seeder.status.cash',
  ]

  const liveNetwork = {
    name: 'xec-livenet',
    alias: 'xec-mainnet',
    prefix: 'ecash',
    pubkeyhash: 0,
    privatekey: 0x80,
    scripthash: 5,
    xpubkey: 0x0488b21e,
    xprivkey: 0x0488ade4,
    networkMagic: 0xe3e1f3e8,
    port: 8333,
    dnsSeeds,
  }

  const testNetwork = {
    name: 'xec-testnet',
    prefix: 'ectest',
    pubkeyhash: 0x6f,
    privatekey: 0xef,
    scripthash: 0xc4,
    xpubkey: 0x043587cf,
    xprivkey: 0x04358394,
    networkMagic: 0xecf4f3f4,
    port: 18333,
    dnsSeeds: [
      'testnet-seed.bitcoinabc.org',
      'testnet-seeder.fabien.cash',
      'testnet-seeder.status.cash',
    ],
  }

  if (!Networks.get(liveNetwork.name)) Networks.add(liveNetwork)
  if (!Networks.get(testNetwork.name)) Networks.add(testNetwork)
})
