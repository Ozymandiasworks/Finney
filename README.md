# Finney

**Finney** is an experimental privacy-focused eCash (XEC) cryptomessenger derived from the original Stamp project.

Finney's first milestone intentionally keeps Stamp's proven application structure and GUI while migrating the chain-facing code back to eCash and preserving the original **recipient-spendable message stamp** mechanism.

> **ALPHA WARNING:** This source is under active migration and has not yet completed an end-to-end security audit or production build validation. Do not use it with funds or messages you cannot afford to lose.

## v0.1 design goals

- Preserve the original Stamp GUI and message-stamp workflow.
- Use native eCash (`ecash:`) addresses and XEC denomination (100 satoshis = 1 XEC).
- Preserve recipient-spendable, message-specific stamp outputs.
- Use the eCash BIP44 wallet path (`m/44'/899'/...`).
- Use eCash Chronik instead of the historical Lotus Chronik endpoint.
- Force Electron renderer network traffic through a SOCKS5 Tor proxy, with no direct fallback.
- Keep the historical message encryption protocol unchanged for this baseline so chain/transport migration can be tested independently.
- Avoid the obsolete Stamp/Lotus public relay and keyserver infrastructure.

## Tor requirement

The Electron build configures the default session to use:

```text
socks5://127.0.0.1:9050
```

You may select a different SOCKS5 Tor listener when launching Finney:

```bash
FINNEY_TOR_PROXY=socks5://127.0.0.1:9150 yarn dev
```

There is intentionally no clearnet fallback for Electron renderer traffic. Localhost is bypassed so the Quasar development server and a locally operated Finney relay can be reached directly.

**Important:** Links explicitly opened in the operating system's external browser are outside Finney's Electron Tor session. Do not assume your normal browser is using Tor.

## Relay/keyserver status

Alpha.9 includes the localhost-only compatibility relay and registry/keyserver, the fresh-profile startup-order fix, and a migration from the obsolete Chronik 0.8.x client to the current Chronik 4.3.x API:

```text
Relay:     http://127.0.0.1:31337
Keyserver: http://127.0.0.1:31338
```

Start them with `START_FINNEY_LOCAL_SERVICES_WINDOWS.cmd`. The services bind only to loopback and keep their data in memory; closing the service window erases it. This development backend exists to validate the old CashWeb/Stamp protocol on XEC before a persistent/public relay is designed. Alpha.9 also prevents the local development authorization token from starting message loading before a wallet identity has been generated. The wallet adapter now uses current Chronik UTXO fields and WebSocket subscriptions and no longer calls the removed `/validate-utxos` endpoint. The relay does not yet independently prove stamp transactions against XEC consensus, so it is not a production anti-spam relay.


## Alpha.17 XEC transaction ID correction

The inherited Stamp/Lotus bitcore fork used a Lotus-specific merklized transaction identifier. eCash uses the standard Bitcoin transaction ID (reversed double-SHA256 of the serialized transaction). Alpha.17 corrects the local library so transaction IDs now match Chronik and the eCash network. Historical received messages created by earlier Finney alphas are handled by resolving their unique derived stamp address against Chronik before a redemption proof is signed.

## Build from source

The project retains the original Quasar/Electron build layout.

Requirements:

- **Node.js 24.19.0** (validated Electron 44 build runtime)
- **Yarn 1.22.x**
- A local Tor SOCKS5 service for Electron network access

```bash
yarn install --frozen-lockfile
yarn check:runtime
yarn audit:static
yarn dev
```

### Windows development setup

For a normal Windows development machine, install Node 24.19.0 and then double-click `SETUP_FINNEY_WINDOWS.cmd`. The helper bootstraps Yarn 1.22.22 through `npx`, installs the source dependencies, verifies Chronik 4.3.x, and runs the cross-platform static migration audit. Alpha.9 intentionally refreshes the inherited Chronik dependency rather than freezing the old Stamp lock entry. After setup, start `START_FINNEY_LOCAL_SERVICES_WINDOWS.cmd` and leave that window open. Then start Tor Browser and run `RUN_FINNEY_TOR_BROWSER_WINDOWS.cmd`, which selects Tor Browser's local SOCKS port 9150.

