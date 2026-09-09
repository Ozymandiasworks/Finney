# Message encryption migration

Status: design assessment, 2026-09-09. No protocol or dependency changes implemented.

## Existing behavior

`src/cashweb/relay/constructors.ts` derives a salt from the plaintext digest and sender private key, encrypts with `PayloadConstructor`, hashes the ciphertext and constructs the recipient stamp from that digest. `crypto.ts` implements AES-CBC and HMAC plus secp256k1 stamp derivation. `extension.ts` verifies the legacy message HMAC and decrypts; `index.ts` checks the ciphertext digest and reconstructs stamp keys from the recipient identity.

The stamp commitment is to ciphertext bytes. A new encryption protocol can potentially preserve stamp derivation by treating its complete serialized encrypted message as the payload. This is a proposed integration boundary, not a tested compatibility result. Keep the existing stamp algorithm and frozen baseline intact.

## Candidate implementation

Signal's maintained libsignal repository exposes TypeScript bindings to Rust protocol code. Its README explicitly says external use is unsupported and APIs may change. The inspected Node package on the main branch identifies itself as version 0.102.1, uses ES modules and includes native add-ons. This is not confirmation of an npm release or compatibility with Finney's Node 16/Electron 20 runtime. A separate packaging experiment is needed before adding a dependency.

The package declares AGPL-3.0-only. Finney's current root license is GPLv3. Record a deliberate licensing decision before incorporating or distributing a combined implementation; this assessment does not resolve distribution obligations.

Sources: [libsignal README](https://github.com/signalapp/libsignal), [Node manifest](https://github.com/signalapp/libsignal/blob/main/node/package.json), [license](https://github.com/signalapp/libsignal/blob/main/LICENSE).

## Proposed migration boundaries

- Introduce a distinct wire encryption version. Keep the legacy reader for existing history; reject unsupported new versions rather than silently downgrading.
- Establish authenticated messaging identities and prekey sessions separately from secp256k1 wallet/stamp keys. Bind messaging identity, stamp recipient and protocol version to authenticated session data.
- Retain an immutable encrypted envelope across delivery retries. A ratchet must advance once per logical send, not once per relay attempt; persist its new state and pending envelope durably before a paid broadcast.
- Persist receive state, consumed prekeys, skipped message keys and accepted-message identifiers atomically. Bound skipped-key storage and reject duplicates without corrupting the session.
- Keep stamp recovery independent of deleted message keys. A backup of a wallet identity must not silently restore discarded ratchet keys.
- Retain authenticated negotiation state so a relay cannot strip capabilities and force legacy encryption. Existing contacts need an explicit migration path.

The [Double Ratchet specification](https://signal.org/docs/specifications/doubleratchet/) is the protocol reference. A ratchet alone does not establish safe prekey distribution, identity verification, reliable persistence, metadata privacy or secure backups. Forward-secrecy and recovery claims require those integration properties to be tested.

## Next bounded experiment

Evaluate an exact released library version in an isolated directory with disposable identities. Verify loading on the target Windows/Electron runtime, prekey initiation, bidirectional messages, reordered delivery, replay rejection, tamper rejection and persistence across restart. Do not change production dependencies or frozen files during this experiment. If runtime or licensing constraints make this candidate unsuitable, compare maintained alternatives before selecting one.

Then add a versioned-envelope compatibility test proving that sender and restored recipient derive the same stamp output from the new ciphertext, and that retries reuse the same paid envelope. No live funds or external relay are needed for these tests.

## Runtime loading experiment

Tested the npm release `@signalapp/libsignal-client@0.102.1` in the ignored `.security-review/libsignal-compatibility` directory with install scripts disabled. The application manifest and lockfile were not changed.

- Published integrity: `sha512-AU6qgmT+3SJg15tuXwXVIHcp1HKtQy/0VYw1CbZD/AzmnrKidDfrp9KaVyu3HeZDRzQi9pgKRSvX0b8LllTKOg==`.
- Unmodified package import failed on Windows x64 / Node 16.20.2. Its loader resolves native binaries with `import.meta.dirname`, which is unavailable on this runtime.
- Loading the packaged Windows native binding directly succeeded.
- Replacing only the loader path resolution in the isolated package copy with `fileURLToPath(new URL("../", import.meta.url))` allowed package import and disposable key generation. The original loader copy is retained alongside it.
- Electron 20.1.1 in Node-only mode (Node 16.15.0) also imported that adjusted copy and generated a disposable key. An explicit result file confirmed the runtime versions and public-key serialization length. No key values were logged or saved.

This is a compatibility diagnostic, not an approved dependency patch. It does not verify renderer/preload loading, packaged installer behavior, sessions, prekeys, restart persistence or security properties. Before adopting this candidate, choose a maintained runtime upgrade or a reviewed compatibility strategy and resolve the licensing decision. The next experiment should exercise disposable sessions in the isolated copy; successful native loading alone is insufficient.

## Disposable session experiment

`scripts/test-ratchet-compatibility.mjs` is an optional experiment, not part of the production dependency tree. Supply the path to the isolated candidate package directory as its first argument. Version 0.102.1 on Node 16 requires the loader adjustment described above.

Verified on Node 16.20.2: prekey initiation and consumption, bidirectional messages, reordered delivery, serialized state reconstruction, replay/tamper rejection without state mutation, rejection of changed recipient identities and invalid prekey signatures, and malformed initial-message rejection without consuming the valid prekey. A fresh child process can restore the serialized session, decrypt a pending message and reject its replay; disposable state is passed through stdin rather than written to disk.

Initial session, ordering, replay, tamper, identity and stamp checks also passed on Electron 20.1.1 in Node-only mode. The additional malformed-handshake and fresh-process cases still need that runtime check.

The unchanged secp256k1 stamp derivation produces matching sender/recipient child public keys for the experimental ciphertexts, including a restored stamp recipient. Serialization preserves the queued ciphertext digest. This does not yet test a versioned Finney envelope, the live paid-send path, crash-safe database transactions, prekey publication or downgrade resistance. The test stores are disposable in-memory fixtures, not a production storage design.

## Unmodified package on a current runtime

A second ignored experiment at `.security-review/modern-runtime` pins Electron 44.3.0 and libsignal 0.102.1. Packages were installed with scripts disabled; the official Electron installer then downloaded its runtime using the packaged checksums. No candidate source edits were made in this experiment.

The full optional session suite passes on Node 24.19.0 and Electron 44.3.0 in Node-only mode (embedded Node 24.20.0), including malformed initial messages and fresh-process session restoration. This removes the loader adjustment for these runtimes. Finney production still uses Node 16/Electron 20.

To repeat with Node 24, install `electron@44.3.0` and `@signalapp/libsignal-client@0.102.1` in an ignored experiment directory, then run `node scripts/test-ratchet-compatibility.mjs <candidate-package-directory>`. Electron tests run the same script with `ELECTRON_RUN_AS_NODE=1`, using its executable and the same candidate package path. The tests neither contact a relay nor broadcast a transaction.

Next: assess the existing Finney application and native dependencies on the newer runtime in isolation. Successful protocol tests do not establish compatibility for the GUI, preload bridge, LevelDB, Tor configuration or installer. Confirm the licensing direction before production integration.
