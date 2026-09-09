# Finney v0.1 Core Working Baseline

Finney v0.1-alpha.19 is the frozen reference source for the first proven end-to-end resurrection of the original Stamp mechanism on eCash (XEC).

## Proven behavior

- Two isolated Finney identities can run simultaneously.
- Both identities can discover each other through the development registry.
- Electron networking is configured through Tor Browser SOCKS5 during the test workflow.
- Finney detects and spends native XEC through current Chronik APIs.
- A sender can attach a 546-satoshi / 5.46-XEC recipient-spendable message stamp.
- The recipient receives and decrypts the message and recognizes the 5.46-XEC stamp.
- The recipient can reconstruct the stamp key after restart.
- Legacy Lotus-style saved transaction IDs are resolved to canonical XEC outpoints.
- The recipient successfully spent the message-derived stamp in the development redemption proof.
- Sender-side and recipient-side chat history survive restart.
- Relay preflight occurs before XEC broadcast.
- Relay retries after broadcast reuse the same already-paid envelope and do not construct replacement stamps.

## On-chain redemption proof

Transaction ID:

`3847f6f7c417df85cbecd92aa10e833c5656503843cefe07bc28c444d9ebe678`

This transaction is the development proof that Finney B possessed the private key deterministically derived for the received message stamp and could spend that XEC output.

## Frozen alpha.19 source archive

SHA-256 of `Finney-v0.1-alpha.19-source.zip`:

`d8ef693244df132c66b19f960df3a536f9ea08c635b2567348c748778cdccb73`

## Core-lock policy

Alpha.20 adds automated guards around the proven baseline. In particular, the following alpha.19 files are hash-locked by `scripts/test-core-lockdown.js`:

- `src/cashweb/relay/crypto.ts`
- `src/cashweb/relay/constructors.ts`
- `local_modules/bitcore-lib-xec/lib/transaction/transaction.js`

Future intentional protocol changes may update those hashes, but they should never change silently during unrelated cleanup work.

## Offline regression checks

Run `yarn test` with Node 16 and the installed development dependencies. Windows setup also runs these checks.

The suite checks the frozen core hashes, static send/persistence guards, canonical XEC transaction ID, encryption round trips, shared and stealth keys, stamp recovery from a restored recipient key, and local relay token configuration. It uses temporary random test keys and an isolated temporary token file; it does not access saved identities or broadcast transactions.

The legacy Jest UI suite remains separate and requires its missing test dependencies. These offline checks do not replace live A-to-B delivery, restart testing, or a security audit.
