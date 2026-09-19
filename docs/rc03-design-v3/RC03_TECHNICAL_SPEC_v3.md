# RC-03 technical specification v3

## Subject binding

- Proposed design version: `3.0.0-draft`
- Application subject: `F:/Finney/libsignal-spike-20260913`
- Exact application baseline: `b61c888bbbdae632541c41c7f829a9ed13ad77b2`
- Source provenance branch: `gate1/remediation`
- Review package: this specification and Annexes A–G under `RC03_v3_ANNEXES`
- Status: technical review subject only; production implementation is not authorized

This package defines a proposed Windows-first wallet-authority migration. It preserves existing XEC addresses, transaction/message wire behavior, ordinary/change derivation under coin type 899, special Stamp/stealth derivation under 145, and existing BIP39 behavior. Signal remains disabled. It does not select a cryptographic library or format, authorize unattended spending, change derivation, claim complete-store rollback detection, or claim forensic erasure.

## 1. Authority and caller model

Main owns wallet roots, mnemonics, identity material, output scalar fallbacks, signing, recovery, migration, backup, retirement, destruction, and message/profile/registry identity operations. Ordinary renderer receives only public projections, opaque handles, and typed public results. It has no native/node/filesystem/raw-IPC authority and no generic key, derive, sign, export, storage, or transport route.

Main derives caller identity from platform event facts. It requires the current primary top-level packaged Finney frame, exact selected packaged origin, matching window/navigation epoch, live caller, bounded request, declared method, and lifecycle admission. Payload sender/frame/origin claims are ignored. Main repeats the caller and handle checks before approval, signing, and each external effect.

Annex A defines profile/wallet requests, methods, stable errors, numeric limits, caller facts, opaque handles, trusted ceremony alternatives, and identity-operation schemas.

## 2. Pending trusted ceremony policy

All secret-bearing or irreversible operations require an independently trusted one-use approval bound to main-generated immutable details: operation purpose, profile/wallet/generation, lifecycle epoch, operation/candidate/artifact, destination, amount/fee/change summary where relevant, destructive scope, caller/window epoch, expiry, and nonce. Renderer confirmation is not approval.

Two pending alternatives exist: a minimal isolated packaged trusted surface, or an OS-mediated trusted ceremony with equivalent binding evidence. Both require main-owned summary display, foreground serialization, explicit cancellation, 120-second expiry, lifecycle invalidation, and effect-time recheck. The owner must select surface/channel, secret entry/display, and continuation policy. Until then privileged create/import/export/credential/activation/signing/destruction flows are blocked.

## 3. Lifecycle and authoritative mutation

Main runs bounded read-only profile probes before normal work. A probe result is absent, present, unavailable, corrupt, unsupported, or conflicting; failure is never absence. Validated evidence reduces to one controlling state: profile-deleting, profile-destroyed, unsupported, corrupt, unavailable, conflicting, normal-commit-recovery, migrating, cleanup-pending, ready, legacy-bootstrap, or verified-absence. Higher-priority evidence controls admission while lower evidence remains diagnostic. Explicit new-profile creation after destruction is separate from absence.

The design separates lifecycle epoch, manifest commit revision, member revision, immutable operation version, and effect revision. Main uses expected epochs/revisions and an authority commit record with immutable write set, commit ID, journal phase, and known-success/known-failure/unknown-outcome acknowledgement. An unknown outcome is resolved from backend evidence before projection, external effect, cleanup, or reservation release. Main publishes public projection only after acknowledged authority commit.

Annex B defines state admissions, recovery writes, deadlines, revision domains, commit schema, acknowledgement consequences, and generation access.

## 4. Legacy discovery, inventory, and recovery descriptors

The supported Windows mapping must bind package identity, user-data path, origin/partition, legacy namespaces, protected backend, and schema versions. Main uses a bounded version-specific adapter to read raw mapped records. A preliminary inventory is diagnostic only. A final inventory becomes authoritative only after the selected cross-process writer exclusion and all cooperative writer drains are acknowledged. Unsupported mapping, wrong profile/partition, unavailable backend, old writer, or late source write blocks migration.

Inventory includes root/mnemonic material if present; ordinary/change/Stamp/stealth/frozen/pending/orphaned/spent-retained/recovery-only/descriptor-incomplete outputs; pending operations; retained generations; and descriptor-supporting message metadata. Remote/indexer absence changes observation only and cannot delete recovery authority.

Descriptors preserve semantic encounter ordinals separately from canonical inventory order. Ordinary/change records preserve path and discovery data. Stamp records preserve digest and transaction/listed-output encounter ordinals. Stealth records preserve validated ephemeral context and ordinals. Historical/current outpoint aliases are retained. A scalar fallback is accepted only after range/script validation. Records without valid descriptor or scalar are quarantined and block complete coverage/retirement claims. Special scalars are treated as potentially identity-equivalent secrets.

Annex D defines acquisition/migration boundaries. Annex E defines descriptor grammar, scalar validation, compatibility obligations, and related-key claim boundaries.