Finney uses Node 24 because Electron 44 requires Node 22.12 or later. The existing Quasar 2.15 build toolchain, core regression suite, production package build and isolated renderer startup were validated with Node 24.19.0 and Electron 44.3.0. Continue to treat framework upgrades as separate compatibility work.

Production Electron build:

```bash
yarn build
```

Unit tests:

```bash
yarn test:unit
```

## Security scope of this milestone

### Implemented conservatively

- XEC/eCash address and denomination migration.
- Current eCash Chronik endpoint configuration.
- Recipient-spendable stamp mechanism retained.
- Tor-only Electron session proxy configuration (localhost development bypass only).
- No fallback to historical public Stamp/Lotus relay or keyserver endpoints.
- External URL bridge rejects non-HTTP(S) OS protocol handlers.
- Regression test added for sender/recipient stamp-key reconstruction.

### Deliberately deferred

These are desirable, but changing them at the same time as the chain migration would make failures harder to isolate:

- Replacing the legacy message crypto with a modern ratcheting E2EE protocol.
- Forward secrecy and post-compromise security.
- Separating the long-term messaging identity key from the XEC wallet key.
- Sealed-sender/opaque relay identities.
- CashFusion-aware stamp funding.
- Multi-device synchronization.
- Group messaging.
- Traffic padding and advanced metadata resistance.
- Removing Electron `nodeIntegration` after compatibility testing.

See `FINNEY_STATUS.md` for the exact migration state and known blockers.

## Source lineage and licensing

Finney is derived from the Stamp project. The existing project license is retained. The Stamp GUI is GPLv3; the `src/cashweb/` libraries are identified by the original project as MIT-licensed. Existing copyright and license notices should be preserved in derivative distributions.

## Two-client localhost milestone (alpha.11)

Alpha.11 adds isolated development launchers so two Finney identities can run on one Windows account without sharing local wallet/profile/message state.

1. Start `START_FINNEY_LOCAL_SERVICES_WINDOWS.cmd`.
2. Keep Tor Browser open.
3. Start `RUN_FINNEY_TEST_CLIENT_A_TOR_WINDOWS.cmd` and wait for Client A to open.
4. Start `RUN_FINNEY_TEST_CLIENT_B_TOR_WINDOWS.cmd`.
5. Create a different disposable test profile in each window.

Client B reuses Client A's Quasar development renderer but has a separate Electron user-data directory. Do not fund either identity in this milestone. The first real message will be tested later with a deliberately tiny XEC amount so the authentic recipient-spendable stamp path is exercised rather than bypassed.

## Alpha.15 recipient-stamp proof test

For development testing only, received stamped messages show a **Redeem Stamp Test** button. The test deliberately spends the received message-specific stamp UTXO together with one ordinary wallet UTXO from the recipient, then returns the combined remainder (minus the normal network fee) to a fresh recipient change address. This proves that the recipient-derived private key can sign for the stamp output.

Because the standard Finney message stamp is 5.46 XEC (the dust threshold), it cannot be moved by itself into another standard P2PKH output after paying the transaction fee. The proof therefore requires one ordinary recipient-wallet UTXO of at least 10 XEC.


## Alpha.16 restart persistence fixes

Alpha.16 re-derives received message-stamp private keys after restart instead of serializing them. Persisted message metadata supplies the payload digest and stamp outpoints; Finney deterministically reconstructs the same recipient keys and places the matching UTXOs back into the live wallet. The redemption proof then uses those live-wallet UTXOs. Successful outbound messages are also persisted locally so the sender's chat history survives restart.

## Alpha.20 stabilization

Alpha.20 is a core-lock release built from the proven alpha.19 reference. Run `yarn test:core` after setup to execute the static core guards plus the stamp-key cryptography regression test. `CORE_WORKING_BASELINE.md` records the frozen alpha.19 archive hash and the successful on-chain stamp-redemption proof transaction.

The development-only stamp-redemption button is hidden from the normal chat UI in alpha.20. The underlying proof code is retained for controlled development diagnostics. Topic polling is reduced from one second to fifteen seconds to remove unnecessary local relay churn.
