# A1 offline experimental entry

Scope: Windows x64, two separately packaged inactive configurations (`xec-testnet`, `xec-regtest`), nonsecret profile admission and a static offline shell. Wallets, keys, messaging and chain access are not activated. This package has no application dependency on the existing Quasar boot, wallet, registry, relay, Signal or renderer preload.

Source origin: `a63eef5fb4204c9e075655a5a7846e80bf7352b8`. Exact submitted source is the containing Git commit, identified separately in the review packet. No package binary or executed acceptance evidence exists at source delivery. All executable tests below are UNEXECUTED. Source inspection is not package verification.

## Requirements and implemented surface

| Boundary | Required behavior / source location |
|---|---|
| Startup | `experimental/a1/app/main.js` is an independent packaged-only entry. Fixed configuration and launch validation precede profile mutation. Unsupported runtime/platform or failed boundary admission terminates. No automatic legacy profile discovery/import/reset. |
| Configuration | `app/policy.js` accepts schema 1, stage A1, exactly `xec-testnet` or `xec-regtest`, `deny-all-v1`, null endpoints and activation false. Each build contains one configuration; neither IPC nor runtime environment may change it. These names do not claim actual chain identification. |
| Profile | Only `C:\FinneyA1Lab\profiles\<fixed-network>\client-a` or `client-b`. `--create-profile` is explicit; ordinary open of missing state fails. Unknown/corrupt/foreign/conflicting state refuses. Strict canonical JSON, size limits, owner/network/purpose binding, exclusive create lock and changed-record checks. No wallet or mnemonic is generated. |
| Owner/path | `app/inspect-boundary.ps1` checks Windows SID ownership, restricted ACLs, reparse attributes, non-elevated execution and outbound firewall denial. `app/profile.js` additionally checks regular files, link count, resolved paths and file identity. Nonsecret profile metadata is bound to the current Windows account with safeStorage. No plaintext fallback or wallet-custody claim. |
| Runtime files | Each launch allocates a fresh Chromium runtime directory under `C:\FinneyA1Lab\runtime`. Existing Chromium profiles are not opened. These nonsecret runtime directories are retained; they are not wallet recovery stores. |
| Shell | Static HTML/CSS via two exact custom-protocol URLs. Sandbox/context isolation on; Node, workers' Node integration, subframe Node integration, webview and DevTools off. No preload, application JavaScript, IPC registration, remote module or external assets. |
| Capabilities | No wallet creation/import, seed view/export, signer, broadcast, publication, deletion/forwarding/wipe/destruction/retirement or Signal implementation is imported or registered. No hidden activation flag. |
| Network | All application outbound traffic is denied. Exact local documents alone pass the session request filter. CSP denies connections/scripts/frames/workers. Permission, download, navigation, redirect and popup callbacks deny. Native network/process entry points are closed after the fixed boundary-inspection subprocess finishes. OS egress denial is independently required. |
| Package | Separate unsigned directory package; publishing disabled. Only `experimental/a1/app` plus the fixed configuration enters app.asar. No production dependencies or legacy app are packaged. Dependency versions/lockfile remain unchanged. |

`inspect-boundary.ps1` is the single deliberate pre-window subprocess. Its fixed system executable, bundled script, enumerated arguments, minimal environment, ten-second timeout and bounded output are in `app/profile.js`. Ordinary renderer input cannot invoke it. It checks local metadata/firewall settings only. It is a review surface, not an assertion that all Windows isolation conditions are proved by a script.

Native wrappers are defense in depth; they do not intercept arbitrary compromised native machine code. The guest OS network boundary is mandatory. Same-user host tampering with an unsigned executable/ASAR or racing filesystem changes is not claimed to be prevented. Test excluded mounts and reparse/ownership attacks in the actual guest. Do not infer safety from a successful JSON attestation or a directory name.

