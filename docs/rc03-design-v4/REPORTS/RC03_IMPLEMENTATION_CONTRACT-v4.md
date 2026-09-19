# RC-03 wallet-custody implementation contract v4

Version `4.0.0-draft`; documentation remediation only. Gate1 remains BLOCKED; PRE-001 unsatisfied. Production implementation, migration, signing/export/destruction execution, selectors/dependencies/build changes, finding closure, risk acceptance and roadmap advancement are unauthorized.

## 1. Identity, authority and scope

Builder checkout `F:/Finney/libsignal-spike-20260913`; branch `gate1/remediation`. Starting reviewed design commit `08673ef0c7c190132802dad88970e89ccc96c59a`; production baseline `b61c888bbbdae632541c41c7f829a9ed13ad77b2`. These identities were verified before changes; no non-docs tracked delta existed against production baseline. Tracked working tree was clean. Preserve/exclude three existing untracked governance files: FINNEY-FINDINGS.md, FINNEY-OM.md, FINNEY-RC03-ARCHITECTURE-REVIEW.md. No reset/stash/branch/tag change authorized or performed for this design. Eventual delivery commit is the containing Git commit reported at delivery; no self-referential SHA is embedded as if already known.

Controlling adjudication: `2026-09-19_ADJUDICATION_08673ef_v3.md`, SHA256 `5531A65B8A54C55838860EAED437C94E08AED8D1ACE5F5C0AA0A12E2E7CDFDED`. The assigned W1–W10 requirements govern this revision. Historical combined adjudication preserves obligations/primary groups, not a new whole-product audit. RC03-01/RC03-SEC-01 plaintext secret custody remains one High root defect; RC03-09 destructive replacement before readiness remains a distinct High defect. No demonstrated theft, initial renderer exploit, duplicate payment, malicious live broadcast, power-loss loss or master-seed recovery is inferred from narrower review evidence.

Model request: `gpt-6-astra` / `xhigh`; exact active selector/reasoning not independently observable, so not recorded as verified. No independent review performed by Builder and no other role contacted.

## 2. Review package and neutral coverage

Governance package: this contract; [crosswalk](RC03_CONTRACT_CROSSWALK-v4.json); [owner decisions](RC03_OWNER_DECISIONS-v4.md); [acceptance matrix](RC03_ACCEPTANCE_MATRIX-v4.md). Technical review subject: [neutral specification](../REVIEW_INPUTS/RC03_TECHNICAL_SPEC_v4.md) and Annexes A–G. All twelve artifacts have SHA256 entries in [manifest](../REVIEW_INPUTS/RC03_v4_REVIEW_PACKAGE_MANIFEST.json); manifest itself is hashed separately at delivery. Full content is copied to `docs/rc03-design-v4/{REPORTS,REVIEW_INPUTS}` with identical layout/relative links. Earlier packages stay unchanged.

Clean-room reviewers receive **all eight neutral technical documents** plus exact pinned source/build instructions, not governance contract/findings/crosswalk/owner rationale/adjudication/matrix/manifest or Builder correctness explanations. They attest to the neutral file hashes and actual coverage. Adjudicator separately evaluates complete governance package and traceability. This corrects any prior demand to review excluded full-contract records. Technical policy alternatives, blocked transitions and every planned acceptance case appear neutrally in spec/annexes; governance labels alone do not establish coverage. No intentional technical omission is declared; a discovered omission is a blocking revision, never presumed approval.

## 3. Required properties retained

Main-owned wallet authority and secret operations; renderer isolation with no generic key/sign/derive/store/URL escape; input/network/amount/fee/change/reservation/replay enforcement; no unattended spending. Preserve existing addresses, transaction/message wire formats, canonical IDs, BIP39/path/encounter-order semantics and disabled Signal. Retain all ordinary/change/stamp/stealth/frozen/pending/orphaned/spent-retained/descriptor-incomplete outputs through raw persistent inventory. Keep validated scalar fallback when descriptor incomplete; no deletion based on an indexer/cache omission.

Startup never turns failure into empty authority; every attempt settles. Candidate prepared before replacement, old recovery retained until separate retirement. Awaited barriers and one authority writer, with explicit unknown outcomes. Complete protected recovery before legacy cleanup. Complete portable restore independent of old OS keys and relay. Content deletion, secret retention, retirement and profile destruction are distinct operations. Unsupported schemas refuse writes; new-client checks alone cannot restrain older binaries. No whole-valid-store rollback detection or forensic erasure promise.

