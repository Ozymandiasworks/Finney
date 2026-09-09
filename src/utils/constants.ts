// eCash / Chronik
export const chronikServers = [{ url: 'https://chronik.e.cash' }]

// Finney uses the native eCash CashAddr prefix for both API and display.
export const networkName = 'xec-livenet'
export const displayNetwork = 'xec-livenet'

// XEC denomination: 1 XEC = 100 satoshis.
export const SATS_PER_XEC = 100
export const XEC_DUST_SATS = 546 // 5.46 XEC

// Wallet constants
export const recomendedBalance = 10_000 // 100 XEC
export const nUtxoGoal = 10
export const defaultFeePerByte = 2

// Registry / relay defaults deliberately point to localhost until Finney's
// XEC-aware relay/keyserver is brought up. This prevents accidental use of the
// historical Stamp/Lotus infrastructure with real XEC funds.
export const registrys = ['http://127.0.0.1:31338']
export const defaultRelayUrl = 'http://127.0.0.1:31337'
export const relayUrlOptions = [defaultRelayUrl]

// Recipient's minimum valid stamp. Keep the original recipient-spendable
// mechanism; default to one standard dust output (5.46 XEC).
export const defaultAcceptancePrice = XEC_DUST_SATS

// Avatar constants
export const defaultAvatars = [
  'bunny_cyborg.png',
  'croc_music.png',
  'kitty_standard.png',
  'panda_ninja.png',
  'dog_posh.png',
]

// Chat constants
export const defaultStampAmount = XEC_DUST_SATS
export const stampLowerLimit = XEC_DUST_SATS / SATS_PER_XEC // 5.46 XEC

// No legacy Lotus contacts are preloaded into a new Finney profile.
export const defaultContacts: { name: string; address: string }[] = []

// Contact defaults
export const defaultUpdateInterval = 1000 * 60 * 60

// Formatting constants
// TODO: Generate this
export const colorSalt = Buffer.from('finney-color-salt-v1')
