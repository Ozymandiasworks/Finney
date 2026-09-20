# RC-03 technical specification v5

Design version `5.0.0-draft`, documentation proposal only. Application repository `F:/Finney/libsignal-spike-20260913`, provenance branch `gate1/remediation`. Production source baseline `b61c888bbbdae632541c41c7f829a9ed13ad77b2`; predecessor design identity `16325908abea318ee0f8511f59ec396da0d0eefa`. Delivery commit is the Git commit containing this exact package, recorded separately from those baselines. No implementation approval, finding closure or Gate1 advancement follows from this specification.

## N1 — Complete technical subject

This document and the seven annexes below constitute the **entire neutral technical review subject**. No technical requirement depends on reading a findings register, crosswalk, owner rationale, adjudication, governance contract or agent explanation. All owner policy alternatives and dependent blocked transitions are restated in G5; no selected owner policy has been supplied. The accompanying governance package is for adjudication, not an additional clean-room input. Review coverage is exact hashes of these eight files and the pinned application source. No omitted technical requirement is intentionally delegated to excluded governance material. If subsequent consistency checks find an omission, it is a blocker, not presumed covered by a label.

| Annex | Normative proposed content |
|---|---|
| [A](RC03_v5_ANNEXES/A_IPC_SCHEMAS_AND_LIMITS.md) | All method grammars, caller/trusted-channel rules, errors, cumulative limits and cancellation |
| [B](RC03_v5_ANNEXES/B_LIFECYCLE_REVISIONS_AND_COMMITS.md) | Startup/candidate/replacement, complete authority records, atomic backend commit/recovery and interfaces |
| [C](RC03_v5_ANNEXES/C_OPERATION_AND_EFFECT_TABLES.md) | Intent, transaction validation, effect/replay reducers and fresh/restart/retained authorization |
| [D](RC03_v5_ANNEXES/D_MIGRATION_AND_DESTRUCTION_RESTART_TABLES.md) | Fresh source fence, cleanup, retention/tombstones, surviving destruction evidence and supersession |
| [E](RC03_v5_ANNEXES/E_DESCRIPTORS_AND_COMPATIBILITY.md) | Complete known-output binding, scalar fallback, exact derivation compatibility and protected-export exception |
| [F](RC03_v5_ANNEXES/F_PROPOSED_CRYPTOGRAPHIC_FORMAT_AND_COMMITMENTS.md) | Canonical authenticated graph, exact library/container proposal, resource budget, portable restore and stable qualification |
| [G](RC03_v5_ANNEXES/G_DEPLOYMENT_TOOLCHAIN_AND_CRYPTOGRAPHY.md) | Windows/provider/backend/deployment, transport/browser privacy, every pending policy and evidence layer |

## N2 — Custody, threat and invariants

Main owns wallet authority and secret operations. Ordinary renderer/general stores must not routinely receive mnemonic/root/identity/output private material; encrypting in main then returning keys does not satisfy this target. Main secrets never travel through a generic storage/sign/derive/export/network bridge. Trusted secret UI is separately scoped and cannot be invoked through ordinary IPC. Renderer compromise is assumed for testing the boundary, not demonstrated by this document. Hostile network input, imported/corrupted/copied records, old writers, lost acknowledgements and process/storage faults are in the specified failure cases. Same-user host compromise, whole-valid-store rollback absent independent freshness, and forensic erasure are not promised.

Main enforces owned inputs, exact user recipient/content/destination intent, network, integer amounts, fees, wallet-owned change, reservations and replay. No unattended spending allowance exists. Fresh signing, observation and exact-byte delivery are distinct authorities. Non-payment identity signatures/publications need consent too. Content deletion cannot sign, reserve or broadcast. Every required record is protected and durable before its dependent disclosure or removal. Unknown effect/commit outcome never means absent/not-paid; no automatic replacement payment or input release.

Only validated current committed graph supplies authority. Projection/cache/indexer absence never drops recovery material. Errors never create a wallet or empty overwrite. Every startup attempt settles. Replacement prepares and validates candidate first, retains old generation/recovery/unresolved operations, then atomically switches. Portable recovery includes all known ordinary/change/Stamp/stealth/frozen/pending/spent-retained/orphaned/incomplete-descriptor scalar-only records and their provenance, operation bytes, reservations, replay and tombstones. Seed-only backup cannot satisfy complete recovery.

