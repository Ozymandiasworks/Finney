# Development checkpoint

Updated: 2026-09-12. Production remains alpha.20 with legacy message encryption. Modern encryption is an isolated experiment, not an integrated feature.

## Repository and baseline

- Working repository: `F:\Finney\Builds\Core Locked down Finney-v0.1-alpha.20-source\alpha20work`.
- Origin: `https://github.com/Ozymandiasworks/Finney.git`.
- Published baseline: `bef6a06ae335de9fb9697e0d65b17f9543ba3f98`, tagged `v0.1-core-working`. Preserve this commit and tag; do not overwrite remote history.
- Active branch: `development/core-regression-tests`. It holds the current reviewed work.
- The commits after the baseline cover repeatable regression checks, encryption migration assessment, disposable ratchet sessions, runtime/storage compatibility, CSP hardening, cloud handoff, and direct runtime security updates. Changes are reviewed and tested before pushing.
- Preserve existing style and frozen core files. Avoid broad rewrites, dependency upgrades, and reformatting.

## Architecture and working features

Vue 3 / Quasar 2 renderer in Electron 44.3.0, TypeScript 4.7.4, Node 24.19.0 build tooling. Messaging lives in `src/cashweb/relay`: `constructors.ts` encrypts and constructs stamps; `crypto.ts` contains legacy secp256k1/AES-CBC/HMAC and HD stamp derivation; `extension.ts` parses and decrypts; `index.ts` coordinates paid broadcast, relay retries, history and stamp recovery. The protobuf envelope exposes sender and recipient public keys.

The stamp commits to the ciphertext digest. Recipient stamp recovery uses the wallet identity and that digest, independently of the future ratchet session design. Messaging and wallet identities currently overlap.

`local-services/server.js` provides token-protected localhost relay/registry services on ports 31337/31338 with in-memory data. `src/boot/setup-apis.ts` initializes wallet, Level stores and Chronik access. Electron configures its default session with a SOCKS proxy and local bypass; this does not prove every Node network route uses Tor. Window settings include context isolation and Node integration; preload, navigation, notifications and local storage need a separate privacy review.

Earlier manual testing established isolated A/B identities, encrypted messages over Tor, XEC stamps, redemption and persistent histories. Current work has not repeated live messaging or real-money tests.

## Changes and validation

