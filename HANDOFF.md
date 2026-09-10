# Finney cloud handoff

Updated: 2026-09-09

## Repository

- Origin: https://github.com/Ozymandiasworks/Finney.git
- Branch pushed for handoff: `development/core-regression-tests`
- Baseline tag: `v0.1-core-working`
- Baseline commit: `bef6a06ae335de9fb9697e0d65b17f9543ba3f98`
- Current work preserves the baseline and adds local regression coverage, runtime compatibility records, and development checkpoints.

## Completed work

- Fixed the alpha.20 compilation error in `src/cashweb/relay/index.ts` with a narrow formatting correction.
- Preserved the frozen core files and their hash checks:
  - `src/cashweb/relay/crypto.ts`
  - `src/cashweb/relay/constructors.ts`
  - `local_modules/bitcore-lib-xec/lib/transaction/transaction.js`
- Added repository protections for dependencies, build output, logs, Electron profiles, local stores, environment files, tokens, wallet/private-key material, test identity data, and generated installers.
- Replaced the hardcoded local relay token with an ignored generated token and optional environment override.
- Added repeatable offline core regression checks for static invariants, transaction IDs, sender history, frozen crypto behavior, and local token lifecycle.
- Added isolated ratchet compatibility experiments and runtime storage checks. These do not alter production encryption or dependencies.
- Recorded the encryption migration boundaries and compatibility evidence for `@signalapp/libsignal-client@0.102.1` in `ENCRYPTION_MIGRATION.md`.
- Added `DEVELOPMENT_CHECKPOINT.md` with architecture, decisions, validation scope, limitations, and roadmap.
- Verified the built renderer uses Axios's browser `XMLHttpRequest` adapter and the browser WebSocket path, so Electron's session proxy applies to those renderer requests.
- Verified an external Electron request fails when configured with an unreachable SOCKS proxy; no direct fallback was observed.
- Produced a successful Windows Electron alpha.20 installer build. Generated artifacts remain ignored and were not published.

## Current status

Production remains alpha.20 with the inherited AES-CBC/HMAC message format. Modern ratcheting encryption is an isolated experiment only. Messaging and wallet identities remain coupled, relay envelopes expose sender and recipient public keys, local stores are not encrypted at rest, and production onion infrastructure is not implemented.

The candidate libsignal package is AGPL-3.0-only and its external use is unsupported upstream. The provisional project direction is to continue evaluation under AGPL while licensing is decided. Do not add it to production until the licensing, runtime, packaging, identity, persistence, downgrade, and migration reviews are complete.

The Electron session proxy is configured for SOCKS5 Tor with localhost bypass. Renderer network behavior has been checked in an isolated hidden window. This is not a live Tor privacy certification: real Tor routing, Node-side tooling, Chronik connectivity, relay behavior, and two-client messaging still require controlled live tests.

## Tests and commands

- `yarn test` runs the offline core suite. Last run passed all static audits, frozen-core hashes, transaction ID, history, crypto round-trip, stamp recovery, and token lifecycle checks.
- `yarn build` creates the Windows Electron production package. Last run succeeded with Electron 20.1.1 and produced `dist/electron/Packaged/Finney Setup 0.1.0-alpha.20.exe`.
- `node scripts/test-ratchet-compatibility.mjs <isolated-package-directory>` runs the optional disposable ratchet experiment.
- `node scripts/test-runtime-storage.js` checks isolated LevelDB close/reopen/delete behavior.
- The hidden-window compatibility harness was run against Electron 20.1.1 and 44.3.0. It verified preload bridge exposure and proxy resolution using disposable profiles.

Known warnings are the outdated Browserslist data and legacy dependency notices. They are not part of this handoff task and should not be upgraded opportunistically.

## Blockers and required decisions

- Decide the production encryption library and license before integrating a ratchet.
- Design a versioned envelope with downgrade rejection, authenticated messaging identity binding, immutable paid retry envelopes, and durable atomic session/outbox state.
- Validate production runtime and native dependency compatibility before considering an Electron upgrade.
- Define and test encrypted local storage, key handling, notification privacy, cleanup, and a stricter CSP.
- Replace development localhost relay assumptions with production onion infrastructure and prove every relevant route fails closed through Tor.
- Do not use real funds or personal identities in automated compatibility tests.

## Exact next task

Audit and harden the Electron CSP and navigation boundary in an isolated branch. First inventory Quasar's required script, style, image, font, localhost relay, Chronik, and WebSocket sources. Add the narrowest production CSP that preserves the packaged app, keep external URLs restricted to explicit HTTP(S) user actions, and add a packaged hidden-window regression check proving the app starts with the policy enabled. Then run `yarn test` and `yarn build`. Do not integrate modern encryption or change the frozen core during this task.

## Cloud handoff rules

Read this file, `DEVELOPMENT_CHECKPOINT.md`, `CORE_WORKING_BASELINE.md`, and `ENCRYPTION_MIGRATION.md` before editing. Preserve the baseline tag and frozen core hashes. Review staged changes for secrets before each commit. Never commit passwords, private keys, wallet seeds, relay tokens, environment files, test identity stores, generated user data, or build artifacts. Do not force-push or rewrite remote history.