## N3 — Compatibility and policy boundaries

Preserve existing XEC address/wire formats, canonical IDs, BIP39 empty-extra-passphrase behavior, ordinary/change/identity coin899 paths and special44/145 encounter-order derivations. No Signal activation, new encryption protocol, transport-independent Envelope, sharding, roadmap or release is within scope. Pin exceptional existing library behavior; valid32-byte zero padding is accepted. No silent library standardization, input byte-order conversion or network alias reinterpretation. Protected scalar export is permitted only inside the explicit complete encrypted recovery container.

All algorithms/backend/device/ceremony policy proposals remain unselected. G5 supplies complete supported alternatives or an explicit disabled/blocking alternative when another design would be required. Selecting a different crypto/provider/freshness construction later requires its own complete revision; no empty 'other option' can pass adoption. Missing choice blocks its dependent transition without weakening an invariant. Current two-stage authorization is design review/adjudication and owner decisions first, then explicit implementation authorization; adoption of format/key hierarchy and sensitive reliance additionally requires external human cryptography integration assessment.

## N4 — Lifecycle and ownership overview

B1 pipelines provider/lifecycle authentication, intermediate commit resolution, committed membership verification then state classification. Valid candidate-only is distinct from verified absence; supported post-destruction successor is linked explicitly, not created by deleting a marker. B4 requires atomic single-DB sync batch and immutable staged full values with preserved prior graph; no nontransactional journal fallback. L/P cross-store destruction uses ordered authenticated intents, not an atomicity fiction. Old-client fence is re-established on **every restart**, before authoritative copy/cutover/cleanup. A stale persisted fence is diagnostic only.

C2 durably records final bytes and in-flight disclosure intent before validation endpoints receive a signed envelope. Persistent request correlation survives volatile cache expiry. Continued delivery after caller loss follows selected fresh consent or explicitly bounded exact-artifact continuation; no old approval resurrection. New identity statements require trusted content/target approval even with zero payment. D3 retains reconstructable protected content/recovery/replay, then tombstones before ordinary projection removal; it does not claim complete content erasure. D4 independently authenticated lifecycle records survive profile secret deletion and allow explicit successor profile without erasing terminal history.

F6 semantic coverage excludes qualification bookkeeping while including genuine custody/effect/reservation/tombstone/policy mutations. Exact finalized artifact reauthentication and current coverage recheck under retirement fence are required. Read-back is not durability. Fresh independent offline restore must work without old DPAPI key or relay; restored approvals never execute. Unresolved/quarantined recovery blocks completeness. External browser launch is an independent consented OS effect with explicitly separate network privacy, never automatic navigation forwarding.

## N5 — Cross-group contracts

| Interface | Input/output | Required invariant |
|---|---|---|
| RC-04 persistence/operations | B5 commit/resolve, C immutable operations and effect evidence | Await actual barrier/outcome; single owner; protected recovery before disclosure |
| RC-14 startup/replacement | B1 Status, B2 candidate lifecycle | Every attempt settles; no error-to-empty, old recovery preserved |
| RC-08 complete recovery | E inventory, F SnapshotToken/Qualification/portable candidate | Every supported known script/scalar restored without original OS key/relay |
| RC-15 deletion | D retention/tombstone versus retirement versus destruction | Content never spends; durable logical deletion and no stale authority resurrection |
| RC-09 isolation / RC-01 intent | A public/trusted methods and C1 consent | No raw authority/generic signer; no unintended spending |
| RC-17 evidence | G6 and all annex fixtures | Separate implemented/tested/independently verified properties; no self-certification |

## N6 — Verification semantics and stop boundary

Every W/R/REG fixture is **PLANNED, UNEXECUTED** for this design. Mock reducer/provider tests, actual native backend reopening, packaged Windows protection, controlled process termination, storage-crash testing, interoperability and independent review are separate evidence layers. Existing synthetic experiments cannot count as implementation acceptance. No live funds or real user secrets; generated fixtures and isolated data only. Full future regression/build commands are G6; planned new tests must acquire executable identities only after authorization.

