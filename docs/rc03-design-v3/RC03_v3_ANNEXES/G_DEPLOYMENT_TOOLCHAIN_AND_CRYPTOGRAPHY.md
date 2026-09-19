# Annex G — Deployment, transport, toolchain, and review assumptions

Status: normative proposed acceptance policy, version `3.0.0-draft`. OD-04, OD-05, OD-06, and the toolchain policy row remain pending owner decisions.

## G.1 Proposed Windows support matrix

| Subject | Proposed requirement | Status before OD-04/05 |
| --- | --- | --- |
| package | exact signed packaged Windows application identity/version | blocked: identity/version not selected |
| Electron | pinned build matching package lock and documented API behavior | blocked: exact acceptance package not selected |
| protected provider | selected Windows provider with explicit wrong-account/unavailable/corrupt behavior | blocked: provider/configuration not selected |
| protected backend | versioned backend exposing write acknowledgement and commit-ID resolution | blocked: semantics not selected/tested |
| legacy acquisition | fixed user-data path, origin, partition, namespace, schema mapping | blocked: mapping not established |
| writer exclusion | cross-process/old-client policy with detectable enforcement | blocked: OD-05 pending |
| ordinary renderer origin | fixed packaged origin and navigation policy | blocked: exact package origin not selected |
| other platforms | unavailable/unsupported; no plaintext fallback | proposed default |

The migration service may not treat any unselected row as satisfied by a current development environment. `safeStorage` availability alone does not establish authority isolation or durability. Same-user host compromise remains outside the claim boundary. A copied complete valid store remains a valid local snapshot without a separately selected freshness anchor.

## G.2 Durability and transport claim table

| Claim level | Evidence required | Permitted action | Not permitted |
| --- | --- | --- | --- |
| logical in-memory success | local method returned | none | projection, effect, cleanup, retirement |
| backend known write acknowledgement | selected backend says write accepted | non-destructive status | destructive claim absent barrier model |
| selected authority barrier | actual configured backend test plus commit resolution | public projection; final artifact dispatch under Annex C | cleanup/retirement absent recovery gate |
| selected cleanup barrier | exact deletion acknowledgement/accounting | cleanup cursor/progress | completion with unexpected source change |
| selected recovery gate | current verified artifact + fresh-profile restore | retirement of sole source only | claim power-loss/forensic erasure |

Enabled transports must have an entry in a versioned transport map: `transportId`, owner process, adapter version, proxy/Tor configuration source, verification method, DNS behavior, failure behavior, retry boundary, and direct-fallback prohibition. No transport is approved/changed by this package. A main-owned path that cannot verify its Tor/proxy policy reports unavailable/blocked and does not route directly.

## G.3 Old-writer, profile, and residual-copy policy alternatives

| OD-05 alternative | Requirement | Consequence |
| --- | --- | --- |
| A: isolated one-time acquisition | acquire legacy profile under a controlled migration process, then new profile is isolated; residual legacy copy is explicitly retained/treated | strongest separation but operational complexity |
| B: same-profile exclusive migration | demonstrate version/process exclusion before acquisition, commit, and cleanup | convenience but requires strong cross-version proof |
| C: coexistence | not acceptable for cleanup/activation claim | dual writer/conflict risk remains |

Until selected, current code may inspect only nonmutating mapping evidence. Any detected old writer, post-fence legacy write, downgrade attempt, alternate user-data collision, or copied profile ambiguity produces conflict and blocks migration/cleanup. Residual copies are never called erased.

## G.4 Canonical toolchain proposal — R12

| Item | Proposed acceptance value | Current limitation |
| --- | --- | --- |
| Node | `24.19.0` | `.nvmrc` and `.node-version` currently state `16.20.2` |
| Yarn | `1.22.22` | reported available Yarn has previously been `1.22.17` under explicit Node |
| package/runtime guard | package engines and runtime checker | selector alignment not authorized here |
| evidence | every build/test/package record includes exact executable version and lock hash | no v3 behavior test executed |

The future selector-alignment task must update `.nvmrc`, `.node-version`, Volta/package/README/CI only after separate authorization, use a single accepted policy, and prove clean-shell selector resolution plus runtime guard. This v3 document does not edit selectors, install dependencies, or use unsupported runtime evidence as application acceptance.

## G.5 Cryptography review assumptions

Cryptography review must assess portable candidate P-1 or its owner-selected successor, canonical commitment grammar/authenticator placement, scalar/identity exposure, BIP39/derivation compatibility, and any key-use effect. Mathematical harness results do not prove pinned-library behavior, exceptional derivation handling, Windows provider behavior, or application recovery. External human specialist assessment remains required before sensitive reliance.
