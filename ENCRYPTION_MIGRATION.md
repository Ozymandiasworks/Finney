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
