# Gate 1 review snapshot

## Milestone

Gate 1 covers the existing Finney XEC and recipient-spendable Stamp message foundation. This snapshot is intended for independent clean-room review. The exact snapshot is the Git commit containing this document.

## Current architecture

Finney is a Vue 3 and Quasar renderer in Electron. The XEC message path lives in src/cashweb/relay. The legacy path derives a shared secp256k1 key, encrypts a payload, derives the recipient stamp commitment from the ciphertext digest, constructs a message envelope, and submits the envelope with a recipient-spendable XEC stamp.

The recipient verifies and decrypts the envelope, reconstructs stamp keys from the recipient wallet identity and ciphertext digest, persists recovered stamp outputs, and can redeem or forward the stamp UTXOs. Canonical local transaction IDs are tested against a Chronik/network transaction ID fixture. Local services provide token-protected development relay and registry endpoints.

The snapshot also contains disabled Signal foundations: native runtime packaging, protected private state, staged session persistence, signed profile verification, public bundle parsing, and main-owned profile provisioning. Those foundations do not publish a profile, expose working messaging IPC, or replace the legacy XEC message path.

## Commands

Use Node 24.19.0 and Yarn 1.22.x.

1. yarn install --frozen-lockfile --force
2. yarn test
3. yarn build
4. For the packaged smoke test on Windows PowerShell:

   $app = 'dist/electron/Packaged/win-unpacked/Finney.exe'
   $env:FINNEY_SIGNAL_RUNTIME_SMOKE = '1'
   $process = Start-Process -FilePath $app -PassThru -Wait -WindowStyle Hidden
   Remove-Item Env:FINNEY_SIGNAL_RUNTIME_SMOKE
   if ($process.ExitCode -ne 0) { throw 'Packaged smoke failed' }

## Passing validation

- Full yarn test core suite.
- Static audit and frozen core-lock checks.
- Canonical XEC transaction ID fixture.
- Generated-key XEC P2PKH signing and verification.
- Legacy encrypted envelope compatibility and immutable paid retry coverage.
- Recipient stamp restart/recovery path coverage.
- Local token-protected relay and registry HTTP coverage.
- Wallet mnemonic derivation coverage.
- Windows Electron package build and NSIS installer generation.
- Packaged Electron Signal and protected-state smoke test.
- Disabled Signal profile signature, public bundle, and protected provisioning coverage.

## Failing validation

No executed test failed in this snapshot.

Build warnings remain for outdated Browserslist data, the intentional bn.js resolution override, Vue I18n maintenance status, and the Electron remote peer dependency. They did not fail the build.

## Known bugs and incomplete items

- A fresh live two-client XEC send, receipt, redemption, and restart run against Chronik has not been repeated for this exact snapshot.
- The local relay is development-only and in-memory.
- The disabled Signal work is not a production message path and must not be enabled by configuration.
- Production Tor/onion routing and fail-closed verification are unfinished.
- The current legacy envelope exposes sender and recipient public keys to the relay.

## Technical debt

- Legacy message encryption uses the inherited custom AES-CBC and HMAC scheme.
- Wallet and messaging identity overlap in the legacy path.
- General application data, notifications, logs, and historical wallet state do not yet have the planned comprehensive local privacy review.
- Electron renderer hardening and removal of remaining privileged settings require separate review.
- Vendored bitcore-lib-xec remains a security-sensitive local dependency.

## Security-sensitive review areas

- Legacy key derivation, AES-CBC encryption, HMAC construction, and downgrade handling.
- Stamp output derivation, transaction construction, signing, recovery, forwarding, and redemption.
- Wallet mnemonic and key persistence.
- Relay authentication, retry behavior, and envelope parsing.
- Renderer-to-main boundaries, Electron permissions, proxy routing, and local storage.
- Vendored transaction and cryptography code.
- Signed profile verification and disabled Signal private-state boundaries.

## Assumptions

- Chronik transaction behavior matches the pinned fixture and current client version.
- The operating system protects Electron safeStorage when disabled Signal private state is used.
- The local relay token and development state remain private and are not production credentials.
- The existing XEC/Stamp behavior is evaluated as an alpha baseline, not as a production anonymity or privacy guarantee.