- Alpha.20 compilation was repaired with a narrow formatting change in `src/cashweb/relay/index.ts`. Windows Electron build and installer generation passed; generated installer remains ignored and unpublished.
- `.gitignore` excludes dependencies, generated builds/archives, logs, local profiles/stores, environment secrets and token files. `.gitattributes` preserves frozen core bytes.
- `scripts/local-development-token.js` replaces the hardcoded local token with an environment override or ignored generated `.relay-token`. Used by server and build configuration. Compiled local bundles can contain this token and must remain private.
- `package.json` and `scripts/setup-windows.ps1` expose repeatable offline checks. `scripts/test-core-crypto.js` exercises actual frozen crypto and restored stamp derivation; `scripts/test-local-development-token.js` tests isolated token lifecycle. `yarn test` runs these plus existing static/core-lockdown/transaction-id/history checks. These passed; static checks are not end-to-end send tests.
- `scripts/test-ratchet-compatibility.mjs` tests an explicitly supplied isolated libsignal package: disposable prekey handshake, bidirectional/reordered messages, serialized restoration, fresh-process restoration, replay/tamper/identity/signature rejection, and ciphertext-based stamp derivation. It does not test production paid retries or crash-safe persistence.
- `scripts/test-runtime-storage.js` verifies temporary LevelDB batch writes, close/reopen, recovery and deletion on Node 16/24 and Electron 20/44 in Node-only mode. This is not a durability or at-rest encryption assessment.
- PR #4 updated direct runtime DOMPurify, Axios and ws dependencies in three isolated compatibility changes. Each passed `yarn test` and `yarn build` on the alpha.20 runtime.
- The merged vendored lockfile cleanup removes `local_modules/bitcore-lib-xec/package-lock.json`, which Finney does not read. A clean `yarn install --frozen-lockfile --force`, `yarn test` and `yarn build` passed in an isolated worktree. The active Capacitor lockfile remains because mobile builds use it.
- Direct runtime `node-forge` now resolves to 1.4.0. A clean Node 24 install, complete core suite (including the legacy relay crypto cases) and Electron 44 installer build passed. The direct `node-forge` audit finding is no longer present.
- Runtime `elliptic` now resolves to 6.6.1 everywhere through the root Yarn resolution. The vendored XEC dependency was updated, and the core suite now includes a generated-key P2PKH transaction signing and ECDSA verification check. A frozen install, full core suite and Electron 44 installer build passed.
- Wallet-reachable `cipher-base`, `pbkdf2` and `sha.js` now resolve to their minimum patched versions: 1.0.5, 3.1.3 and 2.4.12. The core suite includes a generated-data BIP39 mnemonic-to-seed check against Node PBKDF2-SHA512. A frozen install, full core suite and Electron 44 installer build passed.
- Direct renderer `vue-i18n` now resolves to 9.14.5. Its bundled Intlify packages are on the matching patched v9 release, and the core suite includes a legacy global translation check. A frozen install, full core suite and Electron 44 installer build passed.
- Direct and transitive runtime `bn.js` now resolve to patched v4 or v5 releases. The root package uses 4.12.3, the XEC transaction library resolves to 4.12.3, and bundled browser crypto copies resolve to 4.12.3-or-later v4 or 5.2.3. The core suite checks the zero-bit mask fix and XEC signing. The transitive exact 4.11.8 pin is deliberately overridden; Yarn reports that expected resolution warning during install.
- Runtime Base58 decoding now resolves `base-x` 3.0.11. The core suite checks a Base58 round trip and rejects a high Unicode character code, preventing the advisory address-homograph bypass. A frozen install, full core suite and Electron 44 installer build passed.
- The modern-encryption direction is the official AGPL `@signalapp/libsignal-client` Node package behind a main-process boundary. An inactive main-process spike pins 0.102.1, keeps native loading behind `FINNEY_SIGNAL_RUNTIME_SMOKE`, externalizes the module from the Electron main bundle and unpacks the Windows native binary. Its Node and packaged Electron seal/open smoke tests passed. It does not expose IPC or enable a v2 protocol path. `MODERN_ENCRYPTION_MIGRATION.md` defines the required prekey, separate messaging identity, XEC stamp, relay and protected-state sequence before production messages are enabled.
- `scripts/test-relay-envelope-compatibility.js` exercises legacy versioned-envelope round trips, rejects missing and unknown encryption schemes before legacy decryption, and checks that a retry preserves the exact serialized paid envelope. `extension.ts` now accepts only the legacy `EPHEMERALDH` scheme; future schemes fail closed until they have an explicit implementation.
- `DURABLE_SESSION_PERSISTENCE.md` defines the private-state, crash-recovery and test boundary. `MODERN_ENCRYPTION_MIGRATION.md` selects the protocol direction and integration sequence; neither document enables a production v2 message path.
- Frozen files remain unchanged: `src/cashweb/relay/crypto.ts`, `src/cashweb/relay/constructors.ts`, `local_modules/bitcore-lib-xec/lib/transaction/transaction.js`.

## Encryption experiment and decisions

See `ENCRYPTION_MIGRATION.md` for exact versions, evidence and protocol boundaries. `@signalapp/libsignal-client@0.102.1` is pinned for the inactive main-process packaging spike. No production protocol, relay, wallet or legacy crypto changes were made.

