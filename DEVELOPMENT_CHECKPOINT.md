# Development checkpoint

Updated: 2026-09-09. Production remains alpha.20 with legacy message encryption. Modern encryption is an isolated experiment, not an integrated feature.

## Repository and baseline

- Working repository: `F:\Finney\Builds\Core Locked down Finney-v0.1-alpha.20-source\alpha20work`.
- Origin: `https://github.com/Ozymandiasworks/Finney.git`.
- Published baseline: `bef6a06ae335de9fb9697e0d65b17f9543ba3f98`, tagged `v0.1-core-working`. Preserve this commit and tag; do not overwrite remote history.
- Active branch: `development/core-regression-tests`. Latest implementation commit: `da16285`.
- Six local commits after the baseline cover repeatable regression checks, encryption migration assessment, disposable ratchet sessions, and runtime/storage compatibility. These have not been pushed. Further pushes require approval.
- Preserve existing style and frozen core files. Avoid broad rewrites, dependency upgrades, and reformatting.

## Architecture and working features

Vue 3 / Quasar 2 renderer in Electron 20.1.1, TypeScript 4.7.4, Node 16.20.2 build tooling. Messaging lives in `src/cashweb/relay`: `constructors.ts` encrypts and constructs stamps; `crypto.ts` contains legacy secp256k1/AES-CBC/HMAC and HD stamp derivation; `extension.ts` parses and decrypts; `index.ts` coordinates paid broadcast, relay retries, history and stamp recovery. The protobuf envelope exposes sender and recipient public keys.

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
- Frozen files remain unchanged: `src/cashweb/relay/crypto.ts`, `src/cashweb/relay/constructors.ts`, `local_modules/bitcore-lib-xec/lib/transaction/transaction.js`.

## Encryption experiment and decisions

See `ENCRYPTION_MIGRATION.md` for exact versions, evidence and protocol boundaries. Candidate `@signalapp/libsignal-client@0.102.1` is installed only under ignored `.security-review` directories. No production dependency or crypto changes were made.

Unmodified candidate loading fails on Node 16 because its loader uses `import.meta.dirname`. A loader-only diagnostic adjustment allowed isolated Node 16/Electron 20 tests. The full suite passes with the unmodified package on Node 24.19.0 and Electron 44.3.0 (embedded Node 24.20.0). These are Node-only tests, not GUI or installer validation.

The candidate is AGPL-3.0-only; the repository root license is GPLv3. A licensing-direction question is pending before production adoption. External libsignal use is unsupported upstream. Do not implement a handwritten ratchet or silently patch a production dependency.

Required integration properties: explicit wire version and downgrade rejection; authenticated binding between messaging identity and stamp recipient; durable atomic session/outbox updates before payment; immutable paid retry envelopes; atomic receive/prekey/replay state with bounded skipped keys; wallet recovery independent of discarded message keys. Primitive tests alone do not establish these properties.

## Current task and next steps

1. Assess application/runtime compatibility in isolation: built entry point, preload bridge, GUI startup/shutdown, native dependencies, proxy configuration and packaging. Keep experiments separate from production dependencies and real user data. Do not send messages, spend funds or use real identities in compatibility tests.
2. Resolve the licensing direction before selecting the production encryption library.
3. Add versioned-envelope and immutable paid-retry compatibility coverage, then design and review durable session persistence before integration.
4. Continue the roadmap: modern encryption; separate messaging/wallet identity; opaque relay addressing; encrypted local storage and key/log/notification/CSP hardening; production onion infrastructure with verified fail-closed routing. Larger discovery/payment/attachment work and visual changes follow later.

## Known limitations and resumption

No newly reproduced core regression is open. Runtime upgrade compatibility and encryption integration remain unfinished. Legacy dependency/Browserslist warnings persist; avoid unrelated upgrades. The latest extra malformed-handshake/fresh-process cases have not been repeated on Electron 20, although the full suite passes on the modern runtime.

Security review found no unapproved secrets in the committed baseline; retained vendored test fixtures were approved. Review staged changes again before committing, without printing secret values. Local review snapshots, candidate dependencies and tokens remain ignored. Do not publish builds or push without approval.

Read this file, `CORE_WORKING_BASELINE.md`, `ENCRYPTION_MIGRATION.md`, and current Git status/log before resuming. Update this checkpoint after meaningful changes, including test scope and unresolved decisions.

### Latest verification

The complete offline regression suite passed again on 2026-09-09. A disposable hidden-window harness also passed on Electron 20.1.1 and 44.3.0 using the actual built preload: bridge function exposure and external SOCKS5/local DIRECT proxy selection matched expectations. Network requests were blocked. Full application startup, bridge actions, actual Tor fail-closed behavior and packaging remain unverified on the candidate runtime. See the latest section of `ENCRYPTION_MIGRATION.md`.