Review required: Architecture and Security, plus dedicated Cryptography, over the complete frozen neutral package. External human cryptographic integration review is separate. Later exact-SHA post-fix independent verification must cover routine-secret exclusion through packaged startup/receive/sign/restart/migration/backup and destructive replacement failures before/after prepare/save/activate/retire. Do not declare Gate1 passed or system security from documentation/internal tests. Stop after delivery; no source implementation.

## N7 — Supplemental property fixtures

The following table carries continuing technical acceptance cases. Rows are planned and unexecuted; annex W rows add concrete boundary cases. REG-01–03 are fully stated in C5; R11-02/R12-01 in G6.

| ID | Family | Fixture and starting state | Injected boundary | Required property | Evidence layer | Permitted claim |
|---|---|---|---|---|---|---|
| R1-01 | R1 | every mapped backend absent/present | simultaneous valid/corrupt/unavailable markers | one classified state within 30s; lower diagnostics preserved | unit + actual backend | reducer behavior only |
| R1-02 | R1 | legacy-only, projection-only, normal-journal-only, destruction-terminal profiles | probe timeout/EIO/permission | no mutation/setup/autosave/signing/cleanup; typed result | actual backend | failure admission |
| R1-03 | R1 | destroyed profile | explicit post-destruction new-profile request | new profile ID only through selected ceremony; terminal history preserved | packaged Windows | bootstrap behavior |
| R2-01 | R2 | populated packaged legacy profile | wrong userData/origin/partition/schema | not absence; raw source unchanged | packaged Windows | mapped acquisition behavior |
| R2-02 | R2 | all cooperative workers active | late write at final drain/old client write | no frozen inventory/copy; conflict preserved | integration + packaged old-client case | fencing behavior |
| R2-03 | R2 | frozen source inventory | stop after every journal/copy/verify/commit/projection/delete/cursor edge | source before commit or verified protected authority after commit; unexpected change blocks | actual backend reopen + controlled interruption | restart behavior, not power loss |
| R3-01 | R3 | approved send at epoch e | unrelated receipt, self-progress, competing writer | documented capability survives only permitted unrelated change; no duplicate reservation | repository integration | revision-domain behavior |
| R3-02 | R3 | record/member/manifest set | key/wallet/network/purpose/generation/revision substitution and replay | reject before authority use | actual provider/backend | binding behavior |
| R3-03 | R3 | independent encoders | duplicate/reordered/omitted/ambiguous canonical input | identical valid vectors; invalid forms reject | deterministic vectors + crypto | encoding agreement |
| R3-04 | R3 | normal receive/reserve/spend | failed/lost commit acknowledgement | no projection/effect/release until resolve-commit | backend integration | commit uncertainty behavior |
| R4-01 | R4 | prepared exact send | change recipient/fee/change/message/window/epoch after approval | approval invalidates; no signature/effect | trusted-ceremony integration | intent binding |
| R4-02 | R4 | consumed approval | terminate after consume, in-memory sign, final-artifact persistence, first disclosure | no restart continuation without permitted durable state; no new payment | controlled interruption | artifact boundary |
| R5-01 | R5 | multi-transaction bundle/effect plan | accept any subset then drop replies/reorder callbacks/reorg | exact bytes only; reservation retained; truthful aggregate status | relay/wallet integration | effect recovery |
| R5-02 | R5 | registry/profile/forum spendable attachment | attempt direct publication route | route joins payment operation/effect table; no bypass | integration | operation coverage |
| R6-01 | R6 | generation A uncertain operation, activate B | delayed A callback/new A receipt | B projection unchanged; A scoped settlement/recovery follows selected policy | lifecycle integration | generation isolation |
| R6-02 | R6 | same root imported twice with same canonical outpoint | concurrent reservations from candidate/active/retained | one profile-wide reservation owner | repository integration | outpoint ownership |
| R7-01 | R7 | ordinary/change/Stamp/stealth/frozen/orphaned/scalar-only fixtures | sort/reorder/filter/nonsequential vout/historical alias | original semantic ordinals retained; scripts/signatures reproduce or record quarantined | pinned-library + independent vectors | recovery compatibility |
| R7-02 | R7 | scalar/point boundary fixtures | scalar 1 with valid 32-byte zero padding; zero/n/out-of-range/31/33-byte/invalid point/missing context | valid padded scalar1 accepted with explicit encoding; invalid range/width reject or quarantine without loss | pinned-library + independent vectors | descriptor validation only; UNEXECUTED |
| R8-01 | R8 | all profile/wallet/identity methods | forged payload identity, subframe, popup, navigation/reload/replaced window | main-derived caller check rejects; no privileged effect | packaged Windows | caller isolation |
| R8-02 | R8 | synthetic secret marker flows | import/export/failed setup/restore and prompt cancellation | no marker in ordinary renderer/IPC/log/error/worker/clipboard/temp/crash artifacts | packaged Windows | tested sink absence only |
| R8-03 | R8 | hostile request/import/identity data | size/depth/count/queue/KDF flood | reject before expensive work; cancellation/status remains responsive | IPC/parser integration | resource bounds |
| R9-01 | R9 | frozen multi-generation snapshot | mutation during export, omitted scalar/generation/tombstone, short write/rename/disk full | exact artifact fails coverage or becomes stale; retirement blocked | backend/filesystem integration | coverage gate |
| R9-02 | R9 | portable artifact candidate | wrong credential/tamper/truncate/unknown suite/hostile KDF/RNG failure | no plaintext/activation/authority mutation; typed failure | crypto/library vectors + integration | parser/format behavior |
| R9-03 | R9 | fresh profile without original OS key/relay | restore complete synthetic catalogue/pending operations | inactive candidate only; exact scripts/synthetic signatures; no fresh approval | packaged Windows recovery | offline restore behavior |
| R10-01 | R10 | content with recoverable descriptors | delete request/late delivery/replay/old-backup restore | retain then tombstone before removal; zero signing/broadcast | message/wallet integration | deletion separation |
| R10-02 | R10 | whole-profile destruction | interrupt every retain/tombstone/delete/terminal edge; inaccessible store; cancel each side | classified restart; no accidental setup/completion claim | actual backend + packaged Windows | logical destruction behavior |
| R11-01 | R11 | owner-selected package/provider/backend profile | unavailable/wrong-user/corrupt provider/lost ACK/chunk limit | only documented durability level actions occur | packaged Windows | selected configuration behavior |

