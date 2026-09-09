# Finney v0.1-alpha.19 status

Working baseline carried forward from alpha.10:
- Finney GUI compiles/launches on Windows Node 16.20.2.
- Tor Browser SOCKS transport is configured.
- Current eCash Chronik client integration is present.
- Local relay and registry/keyserver are localhost-only and memory-only.
- Existing recipient-spendable message stamp derivation is preserved.

Alpha.11 adds:
- Isolated Electron user-data roots selected by `FINNEY_INSTANCE_ID`.
- Test Client A and Test Client B Windows launchers.
- Client B reuses A's dev renderer to avoid concurrent Quasar builds.
- Separate run logs for each test identity.

Current milestone:
- Prove two independent identities can register and coexist against the same local services.
- Funding is used only for explicit controlled protocol tests.
- Do not bypass the real stamp path merely to fake an unstamped chat test.


## Alpha.14 paid-send safety fix

- Fixed the localhost relay's missing `xec-livenet` registration. Alpha.13 ran
  in a separate Node process from Electron, so it never received the renderer's
  network registration and rejected real messages with HTTP 400 during public
  key/stamp validation.
- Added a localhost-only relay preflight endpoint. The client now runs the exact
  envelope/stamp validation before broadcasting any XEC. A deterministic 4xx
  therefore cannot consume a stamp during development testing.
- Removed recursive paid resend behavior. After a stamp transaction is
  broadcast, delivery retries reuse the exact same serialized message and never
  construct or broadcast a replacement stamp.
- Added `finney-local-services.log` for relay rejection diagnostics.


## Alpha.14.2 startup loading fix

- Removed the inherited requirement that Chronik's WebSocket be connected before
  the GUI can finish loading local relay message history. Tor can delay that
  WebSocket independently of local relay availability.
- Made setupConnections idempotent so repeated setup events cannot create
  overlapping message-load retry loops.
- Local relay message loading now retries in a bounded way and surfaces a clear
  diagnostic instead of leaving the GUI under an endless Loading messages mask.
- No changes to stamp derivation, transaction construction, XEC units, or the
  alpha.14 paid-send safety protections.


## alpha.15
- Added explicit Chronik HTTP connectivity diagnostic.
- If the Chronik WebSocket cannot open, wallet balance/UTXO state falls back to a 15-second HTTP refresh loop.
- Paid message construction, stamp derivation, relay preflight and broadcast safety logic are unchanged.

## alpha.15 recipient stamp redemption proof
- Adds a development-only "Redeem Stamp Test" button to received stamped messages.
- The proof transaction explicitly spends the received message-specific stamp UTXO plus one ordinary Finney B wallet UTXO, then returns the combined value minus fee to a fresh Finney B change address.
- This proves possession of the private key derived from the received encrypted message rather than merely observing the stamp output on-chain.
- The test requires one ordinary B wallet UTXO of at least 10 XEC because a 5.46 XEC dust-threshold stamp cannot create another standard output by itself after network fees.
- No stamp derivation, message encryption, relay validation, or paid-send behavior changed.


## alpha.16 stamp persistence and history recovery

- Reconstructs recipient stamp private keys from the persisted payload digest and recipient identity key on every startup. Private keys remain unpersisted; they are deterministically re-derived.
- Restores corresponding received stamp UTXOs into the live wallet so a received 5.46 XEC stamp remains visible/spendable after restarting Finney, subject to Chronik confirming it is still unspent.
- Redeem Stamp Test now selects the reconstructed live-wallet stamp UTXO rather than the metadata-only message copy.
- Successful outbound messages are saved to the local message database immediately so sender history survives restart.
- Message stamp derivation in `src/cashweb/relay/crypto.ts` and construction in `constructors.ts` are unchanged.


## alpha.19 canonical XEC txid fix

- Replaced the inherited Lotus merklized transaction-ID calculation in the local bitcore library with eCash/Bitcoin standard double-SHA256 transaction IDs.
- Historical received-message metadata can still contain the old Lotus-style txid, so Redeem Stamp Test now resolves the live stamp outpoint from Chronik by the uniquely derived stamp address and amount before signing.
- Redemption can spend a Chronik-verified resolved stamp even when its historical outpoint ID is not present under the canonical ID in the local UTXO cache.
- Added a regression vector from Finney's first funded test: the previously logged Lotus-style ID `b97b...9ff8` corresponds to canonical XEC txid `6b5f...16d3`.
- Core payload/stamp key derivation and message encryption remain unchanged.

## alpha.19 received-stamp canonical rehydration fix

- Fixed a restart/redemption bug where a persisted legacy Lotus-style stamp outpoint could be reinserted, rejected by Chronik as stale, tombstoned by the LevelDB UTXO store, and then silently refused when the redemption test tried to re-add it.
- Received stamp recovery now deterministically re-derives the stamp private key from the persisted payload digest + recipient identity key, resolves the live output through Chronik by derived address and amount, and inserts only Chronik's canonical XEC txid/output index into the wallet.
- Redeem Stamp Test no longer depends on a cached stamp UTXO/private key. It derives the key directly from the saved message and resolves the live canonical outpoint immediately before validation/signing.
- Core stamp cryptography (`src/cashweb/relay/crypto.ts`) and message stamp construction (`src/cashweb/relay/constructors.ts`) remain unchanged from alpha.17.

Alpha.19 sender-history fix:
- Create sender chat state on first outbound message instead of silently returning.
- Successful outbound messages continue to persist locally for restart recovery.
- Existing historical messages sent before persistence was introduced cannot be retroactively reconstructed on the sender.

## alpha.20 core-lock stabilization

Alpha.20 branches from the proven alpha.19 baseline and deliberately avoids changing the core stamp cryptography or message/stamp constructor. It adds source-hash locks and regression checks for XEC denomination, the 5.46-XEC stamp, preflight-before-broadcast ordering, single-paid-stamp retry safety, sender persistence, recipient stamp recovery, and canonical XEC txids.

The normal chat UI no longer exposes the development-only Redeem Stamp Test control. The proof implementation remains in source for controlled diagnostics. Public topic polling was reduced from one second to fifteen seconds, the relay error handling no longer introduces the four alpha.19 `any` lint warnings, and launcher diagnostics now report the correct per-instance log filename.
