# Modern encryption migration design

Status: selected implementation direction. No production protocol, relay, wallet or message-format code is included here.

## Goal

Replace the legacy EPHEMERALDH AES-CBC/HMAC payload path with a maintained Double Ratchet implementation that provides forward secrecy and post-compromise recovery. Preserve the current recipient-spendable XEC stamp commitment: a stamp continues to commit to the final encrypted payload digest.

## Selected protocol library

Use the official @signalapp/libsignal-client Node package, pinned to an exact reviewed release. It is AGPL-3.0-only, matches the selected licensing direction, ships native binaries for Windows, macOS and Linux on x64 and arm64, and exposes TypeScript interfaces for identity, session, signed-prekey, one-time-prekey and Kyber-prekey stores.

The package is pre-1.0 and does not promise API stability. Every upgrade requires an isolated compatibility review, the full regression suite, a packaged Electron smoke test and a two-client protocol test. Finney must not implement a ratchet or primitive itself.

## Process boundary

The Signal native binding, messaging identity private key, session records and prekeys run in Electron's main process. The renderer receives only request and result objects over a narrow preload IPC surface. It does not receive serialized private messaging keys, session records or a generic cryptographic interface.

The current wallet remains in the renderer during this migration. The main process returns the final encrypted payload and immutable protocol header to the existing message/stamp construction path. A later wallet-boundary change may move more wallet operations out of the renderer.

## Identities and profile binding

A v2 messaging identity is generated randomly in the main process. It is not derived from the wallet seed and is not an XEC signing key.

For compatibility with the current relay, the existing wallet profile temporarily publishes a signed binding to the messaging identity and device prekey bundle. The profile binding contains:

- messaging identity public key and stable messaging identifier;
- device identifier and registration identifier;
- signed prekey, signature, creation time and expiry;
- one-time prekey identifiers and public keys;
- Kyber prekey identifiers and public keys when the selected library requires them;
- bundle revision and protocol capability.

The wallet profile signature authenticates the temporary binding. A received v2 envelope must match the sender messaging identity bound in the authenticated profile. A previously verified v2 peer cannot silently downgrade to legacy because a current profile bundle is unavailable or malformed.

This temporary profile binding is a bootstrap mechanism only. Opaque mailbox routing later replaces relay use of wallet-address identity.

## Envelope and stamp boundary

Scheme 1 remains the legacy EPHEMERALDH reader only. A new explicit scheme value and protocol-version field are required for ratchet messages; no existing scheme value or legacy HMAC field may be reinterpreted.

For a v2 message:

1. The sender resolves and validates the recipient prekey bundle.
2. The main process advances a staged Signal session and returns serialized ciphertext.
3. The client computes the encrypted payload digest from those exact ciphertext bytes.
4. The existing XEC stamp is constructed from that digest and the recipient XEC public key.
5. The immutable serialized envelope and raw stamp transaction bytes are persisted together before broadcast.

The outer source and destination XEC public keys remain for the existing stamp mechanism and temporary relay routing. The encrypted plaintext contains a canonical hash of the outer v2 header, including scheme, protocol version, XEC sender and recipient keys, messaging identifiers and device identifiers. The receiver verifies that hash after Signal decryption. This prevents an authenticated ciphertext from being moved to a different outer identity or recipient context.

Signal ciphertext authentication replaces legacy shared-key HMAC validation for v2. The v2 schema needs a distinct header-binding field; v2 processing must never call legacy HMAC verification or legacy CBC decryption.

## Durable protocol state

The main-process protocol adapter implements the store interfaces required by libsignal over the private-state database described in DURABLE_SESSION_PERSISTENCE.md. The adapter stages all session, identity and prekey mutations. A successful outgoing encryption is committed atomically with the immutable prepared outbox. A successful inbound decrypt is committed atomically with the receipt record and materialization request.

Prekey consumption, identity changes, skipped-message state and duplicate receipts are never written through the current plaintext message store. Invalid ciphertext, an untrusted identity, an invalid profile binding or an unsupported scheme must discard the staged adapter without changing durable state.

## Migration rules

- Existing scheme-1 envelopes remain decryptable for historical messages.
- New contacts use v2 only after a validated recipient bundle is available.
- A verified v2 contact records its highest accepted protocol version and rejects downgrade.
- Sender history and retry recovery preserve the original serialized envelope and stamp transaction bytes.
- Wallet recovery restores wallet funds independently of messaging-session secrets. Messaging recovery uses separately protected private state and explicit backup policy.

## Required implementation sequence

1. Complete the main-process integration spike with a pinned libsignal release and Electron packaging support for its native .node binary. The Windows packaged no-window smoke test must load the native module and complete a seal/open operation before any IPC is introduced.
2. Add encrypted private-state storage and the staged store adapter before enabling any v2 message path. The implemented main-process foundation has no renderer IPC or protocol caller; the adapter remains required.
3. Add a narrow preload IPC contract for profile-bundle publication, session setup, encrypt and decrypt. Do not expose store objects or key serialization.
4. Extend the profile and relay schemas for messaging-identity bindings and prekey bundles.
5. Extend the message schema with the explicit v2 scheme and header-binding data, retaining the legacy reader.
6. Implement outgoing prepared-outbox and incoming receipt transactions through the staged adapter.
7. Run generated-identity two-client tests for first contact, out-of-order messages, replay, identity change, prekey exhaustion, crash recovery and byte-identical paid retries.
8. Run a packaged Windows Electron two-client local-relay test before any Tor or live-wallet test.

No production v2 messages may be enabled until every item above is complete.
