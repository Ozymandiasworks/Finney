# RC-03 Wallet Custody Implementation Contract v3

## 1. Status, source binding, and review package

- Version: `3.0.0-draft`
- Status: proposed design only; not implementation-ready
- Application baseline: `b61c888bbbdae632541c41c7f829a9ed13ad77b2`
- Application provenance branch: `gate1/remediation`
- Builder checkout documentation commit: `455b57a48824bbe2d9341078a9e9be9aed28f4d4`
- Gate: Gate 1 blocked; `PRE-001` remains unsatisfied
- Supersedes: v2 only as the proposed technical subject. V1 and v2 remain preserved.

This contract preserves existing XEC addresses, BIP39 behavior, ordinary `m/44'/899'/0'/0/i` and change `m/44'/899'/0'/1/i` derivation, special `44/145/i/j` derivation, existing transaction/message wire formats, and disabled Signal state. It does not authorize a new cryptographic construction, a derivation change, an unattended spending allowance, a generic sign/derive/export interface, plaintext fallback, automatic error-to-empty recovery, whole-store rollback detection, or forensic-erasure claims.

The normative details form one review package: this contract; the neutral technical specification; six neutral annexes; the v3 decision record; the v3 acceptance matrix; and the v3 crosswalk. Annex references are normative within this proposed package. A pending owner decision blocks its dependent transition. A proposal is not a selected policy.

## 2. Authority target and common invariants

Wallet authority, root/mnemonic material, identity material, output scalar fallbacks, signing, recovery, migration, backup, retirement, and destruction belong to Electron main. Ordinary renderer state and general stores contain only public projections, opaque handles, and typed outcomes. Every special-output scalar, including spent fallback material, is treated as potentially identity-equivalent until dedicated compatibility/incident review defines narrower exposure boundaries.

The ordinary packaged renderer has no Node, native-storage, filesystem, child-process, raw IPC, generic signing, raw private-key, arbitrary derivation, or raw export authority. It receives no root, mnemonic, private scalar, recovery credential, protected plaintext, or secret-bearing error/log value. Main owns request admission and derives sender/frame/origin/window epoch from platform events rather than payload fields.

Only main’s authenticated authority records may authorize key use. Remote absence, content deletion, indexer observations, a cache filter, a renderer request, and a general-store projection never retire recovery authority. Protected authority is durably committed before public projection. Before the last independently recoverable source is retired, a current verified portable recovery artifact must cover the required multi-generation inventory. All dependent cleanup is blocked until the owner decisions and actual backend guarantees required by this package are resolved.

## 3. Concrete interfaces and protocol limits

The proposed request/error schemas and limits are in [Annex A](../REVIEW_INPUTS/RC03_v3_ANNEXES/A_IPC_SCHEMAS_AND_LIMITS.md). They define profile versus wallet request forms, fixed purpose methods, errors, exact byte/count/depth/queue/deadline limits, caller derivation, opaque-handle rules, and trusted-ceremony alternatives.

The following proposed limits are technical defaults pending review, not owner selections: protocol major version `1`; request body `262144` bytes; public result `1048576` bytes; message body `65536` UTF-8 bytes; a wallet record `1048576` bytes; an import/backup container `536870912` bytes; inventory `100000` output records; operation bundle `32` effects; transaction bundle `16` transactions; pending operation requests `256`; approval prompts `1` foreground plus `8` queued; ordinary IPC deadline `15` seconds; profile probe deadline `30` seconds; approved effect-dispatch deadline `60` seconds excluding network reconciliation; and a maximum parsed nesting depth of `32`.

Every request is rejected before privileged or expensive work when it violates a schema, method/state admission rule, platform-derived caller fact, handle binding, byte/count/depth limit, deadline, queue limit, version, or expected revision. Typed errors are stable public categories; implementation diagnostics remain main-only and redact secrets.

## 4. R1 — Observation, admission, recovery, and explicit bootstrap

The exhaustive startup reducer is in [Annex B](../REVIEW_INPUTS/RC03_v3_ANNEXES/B_LIFECYCLE_REVISIONS_AND_COMMITS.md). Main first performs bounded read-only probes; it must not instantiate a legacy constructor that writes metadata. Each probe preserves its diagnostic evidence as `absent`, `present`, `unavailable`, `corrupt`, `unsupported`, or `conflicting`.