## N8 — Integrated v5 definitions and blocked alternatives

F4 preserves each complete original logical envelope and authenticated Ref before a total main-owned physical Cell/Binding mapping. Imported origin records and grants are nonexecutable; new local mutation has distinct current authority. B7 enumerates all logical record bodies/edges and supporting SourceIdentity/LifeRef/SnapshotToken, while E1 carries originClass independently of frozen/pending status or absent derivation. F6 recursively projects all nested references, distinguishes semantic from integrity identity, and covers every genuine state mutation. Prepare/approval/fence bookkeeping cannot stale the first valid R-keep retirement; role/epoch changes occur only after the current artifact comparison and stale subsequent uses.

D1 gives explicit M-A initiation into an empty separate destination, authenticated anchor/slot/key-usage ordering and exact restart/cancellation classification. M-B is unavailable. F8 counts every encryption permission before AES use, including abort/unknown/GC/restart; no resetting lifetime count or silent rekey. D2 R-keep leaves all reachable private material locally valid and disables fresh signing. Individual local-key removal and terminal content compaction are unavailable pending complete designs. D3 H-projection/H-hidden have explicit reconstructable-content disclosure and older-backup limits. No optional refusal waives required complete portable offline recovery or valid quiescent retirement.

A7 closes every enabled workflow through persistent task/subject/replay/status/cancel/expiry/restart. A4 has distinct mnemonic-display, recovery-delivery and continuation-accept summaries; a signature prompt grants none of the others. External launch uses a durable consumed one-attempt effect and never auto-retries. F3 chooses the first feasible padded bucket, not an impossible nearest length; F5 jointly budgets all original records/coverage/audit/source wrappers, padding, encryption and materialization, with admission credits before obligations. D6 freezes/drains accepted work, recomputes managed scope/current coverage and authenticates the exact stable artifact before recording irreversible L evidence; later races cannot change the frozen scope.

All G5 owner choices are PENDING. Concrete unavailable alternatives and missing platform/integration evidence are enumerated G7. Expected synthetic scalar/encoding/padding values in this package are proposals awaiting independent producer/consumer confirmation; arithmetic document checks do not provide that acceptance. No behavioral tests or crypto implementation in this package are executable.