Cross-group interfaces are neutral N5/B5: RC-04 commit/resolve/outbox, RC-14 startup/candidate, RC-08 coverage/export/restore, RC-15 retain/tombstone/destroy; RC-09 containment, RC-01 spending authorization and RC-17 evidence remain dependencies.

## 4. Sequenced repair plan — implementation prohibited pending acceptance

Each row is a later implementation plan, not permission. Exact affected paths, cycle-qualified finding mappings, dependencies and tests are machine-readable in the crosswalk. New modules, if later needed, must be scoped main-owned authority/IPC/recovery services; no opportunistic crypto/protocol replacement. Existing vendored crypto files are compatibility targets, not upgrade authorization.

| Order / package | Concrete required result and invariants | Planned components / current affected files | Dependencies, decisions and tests |
|---|---|---|---|
| 1 W2 | A1–A5 closed value-level method grammar, trusted channel, pagination, aggregate budgets/fair cancellation; no lexical JSON claims after clone | electron-main/preload; src/boot/electron.ts; ordinary/trusted UI bridge | OD-01/02/04; W2-01..04, W5-01, W10-01 |
| 2 W3 | B3/B4,F1 atomic backend only, recoverable immutable values/prior head, authenticated key hierarchy/expected membership, deterministic canonical types, typed ACK resolution | private-state.js integration; wallet storage contracts and level-storage.ts; proposed main repository | W2, OD-04/05/06; W3-01..06; external human integration before adoption |
| 3 W1 | B1/B2,D1 candidate-only first create/import, stable IDs, prepare/validate before switch, old generation preserved; live fence reacquired on every restart | boot/pinia.ts, setup-apis.ts, stores/wallet.ts, pages/Setup.vue, acquisition adapter | W2/W3, OD-01/04/05/06; W1-01..04; protect existing recovery first |
| 4 W9 design / later implementation after W6/W7 | D3/D4 no-spend content deletion; independent authenticated L/KL surviving removal; explicit terminal/successor links | relay/index.ts, WipeWallet.vue, DeleteMessageDialog.vue, lifecycle service | W1/W3/W6/W7, OD-01..06; W9-01..04; no source deletion before qualified recovery |
| 5 W5 | A4,C4 fresh-sign/observation/exact-delivery split; selected restart authority; trusted zero-payment identity publication | main/preload, registry/index.ts, SeedPhraseDialog.vue; approval service | W1/W2/W3, OD-01/06; W5-01..04; no unrestricted signer |
| 6 W4 | C1–C3 exact intent/artifact/in-flight barriers, spendable-preflight classification, per-effect reducers/partial/reorg evidence, durable replay past256 cache entries | relay/index.ts/constructors.ts, registry/index.ts, wallet/index.ts; outbox/reservations | W3/W5, OD-01/04/06; W4-01..04; REG-01..03 |
| 7 W6 | E1–E4 bound fallback, valid zero-padding, explicit compression, original/effective indices and exceptional pinned behavior; protected encrypted export exception | relay/crypto.ts/decode-entry.ts, output repository; vendored derivation as unchanged fixture subject | W3, OD-02/06; W6-01..05; no derivation redesign |
| 8 W7 | F2–F5 exact P4/library/KDF/framing/canonical payload proposal, resource ceilings/privacy alternatives and inactive complete restore | main export/import, recovery repository; dependencies only after separate explicit authorization | W3/W6, OD-01/02/04/07; W7-01..06; dedicated and external human crypto review |
| 9 W8 | F6,D2 semantic coverage excludes qualification bookkeeping; real custody mutation stales; actual artifact recheck at retirement fence | backup catalogue, snapshot/retirement service | W7/W4/W9, OD-02/03/04/06; W8-01..03 |
| 10 W10 | G4,A2 exact destination-bound trusted external launch, no navigation bypass or restored consent | electron-preload/main, boot/electron.ts | W2/W5, OD-01/04; W10-01..02 |
| Last acceptance | G1/G6 actual provider/backend/package/transport evidence, complete regression and offline recovery, separate storage-crash claims | proposed test harnesses, scripts/test-legacy-payment-disabled.js, test-received-output-validation.js, test-wallet-diagnostics.js and existing full suite | OD-07 tooling alignment separate authorization; R1–R12/REG cases; independent exact-SHA serious-fix verification |