Validated destruction state, unsupported schema, corrupt authority, unavailable authority, conflict, normal-commit recovery, migration, cleanup-pending, ready, legacy bootstrap, and verified absence have a defined precedence and state-specific admissions. A marker is not trusted merely because it exists: its schema, binding, and referenced journal/manifest must first validate. `verified-absence` requires successful absence from every mapped authority, journal, candidate, catalogue, marker, and projection backend. Failure is never absence.

Observation never writes. Explicit recovery writes use only the narrow state/purpose rows in Annex B, carry a recovery handle, have a 60-second deadline, and journal their own result. Explicit new-profile creation after whole-profile destruction requires a user-selected destructive-completion acknowledgment and a new profile identifier; it cannot arise from missing markers. Owner decision OD-03 controls the user-facing ceremony and retained historical state.

## 5. R3 — Revision domains, authority commits, and commitments

The distinct revision domains, CAS rules, normal-commit journal, acknowledgement model, and projection/publication order are in Annex B. A lifecycle epoch changes only on activation, retirement, destruction scope transition, or explicit profile replacement. Manifest commit revision increments on every authoritative catalogue/manifest commit. Member revision increments only when that member changes. Immutable operation version never changes; progress uses effect revisions. Thus operation progress does not invalidate its own immutable approval merely because a receipt or projection revision changes.

Every authority mutation has a commit ID, expected lifecycle epoch, expected manifest revision, expected member revisions, complete durable write set, barrier result, and restart resolution. `success`, `known-failure`, and `unknown-outcome` acknowledgements are distinct. Unknown acknowledgement prevents external disclosure/cleanup/release until `resolve-commit` reads durable commit evidence from the selected backend. Projection publication follows an acknowledged authority commit only.

Annex F specifies a pending cryptography-reviewed candidate encoding profile for record, inventory, operation-intent, and backup commitments. It is not selected. A hash alone is not an authenticator; expected commitments are protected as manifest-bound authority records. Complete valid-store rollback remains explicitly outside this local mechanism without a separate freshness anchor.

## 6. R7 — Recovery descriptors and scalar custody

The exact proposed descriptor grammar and compatibility requirements are in [Annex E](../REVIEW_INPUTS/RC03_v3_ANNEXES/E_DESCRIPTORS_AND_COMPATIBILITY.md). Canonical inventory sort order never replaces semantic encounter ordinals. Ordinary/change descriptors preserve account/change/index/discovery context. Stamp descriptors preserve payload digest and original transaction/listed-output encounter ordinals. Stealth descriptors preserve validated ephemeral context and original ordinals. Historical/current outpoint aliases are observations, not derivation replacements.

Descriptor validation binds wallet, generation, network, derivation variant, expected script/address, actual outpoint, amount class, and public identity context. A usable scalar fallback must be in canonical 32-byte range and reproduce the expected script before acceptance. A record with neither valid descriptor nor validated scalar is quarantined with raw source evidence intact; it blocks complete-inventory, backup, cleanup, retirement, and destruction-completion claims.

Compatibility vectors must cover current paths, original encounter order, BIP39 no-extra-passphrase behavior, private/public derivation agreement, exceptional scalar/point branches, scalar exposure boundaries, and historical aliases. The proposed design makes no claim of master-seed recovery from a leaked scalar and does not change derivation behavior.

## 7. R8 — Trusted ceremony, secret entry, and identity operations

Annex A defines every proposed wallet, identity, profile, registry, relay, and recovery method with input/result/error schemas and no generic escape method. Main constructs or validates canonical signed bytes according to the preserved wire format; a renderer cannot provide an arbitrary key, path, byte string, transaction, message, recipient, or signature request.

OD-01 has two complete pending alternatives: a minimal isolated packaged trusted surface, or an OS-mediated trusted ceremony with equivalent binding evidence. Both must show main-derived immutable summary data, focus/window epoch checking, foreground prompt serialization, cancellation, one-use expiry, and recheck at effect dispatch. The ordinary renderer is not a fallback. Until OD-01 is recorded, secret-bearing creation/import/export/credential and irreversible approval methods return `WALLET_ERR_POLICY_PENDING`.