Unmodified candidate loading fails on Node 16 because its loader uses `import.meta.dirname`. A loader-only diagnostic adjustment allowed isolated Node 16/Electron 20 tests. The full suite passes with the unmodified package on Node 24.19.0 and Electron 44.3.0 (embedded Node 24.20.0). These are Node-only tests, not GUI or installer validation.

The candidate is AGPL-3.0-only; the repository root license is GPLv3. External libsignal use is unsupported upstream. Do not implement a handwritten ratchet or silently patch a production dependency.

Required integration properties: explicit wire version and downgrade rejection; authenticated binding between messaging identity and stamp recipient; durable atomic session/outbox updates before payment; immutable paid retry envelopes; atomic receive/prekey/replay state with bounded skipped keys; wallet recovery independent of discarded message keys. Primitive tests alone do not establish these properties.

## Current task and next steps

1. Continue dependency remediation in small compatibility groups. Electron 44.3.0, Node 24.19.0, direct `node-forge` 1.4.0, direct `vue-i18n` 9.14.5, runtime `base-x` 3.0.11, direct/transitive `bn.js` 4.12.3-or-later v4 and 5.2.3, transitive `elliptic` 6.6.1, `cipher-base` 1.0.5, `pbkdf2` 3.1.3 and `sha.js` 2.4.12 are now merged after clean frozen installs, core-suite runs and full Windows builds. Next, classify remaining reachable runtime alerts before advancing the protected-local-storage phase. Dependabot PR #3 (`ea2f868`) remains unsuitable for merge because it also upgrades Quasar and related tooling; its bypassed-engine build failed in the upgraded Quasar loader and Sass pipeline.
2. Define and implement protected private-state storage and the staged Signal store adapter before extending the profile, relay and message schemas. The durable-session and paid-outbox invariants in `DURABLE_SESSION_PERSISTENCE.md` remain mandatory.
3. Continue the roadmap: modern encryption; separate messaging/wallet identity; opaque relay addressing; encrypted local storage and key/log/notification/CSP hardening; production onion infrastructure with verified fail-closed routing. Larger discovery/payment/attachment work and visual changes follow later.

## Known limitations and resumption

No newly reproduced core regression is open. Runtime upgrade compatibility and encryption integration remain unfinished. Legacy dependency/Browserslist warnings persist; avoid unrelated upgrades. The latest extra malformed-handshake/fresh-process cases have not been repeated on Electron 20, although the full suite passes on the modern runtime.

Security review found no unapproved secrets in the committed baseline; retained vendored test fixtures were approved. Review staged changes again before committing, without printing secret values. Local review snapshots, candidate dependencies and tokens remain ignored. Do not publish builds.

Read this file, `CORE_WORKING_BASELINE.md`, `ENCRYPTION_MIGRATION.md`, and current Git status/log before resuming. Update this checkpoint after meaningful changes, including test scope and unresolved decisions.

Electron 44.3.0 and Node 24.19.0 are merged on main. The combined clean Node 24 install, complete core suite, production package build, NSIS installer and blocked-network startup check passed. Live Tor, wallet and two-client validation remain required before release.

### Latest verification

On 2026-09-12, the versioned-envelope and immutable-retry coverage was added. `yarn test` and `yarn build` both passed on Node 16.20.2, Quasar 2.15.1 and Electron 20.1.1. The generated installer remains ignored and unpublished.

The complete offline regression suite passed again on 2026-09-09. A disposable hidden-window harness also passed on Electron 20.1.1 and 44.3.0 using the actual built preload: bridge function exposure and external SOCKS5/local DIRECT proxy selection matched expectations. Network requests were blocked. An ignored, disposable full-startup check passed on Electron 44.3.0: the prebuilt Finney renderer reached `#q-app`, its preload bridge was present, and renderer HTTP/WebSocket traffic was cancelled before application load. A modern-tree rebuild, installer check, bridge-action testing and actual Tor fail-closed verification remain unverified. See the latest section of `ENCRYPTION_MIGRATION.md`.