## 5. Operations, final artifacts, and effects

An operation persists a canonical immutable intent, selected inputs/reservations, approval state, exact final signed transaction bytes/IDs, exact deliverable message bytes, effect plan, per-effect state/evidence, replay binding, and aggregate status. It distinguishes unsigned template from final signed artifacts. Reservation plus consumed approval is one authority commit. Final bytes and effect intents are durably committed before the first disclosure that can enable spending or delivery.

Effects include preflight, each transaction-bundle broadcast, relay delivery, registry/profile/forum publication containing spendable artifacts, and local projection. Unknown network outcomes retain reservations, prohibit replacement payment/rebuild/release, and require typed reconciliation. A retained generation may settle only a named immutable existing operation using scoped main authority. Canonical network/outpoint reservation spans candidate, active, and retained generations.

Annex C defines operation/effect schemas, transition boundaries, effect evidence, replay rules, aggregate states, and transport ownership/failure contract.

## 6. Migration, backup, deletion, and destruction

Migration phases distinguish preliminary inventory, writer drain, frozen inventory, protected copy/verification/commit, projection, cleanup pending, per-record deletion intent/acknowledgement/cursor, conflict, and completion. Before protected commit, cancellation preserves source authority. After it, cancellation pauses/reconciles protected authority; it never restores legacy authority automatically. A deletion intent is durable before source deletion, and a lost cursor acknowledgement is reconciled against explicit deletion accounting. Unexpected source changes preserve data and stop cleanup.

Portable export uses a frozen multi-generation snapshot token with profile/lifecycle/manifest/catalogue/member/operation/reservation/tombstone coverage. Exact final artifact bytes obtain a digest and durable completion record. Independent restore recomputes coverage against the frozen authority state; a catalogue assertion or prior restore does not suffice. Restore creates an inactive candidate, never fresh approval, signing, broadcast, or reservation release. Any coverage-relevant mutation stales the artifact. Offline fresh-profile restoration without original OS wrapping or relay history is required before retiring a final recovery source.

Content deletion commits retained recovery/replay data and a tombstone before content removal and has no signing/broadcast route. Whole-profile destruction separately journals managed/excluded scope, cancellation boundary, irreversible marker, removal progress, terminal state, and explicit later new-profile creation. Only logical deletion of managed stores may be claimed.

Annex D defines restart tables. Annex F supplies a proposed, unselected portable container/KDF/commitment candidate and exact review questions.

## 7. Deployment, transport, and toolchain

The only proposed initial acceptance target is an owner-selected pinned packaged Windows/Electron/provider/backend/origin/partition configuration. Other platforms are unavailable/unsupported with no plaintext fallback. The backend acknowledgement model controls permitted projection, effect, cleanup, and retirement claims. Cross-process/old-version writer isolation is a prerequisite to acquisition/commit/cleanup.

Every enabled transport declares owner, adapter version, proxy/Tor configuration source, verification, DNS behavior, retry boundary, and direct-fallback prohibition. A main process path never assumes renderer session policy. No network path is enabled or changed here.

The proposed acceptance toolchain is Node `24.19.0` and Yarn `1.22.22`. Existing Node selector files remain unchanged by this package. Later selector alignment requires separate authorization and clean-shell verification.

Annex G defines support, durability, transport, old-writer, toolchain, and specialist-review assumptions.

## 8. Pending owner choices and review scope

Pending choices: trusted ceremony/secret channel/continuation; portable artifact/device/credential/restore standard; retention/pending delivery/remote deletion/cancellation; Windows provider/backend/durability; old-writer/profile/update/downgrade/residual-copy policy; whole-store rollback/logical-deletion and scalar-compromise response; retained identity monitoring/reactivation/overlapping roots/indefinite uncertainty; and canonical toolchain.

No dependent transition is permitted before its selected owner decision and required specialist review. Required independent reviews are Architecture, Security, and Cryptography. Reviewers must identify exact package files/hashes and state coverage. The cryptographic scope includes candidate portable container/KDF, canonical commitments/authenticator placement, descriptor compatibility, derivation/scalar exposure, and any changed key-use semantics.

## 9. Technical coverage index

| Full contract section | Neutral technical section | Exact annex |
| --- | --- | --- |
| §2 authority target | §1 | Annex A |
| §3 interfaces/limits | §1 | Annex A |
| §4 R1 startup | §3 | Annex B |
| §5 R3 commits | §3 | Annex B, F |
| §6 R7 descriptors | §4 | Annex E |
| §7 R8 ceremony/API | §1–2 | Annex A |
| §8 R4/R5 operations | §5 | Annex C |
| §9 R6 generations | §3, §5 | Annex B, C |
| §10 R2 migration | §4, §6 | Annex D |
| §11 R9 backup | §6 | Annex F |
| §12 R10 deletion | §6 | Annex D |
| §13 R11 deployment | §7 | Annex G |
| §14 R12 toolchain | §7 | Annex G |
| §15 decisions/review stop | §8 | Annex A–G |