The operation inventory includes setup/import, address/output views, receipt/reconciliation, transaction preparation/confirmation/retry, message construction/delivery, profile and registry publication, forum/offerings effects carrying spendable artifacts, backup/import validation, history deletion, retirement, and destruction. Each route has a method-specific main operation, no raw secret result, and an explicit unsupported result where no safe semantic contract exists.

## 8. R4 and R5 — Authorization, final artifacts, and external effects

[Annex C](../REVIEW_INPUTS/RC03_v3_ANNEXES/C_OPERATION_AND_EFFECT_TABLES.md) distinguishes an unsigned intent/template from a final signed artifact. A trusted approval binds immutable intent summary, lifecycle epoch, manifest snapshot, selected input reservation, destination, cost, and effect plan. The atomic approval-consumption/reservation commit records only an approved unsigned plan. Signing creates final bytes; final bytes, IDs, deliverable envelope/message bytes, and per-effect intents must be durably committed before the first external disclosure capable of enabling spending.

An in-memory signature that is not durably persisted never authorizes a restart continuation. After a final artifact commit, an explicitly selected owner policy is required for whether a durable approved effect set may continue after reload; until OD-01 and the R4 policy subdecision are recorded, restart requests fresh trusted approval and performs no effect. This is not unattended new spending.

Every preflight, transaction-bundle broadcast, relay delivery, registry/profile/forum transmission of spendable artifacts, and externally meaningful status observation is an effect. Annex C defines per-effect dependency, evidence strength, partial-bundle aggregate status, lost acknowledgement, reorg/inconsistent callback, replay retention, and indefinite-uncertainty policy alternatives. Unknown effect outcomes keep the wallet-wide outpoint reservation and cannot create a replacement payment or release the input.

## 9. R6 — Candidate, retained, and overlapping-generation ownership

The generation catalogue and access matrix are in Annex B. Candidate, active, retained, retiring, destroyed-generation history, and whole-profile destruction are separate states. Activation commits exactly one active generation but does not delete prior authority. A retained generation can be inspected, included in backup, and settle a named already-authorized immutable operation through a scoped main capability. Whether it monitors new receipts, may be reactivated, or only supports explicit recovery is an OD-06 subdecision; affected routes are blocked pending choice.

Reservations use canonical `{network, txid[32], vout:uint32}` across every candidate, active, and retained generation. A root alias set identifies repeated imports of the same root. One canonical outpoint may have one reservation owner across the whole profile. Conflicting imports/aliases are preserved and return `WALLET_ERR_OUTPOINT_OWNERSHIP_CONFLICT`; they do not silently duplicate spending authority.

## 10. R2 — Legacy acquisition, migration, and cleanup

[Annex D](../REVIEW_INPUTS/RC03_v3_ANNEXES/D_MIGRATION_AND_DESTRUCTION_RESTART_TABLES.md) defines the preliminary inventory, final drain, frozen inventory, authority commit, projection, deletion intent, deletion, cursor, completion, cancellation, and restart rows. A final raw snapshot becomes authoritative only after the selected cross-process writer-exclusion evidence and all cooperative drain acknowledgements are durable. A preliminary inventory is diagnostic only.

Before protected authority commit, cancellation preserves source authority and removes only newly-created protected candidate data under a journal. After protected commit, cancellation cannot restore legacy authority or erase the protected copy; it enters a classified recovery state. Every planned legacy deletion has a protected deletion-intent/accounting record acknowledged before deletion. The legacy cursor advances only after the deletion acknowledgement. A durable deletion with a lost cursor acknowledgement is reconciled as expected deletion; any other source change preserves both stores and blocks cleanup.

OD-04 and OD-05 select the Windows package/provider/backend, exact legacy mapping, cross-process exclusion, old-writer/isolation/downgrade policy, and durability model. Without them, acquisition, authority commit, activation, network effect dispatch, cleanup, and retirement transitions named in Annex D are blocked rather than approximated.