The package hook disables run-as-Node, Node options, Node inspection and file-protocol extra privileges, and restricts loading to app.asar. It implements the documented [Electron fuse wire](https://www.electronjs.org/docs/latest/tutorial/fuses) with the [published option indices](https://github.com/electron/fuses/blob/main/src/config.ts), refusing unknown schema/length, ambiguous sentinels and removed required fuses. It preserves unrelated fuse bytes. It does not enable embedded ASAR integrity or provide code signing. Binary identity and installed-file protection remain separate evidence.

## Admission outcomes

Missing profile -> `PROFILE_MISSING` without creation. Existing profile plus create -> `PROFILE_ALREADY_EXISTS`. Missing marker in an existing directory -> `INCOMPLETE_PROFILE`. Invalid JSON/duplicates, oversized record, unsupported schema, foreign owner/network/purpose/proof -> typed refusal. Unexpected files -> `CONFLICTING_PROFILE`. Existing lock -> `PROFILE_IN_USE_OR_UNCLEAN` without deleting it. Unavailable/failed OS protection -> refusal; partial explicit creation stays incomplete. No stale-lock recovery, repair, reset, migration or destruction command exists. A crash can leave a lock and require separately authorized fixture handling. Preservation is intentional; automatic recovery is not implemented or claimed.

Profile records contain only schema, purpose, network, public fixture label, disposable account SID and OS-protected verification metadata. They are not a new wallet authority, secret hierarchy, backup format or durable operation log. A synchronous marker write is requested, but no storage-crash/durability guarantee is claimed.

## Execution prerequisites

Do not execute installation, compilation, tests or the application on the ordinary desktop. A dedicated Windows x64 guest (or independently demonstrated equivalent) must be available first. Record Windows build/filesystem, hypervisor configuration, account, source transfer and mount settings, disabled shared clipboard/drive integration, absence of host credentials/personal data/real wallets, and synthetic host-path/canary denial evidence. Use a standard local disposable account and no shared production profile.

The guest source path is fixed to `C:\FinneyA1Lab\source`. Provision lab-owned `profiles\xec-testnet`, `profiles\xec-regtest`, `runtime`, `fixtures` and `evidence` directories under `C:\FinneyA1Lab`. The standard lab account owns the lab root and descendants; only it, SYSTEM and local Administrators may have Allow ACL entries. Protect the lab root from inherited ACLs. Do not apply these changes to the owner's host or existing data.

Use a keyless package-acquisition phase with restricted fetch destinations and no host credentials. Inspect lifecycle/build scripts before `yarn install --frozen-lockfile`. Return to offline mode before building/testing: active Windows firewall profiles enabled, default outbound Block, and no enabled outbound Allow rules. Actual packet/canary evidence is still required; firewall configuration inspection alone is insufficient. Loopback-only test fixtures must be identified separately. No public-node probes.

An owner-approved evidence record at `C:\FinneyA1Lab\execution-approval.json` is required by build/test entry points. Fields: version 1; phase `offline`; platform `windows-x64`; disposable true; personalDataPresent false; hostCredentialsPresent false; sharedClipboard false; sensitiveMounts empty; evidenceDirectory `C:\FinneyA1Lab\evidence`; ownerApproval nonempty provenance. This is a prerequisite record, not an automated proof of isolation and not a replacement for external evidence. No completed record is supplied with the source.

## Commands — isolated guest only

Required setup candidate: Node 24.19.0, Yarn 1.22.22, locked Electron 44.3.0, Chronik 4.3.0, Level 7.0.1, LevelDOWN 6.1.0. Record exact executable paths and binary hashes. No proposed LevelDOWN upgrade is included.

From `C:\FinneyA1Lab\source`, first classify each existing suite's filesystem/network effects and run safe baseline checks at the untouched origin in a separate disposable guest snapshot. Keep baseline logs distinct from A1 logs:

```text
node --version
yarn --version
yarn check:runtime
yarn audit:static
yarn test:core
yarn test:unit:ci
```

Installation is a separate setup phase. The existing core aggregate starts a loopback relay test and includes synthetic key fixtures; do not confuse it with an app-wallet test. Existing Jest demonstrations are not custody coverage. Untouched-origin failures must be labeled PRE-REMEDIATION BASELINE FAILURE; do not update snapshots or repair unrelated failures.

After restoring the A1 source and verified offline guest boundary:

```text
yarn test:a1
yarn build:a1:testnet
yarn build:a1:regtest
node experimental/a1/test/packaged-smoke.js xec-testnet
node experimental/a1/test/packaged-smoke.js xec-regtest
node_modules\electron\dist\electron.exe experimental\a1\test\native-qualification.js
```

Build output goes to `dist/a1/<network>`; an existing output directory is refused rather than removed. Build from a fresh disposable snapshot or separately authorized output location cleanup. The unsigned entry is `dist\a1\<network>\package\win-unpacked\FinneyA1.exe`. Manual positive start uses `--profile=client-a --create-profile`; later ordinary open uses only `--profile=client-a`. There is no dev/no-sandbox validation mode.

## Acceptance/evidence matrix

| Case | Executable coverage supplied | Required evidence still absent |
|---|---|---|
| A1-01 OS/data | Fixed guest-path/evidence prerequisites; actual ACL/reparse/firewall inspection before app admission | Verified VM, mounts/clipboard/credential exclusion, canaries, effective egress capture |
| A1-02 profile/startup | Missing/explicit creation/reopen/duplicate/stale-lock/junction/conflict/provider/record-binding tests; packaged positive/duplicate/missing-profile smoke | Actual Windows execution; wrong-owner ACL campaign; actual failed/read-only/disk/backend conditions; package startup/refusal observations |
| A1-03 network | Config/override/endpoint/URL rejection; Node TCP/TLS/UDP/DNS/fetch/WS/process refusal child harness; package fuse assertions | Actual packaged HTTP/WS/DNS/native/redirect attempts and zero-unapproved-connection captures, including pre-main flags |
| A1-04 capabilities | Sandboxed option assertions, no-preload surface, permission/navigation/popup callback tests; actual preferences reported during package smoke | Packaged hostile renderer/forged IPC campaign, actual native/subprocess bypass attempts and all unavailable-operation refusals |
| A1-05 runtime/backend | Build version checks; actual Electron version/preferences output; separate nonsecret DPAPI/native Level reopen/error/binary-identity probe | All execution; unavailable/wrong-account provider and backend failure cases; packaged native qualification (the separate probe is not packaged evidence) |
| A1-06 regressions | New executable guard suite, packaged smoke harness and baseline commands identified | All suite results/counts, exact binaries, build results and independent verification |

Every row is UNEXECUTED, not passed or waived. Mocks are labeled in test names; mock protection is not DPAPI evidence. The native probe is an unpackaged Electron harness and cannot prove package custody or power-loss safety. The smoke harness observes actual package startup/preferences and duplicate admission, but is not a full forged-renderer or packet-capture campaign. It preserves its profile; a forced termination can leave the lock. No binary hashes can be supplied before a build.

## Route and dependency map

| Route in existing application | A1 disposition | Later prerequisite |
|---|---|---|
| Quasar boot/setup and restored general stores | Not imported or packaged | Explicit fresh main-owned custody/startup scope |
| Chronik HTTP/WS (`src/boot/setup-apis.ts`) | No client, DNS lookup or subscription | Named test chain/anchors, verified indexer and endpoint policy |
| Wallet forwarding/redemption (`src/cashweb/wallet/index.ts`) | No wallet/signing/broadcast entry | Owned inputs, recipient intent, amounts/fees/change, consent, durable operation/reservation and reconciliation |
| Relay preflight/delivery (`src/cashweb/relay/index.ts`) | No envelope or preflight disclosure | Exact durable artifact before disclosure; authorization, retry/replay and truthful delivery state |
| Registry/relay profile setup | Not imported; no registration action | Existing Setup publishes signed identity metadata. Disabled publication must not be re-enabled to make setup work. A later handoff may explicitly provision public test contacts and per-identity private-lab relay credentials. No such workflow is implemented here. |
| Local relay/registry service | Not started or packaged | Mainnet hard-code and volatile/shared development state cannot establish a testnet two-client authorization/recovery boundary |
| Forum/discovery, Signal | Absent | Separate activation authority, if ever included |
| Content deletion/forwarding/wipe/key retirement | Absent | Separately scoped non-spending/deletion/recovery behavior; no removal now |
| Browser, popup, navigation, permission, downloads | Denied; no shell bridge | Separate authorization before any external effect |
| Shell documents | Two exact in-memory custom-protocol assets | Packaged positive load/negative path evidence |
| Boundary inspector | One fixed, bounded local PowerShell invocation before native routes close | Actual ACL/firewall/runtime compatibility and adversarial argument/path evidence |
| Native/backend qualification harness | Guest-only, nonsecret, no wallet | Actual packaged ABI/provider qualification remains separate |

No B wallet/message implementation or C public-testnet activation is included. Future execution additionally needs explicit handoff, verified isolation/network endpoints, applicable custody/consent/commit/receipt/restart contracts and exact-SHA independent evidence. Mainnet, real-seed import, backup/migration/retirement, sharding, new cryptography and release remain outside this package.

## Independent verification boundary

Required next verification is targeted Security of the exact source and eventual package: any route to wallet/foreign profile/unapproved network; environment/ordinary-input bypass; actual sandbox/X-off/capability refusals; demonstrated guest isolation; and adequacy of positive/negative evidence. Reviewer inputs are this neutral requirement/build/route/evidence record, scoped source/tests, exact hashes and raw execution evidence when available. Historical reviews, adjudication and findings rationale are not inputs. No completed implementation checkpoint or Gate passage is claimed before missing execution evidence and verification.
