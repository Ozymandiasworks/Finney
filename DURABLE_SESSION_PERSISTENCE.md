# Durable session and paid outbox design

Status: the Electron main-process private-state foundation is implemented, but no production protocol, message format, relay or wallet code changes are included here.

## Scope and prerequisites

This design applies to a future versioned encrypted-message scheme. The alpha.20 legacy envelope remains readable through its existing `EPHEMERALDH` scheme. A new scheme must not be enabled until its licensing, supported runtime, identity binding, and local key protection decisions are complete.

Session records, prekeys, identity records, skipped-message state and paid-but-undelivered envelopes contain sensitive material. They must not be stored in the current plaintext message store. Desktop support must provide a protected local master-key wrapping mechanism and authenticated encryption for record contents without a plaintext fallback. This is a prerequisite for implementation, not a reason to add a new cryptographic primitive here.

## Required invariants

1. A message scheme is selected explicitly and unsupported schemes fail closed before legacy decryption.
2. A paid stamp is constructed once. Every retry uses the same serialized `MessageSet` and the same raw transaction bundle.
3. The sender's advanced session state and the immutable paid outbox entry are durable together before any transaction is broadcast.
4. Invalid inbound envelopes leave session, prekey, identity and replay state unchanged.
5. A valid inbound envelope consumes its prekey and advances its session state once, even across a crash or duplicate relay delivery.
6. Restoring a wallet must remain possible without retaining message-session secrets.

## Storage boundary

Use one dedicated private-state database rather than the current separate message and metadata databases. Its schema version and every state transition belong in one LevelDB batch. The existing message store can remain a materialized display cache until it is replaced, but it cannot be the source of truth for ratchet state or delivery recovery.

The private database needs encrypted values and unambiguous, versioned key namespaces:

- `meta/schema` and `meta/key-version`
- `identity/<messaging-identity-id>`
- `peer/<messaging-identity-id>/<peer-id>`
- `session/<messaging-identity-id>/<peer-id>/<device-id>`
- `prekey/<messaging-identity-id>/<prekey-id>` and `prekey-used/<...>`
- `outbox/<envelope-id>`
- `receipt/<envelope-digest>`
- `materialize/<envelope-id>`

An outbox record contains the protocol version, recipient identity binding, payload digest, serialized `MessageSet`, serialized transaction hex, expected transaction identifiers, session revision, timestamps, retry count and state. It contains no regenerated payload or instruction to create a replacement stamp. The envelope ID is derived from immutable serialized envelope bytes, not from a mutable UI message.

The private-state foundation encrypts individual JSON records with Electron `safeStorage` and stores only the encrypted representation in LevelDB. It fails closed when OS protection is unavailable and rejects Linux plaintext or unknown keyring backends. The interface exposes `get`, `getMany`, `put`, `del` and one atomic `batch` operation; callers must not get direct plaintext LevelDB access. It has no renderer IPC or production protocol caller until the staged store adapter is complete.

## Outgoing state machine

1. Load the current session into a staging adapter. The encryption library writes its session, identity and prekey mutations to that adapter rather than to durable storage.
2. Encrypt the payload, construct the exact message envelope, derive the stamp commitment, and construct the raw transaction bundle. Do not broadcast yet.
3. Run the local relay preflight when it is available. A rejected preflight discards the staged adapter and does not advance the durable session.
4. Atomically commit the staged session mutations and an `outbox` entry in `prepared` state. The entry includes the serialized message bytes and raw transaction bytes that will be retried after a restart.
5. Broadcast only the persisted transaction bytes. Move the outbox to `stamp-broadcast` after success. If the process ends before that transition, recovery queries the expected transaction identifiers or resubmits the same raw transaction bytes; it never constructs a new payment.
6. Submit only the persisted serialized `MessageSet` to the relay. A transient failure remains `delivery-pending`; a permanent rejection is recorded as `delivery-rejected`; a success becomes `delivery-confirmed`.
7. Materialize sent-message history from the durable outbox idempotently. A history-write failure must not change the paid envelope or session state.

The current `pushMessagesWithRetry` behavior already preserves a supplied `MessageSet`. The future outbox recovery path must use the same rule and must not call message construction or transaction broadcast with newly derived inputs.

## Incoming state machine

1. Validate envelope size, digest, HMAC, sender and recipient binding, then the declared encryption scheme.
2. Compute an envelope digest and check the receipt journal. A committed receipt is a duplicate and must not run decryption side effects again.
3. Decrypt through a staging adapter. Any authentication, signature, replay or payload-decoding failure discards the adapter without a durable write.
4. Atomically commit the staged session, identity and prekey mutations with a receipt record and an inbound materialization record.
5. Materialize chat history and notifications idempotently from the inbound materialization record. If the application ends after the batch but before the UI cache write, startup resumes materialization without decrypting or consuming a prekey again.

Relay delivery must be treated as at-least-once. The client receipt journal provides the final duplicate defense even if a relay retries the same encrypted envelope.

## Crash recovery matrix

| Boundary | Recovery action |
| --- | --- |
| Before the outgoing batch | Discard staged state; no stamp was broadcast. |
| After the outgoing batch, before transaction broadcast | Resume the persisted prepared outbox. |
| After transaction broadcast, before state update | Query or resubmit the persisted raw transaction, then deliver the persisted envelope. |
| After relay acceptance, before delivery update | Resubmit the exact serialized envelope; recipient receipt handling makes this safe. |
| During inbound decryption, before batch | Discard staged state and process the original envelope again. |
| After inbound batch, before UI cache update | Resume materialization from its durable record. |

## Required regression coverage before integration

- Inject failures at every outgoing and incoming transition, close LevelDB, reopen it, and assert the recovery action above.
- Assert byte-for-byte equality of every retry's serialized `MessageSet` and transaction hex with the initially persisted outbox record.
- Assert one-time prekey consumption, replay rejection, reordered message handling and identity-change rejection survive a fresh process.
- Assert invalid ciphertext, invalid signature and malformed envelopes do not change persistent state.
- Assert private-state files do not expose plaintext session records, prekey material or message plaintext when local encryption is enabled.
- Run `yarn test` and `yarn build`, then perform a disposable two-client local-relay test before a live Tor or wallet test.

## Decision gates

1. Confirm a production encryption library and its license are acceptable for Finney.
2. Confirm the desktop protected-storage and authenticated-encryption implementation can fail closed on supported platforms.
3. Define the messaging identity binding and device model before allocating the storage key namespaces.
4. Define relay duplicate semantics and recovery queries for persisted transaction identifiers.

Until those gates pass, the implementation remains limited to compatibility coverage and storage design. No handwritten ratchet, plaintext session store, replacement-stamp retry path or legacy-envelope migration is permitted.
