// Development-only helpers for the localhost relay/keyserver used while the
// Finney protocol port is being validated. These exceptions must never apply
// to remote relays or onion services.
export const LOCAL_DEVELOPMENT_TOKEN =
  process.env.FINNEY_LOCAL_RELAY_TOKEN || ''

export function isLocalDevelopmentUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl)
    return url.hostname === '127.0.0.1' || url.hostname === 'localhost'
  } catch (_) {
    return false
  }
}