The table has a design dependency between recovery and deletion; implement retention/no-spend routing before any destructive cleanup, then recovery/qualification, then enable cleanup/destruction only after acceptance. Do not interpret W9's early design placement as authorization to remove secrets before W7/W8. No work package is implemented/closed by this document.

## 5. Finding coverage and historical provenance

55 historical rows,29 v2 review rows and10 supplemental obligations are retained with original fields/IDs/primary groups. Twelve historical R packages remain recorded. Added22 v3 rows are qualified by cycle, full saved-report hash and local ID, and retain reported severity/condition and accepted/merged disposition. Each has current requirement anchors, dependencies, owner decisions and planned tests. Preserve13High/9Medium v3 count without treating overlapping reports as22 independent root defects.

| Saved v3 report | SHA256 | Receipt SHA256 (different representation) |
|---|---|---|
| Architecture | 40B484B8F5751983585F6DE23C4FA3CCB1A4F46AF6261D04FC59D0D1668ADACE | 9DA591548A8233C3BC971269CA87EB1FEE62BE014CB2C826B396BAC2C3DD9B4D |
| Security | FC77A3292CDD13C439502D997A5E221BD11677A55BBC5BFCDF3DD51F1C704709 | D3894032DC84543E0C835DEC94D65BF057647C32661A3DD9DC6BB5580FB8D75E |
| Cryptography | 692B86293E641732EDF854F79CD5368E46A532FA6C4136540FF1D93339CB2D7D | 584C14259F08CD9C2EC4E16E2BBD006A677B45B6DCA595479B054C6FCF46C1AD |

Review evidence limits retained: Architecture four synthetic checks and disabled-Signal checks; Security11 mock expectations under Node16 with delivered/executed harness hashes differing by a counting-comment correction; Cryptography corrected17/17 targeted actual-vendored/independent checks plus isolated Argon2 observations, with initial harness mistakes preserved. None is a product acceptance count. No real provider/complete restore/build/power-loss evidence inferred. New plan explicitly fixes scalar1 leading-zero rejection and pinning compression; neither creates a new protocol.

## 6. Owner blockers, limitations and deferrals

OD-01–07 and subdecisions all pending, no dated owner selection supplied. Added OD-01E non-payment publication, OD-02F clear-header privacy and OD-04D external launch. Complete reviewable supported alternatives/disabled branches are in G5 and [decision record](RC03_OWNER_DECISIONS-v4.md); dependent transitions remain blocked. P4/libsodium and AES/HKDF/HMAC hierarchy are unselected integration proposals, not adopted cryptography. Exact package identity, loaded provider/backend barrier behavior, source mapping and pinned crypto binary integrity require implementation-era evidence. No current package/build test result supplied by this task.

Conditionally deferred broader work remains conditional: other platforms until separate provider evidence; stronger freshness/forensic erasure require separate designs; rich backup UI/automation, multi-device/rotation, broad discovery/GC, transport expansion and wider dependency audit are not included. Complete known-output preservation, usable portable recovery, fail-closed transport, logical secret cleanup and truthful failure states are **not deferred**. Toolchain selectors still mismatch; this documents a prerequisite and does not repair infrastructure. Current source defects remain open pending implementation and verification.

## 7. Delivery checks and required stop

Documentation validation must parse both JSON files, verify106 unique qualified finding rows plus10 supplemental rows, all22 v3 mappings/13High9Medium, every current path/anchor/test reference,74 planned-test identities, seven pending owner groups, all12 hashes and byte-identical Git/control copies, version/source consistency and doc-only Git diff. Scan added documentation for accidental credentials; examples use only public ranges/constants, no usable wallet fixtures. No test suite/build/migration/signing/export/destruction execution is authorized in this phase.

After checks, commit/push only v4 documentation on gate1/remediation, report exact SHA and push result, append own Builder update, preserve existing tags/untracked files and stop. Required next reviews are C—Architecture and Security plus D—dedicated Cryptography on frozen neutral package. Adjudicator evaluates governance; owner supplies decisions. External human cryptography integration assessment remains separately mandatory before adoption/sensitive reliance. Later implementation requires further adjudication and explicit authorization, then exact-SHA independent post-fix verification, especially both historical High defects.