## 11. R9 — Portable recovery container and coverage

Annex F provides a complete **proposed candidate** portable-recovery format, parser, KDF boundaries, snapshot/coverage proof, and restore sequence for review. No algorithm, library, parameter, or UX is selected by this document. The candidate separates password bytes from BIP39 mnemonic input, uses cryptographic RNG requirements, binds all interpretation-affecting headers, parses bounded syntax before KDF/allocation, authenticates before trusting semantic fields, and never silently reduces work factors.

Export obtains a consistent multi-generation snapshot token under the wallet writer. The token binds lifecycle epoch, manifest revision, catalogue member revisions, inventory commitment, pending operations, replay/tombstone state, and coverage digest. The actual finalized artifact bytes receive an artifact digest and durable completion record. An independent restore verification recomputes coverage from the decrypted artifact and validates it against the frozen authoritative inventory; a catalogue assertion alone is insufficient. Any recovery-relevant mutation stales the proof.

Restore is into an inactive candidate only. Restored approvals are historical records and cannot become fresh authority. Reservations, uncertain operations, replay records, tombstones, and retained generations are restored according to the owner-selected policy; if the policy is unresolved, the artifact cannot qualify a source for retirement. Offline fresh-profile restoration without original OS wrapping or relay history is mandatory before sole-source retirement.

## 12. R10 — Content tombstones and destruction scope

Annex D separates content deletion, per-generation historical retirement, whole-profile destruction, and explicit post-destruction new-profile creation. Content deletion durably extracts required descriptor/scalar/replay data, commits a tombstone, then removes content. It never signs, broadcasts, forwards outputs, or retires recovery material. Late delivery, restore, and replay are fenced by tombstone generation/revision and the owner-selected retention policy.

Whole-profile destruction has a durable scope inventory, cancellation boundary, terminal marker, managed-store/candidate/cache/temp-data accounting, and explicit excluded external-copy disclosure. It cannot report completion with an inaccessible covered store. A terminal profile marker does not mean verified absence; a later new profile is a separately approved transition that creates a new profile ID and preserves the historical destruction record as required by OD-03. Only logical deletion is claimed.

## 13. R11 — Windows deployment, transport, and durability claims

The proposed support matrix and toolchain policy are in [Annex G](../REVIEW_INPUTS/RC03_v3_ANNEXES/G_DEPLOYMENT_TOOLCHAIN_AND_CRYPTOGRAPHY.md). The only proposed initial target is a pinned packaged Windows/Electron/provider/backend/origin/partition combination to be selected by OD-04. Other platform/provider combinations are unavailable/unsupported, never plaintext fallback. The selected backend must expose the documented acknowledgement and commit-ID resolution behavior required by Annex B before its transition can claim authority commitment, projection, effect dispatch, cleanup, or retirement.

Each enabled transport has its own owner, proxy/Tor configuration source, health evidence, fail-closed behavior, and no-direct-fallback rule. Moving a network operation to main never inherits renderer session behavior by assumption. No new main transport is enabled by this design document.

## 14. R12 — Canonical toolchain plan

The proposed implementation evidence policy is Node `24.19.0` and Yarn `1.22.22`, matching package/Volta/runtime-check intent. `.nvmrc` and `.node-version` currently naming `16.20.2` are not changed by this assignment. Selector alignment is a later separately authorized tooling task. Until that task and clean-shell validation are complete, implementation acceptance evidence must explicitly invoke the accepted versions and report any selector mismatch.

## 15. Pending decisions, review requirements, and stop condition

OD-01 through OD-06 and expanded subdecisions remain pending in the v3 owner decision record. Recommendations, candidate algorithms, report examples, and mathematical evidence are not approvals or selections. The affected transitions are visibly blocked in every annex table.

Required independent reviews of this full v3 package are Architecture, Security, and Cryptography. They must state the exact contract, neutral specification, annex, decision, matrix, and manifest hashes assessed and declare coverage. Dedicated specialist review remains necessary for derivation/scalar exposure, descriptor compatibility, commitment encoding/authentication, portable container/KDF policy, and any key-use change. No production implementation begins until later adjudication and required owner decisions.
