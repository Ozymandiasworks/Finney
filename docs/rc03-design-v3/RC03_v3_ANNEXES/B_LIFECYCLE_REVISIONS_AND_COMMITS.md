# Annex B — Lifecycle, revisions, commits, and generation access

Status: normative proposed design, version `3.0.0-draft`.

## B.1 Probe evidence and startup reducer

`inspectProfile()` performs bounded read-only probes. It must use no constructor/open mode that initializes metadata. Each evidence source is recorded independently: protected manifest/catalogue, migration journal, normal-operation journal, destruction journal/terminal record, legacy root namespace, raw legacy output namespaces, descriptor-supporting message namespace, candidate records, public projection, and supported mapping/provider state.

| Priority | State | Required validated evidence | Admission | Recovery write | Deadline/result |
| ---: | --- | --- | --- | --- | --- |
| 1 | `profile-deleting` | valid whole-profile destruction journal before terminal boundary | inspect, permitted cancellation only before boundary | named destruction resume/cancel journal | 30s probe; typed state |
| 2 | `profile-destroyed` | valid terminal profile record plus scope reconciliation | inspect, explicit new-profile preparation only | OD-03-selected new-profile journal | 30s; no implicit create |
| 3 | `unsupported` | recognized record with unsupported schema/suite/backend mapping | inspect/export-compatible evidence only | none | 30s; preserve bytes |
| 4 | `corrupt` | readable record fails syntax/binding/authenticated expected relation | inspect, explicit supported recovery only | recovery journal only | 30s; no normal write |
| 5 | `unavailable` | provider/account/I/O/permission/timeout failure | inspect/retry only | none | 30s; diagnostics retained |
| 6 | `conflicting` | incompatible authorities, aliases, source change, or old-writer evidence | inspect/explicit supported recovery | conflict-resolution journal only | 30s; cleanup blocked |
| 7 | `normal-commit-recovery` | valid incomplete normal authority commit journal | inspect, resolve-commit | journal resolution only | 30s; no effects |
| 8 | `migrating` | valid incomplete migration before protected authority commit | inspect, resume/cancel precommit | migration journal only | 30s; no setup/signing |
| 9 | `cleanup-pending` | verified protected authority and incomplete accounted cleanup | view, scoped settlement, resume cleanup when policy ready | cleanup journal | 30s; no retirement |
| 10 | `ready` | one verified active generation, no higher state | declared active methods | declared authority commits | 30s; normal operation |
| 11 | `legacy-bootstrap` | complete preliminary legacy evidence, no manifest/journal | inspect, begin migration or recovery export when policy allows | migration-preparation journal | 30s; no create/signing |
| 12 | `verified-absence` | all mapped sources opened successfully and absent | prepare explicit create/import | candidate preparation only | 30s; no automatic create |

When several rows have evidence, higher priority controls admission but every lower observation remains in diagnostics. A malformed high-priority marker is `corrupt`, not `profile-destroyed`. A `profile-destroyed` marker and unavailable legacy source results in `unavailable` unless the selected destruction scope explicitly excludes that source and the scope record validates. No probe may mutate a source.

## B.2 Revisions and immutable identity

| Domain | Type | Changes when | Does not change when | Primary use |
| --- | --- | --- | --- | --- |
| profile ID | 128-bit random | only explicit new-profile creation | migration, candidate activation | profile separation |
| lifecycle epoch | uint64 | activation, retirement scope change, whole-profile destruction/new-profile transition | receipt, projection, effect progress | invalidates caller/candidate authority |
| manifest revision | uint64 | each committed catalogue/manifest authority change | public projection rebuild | current membership/CAS root |
| member revision | uint64 | individual record mutation | unrelated member/manifest commit | member CAS/binding |
| immutable operation version | uint32 | never after creation | effect state/progress | artifact identity |
| effect revision | uint64 | one effect progress transition | sibling effect transition | effect idempotence |

An approval binds profile ID, wallet ID, generation, lifecycle epoch, immutable operation version, immutable intent commitment, reservation set, artifact plan, caller facts, and expiry. It does **not** bind a global manifest revision in a way that unrelated receipt/projection progress invalidates itself. A requested operation reads the manifest revision and exact member revisions required for safety. A change to selected inputs, recipient, amount, fee, change, network, candidate, operation plan, lifecycle epoch, or approval caller facts invalidates approval. An unrelated new output may advance manifest revision but does not invalidate an approval whose selected members and lifecycle epoch remain valid.

## B.3 Commit envelope and acknowledgement

```ts
type AuthorityCommitV1 = {
  commitId: Hex16
  profileId: Hex16
  walletId: Hex16
  lifecycleEpoch: DecimalUInt64
  expectedManifestRevision: DecimalUInt64
  expectedMembers: Array<{ logicalKey: string; revision: DecimalUInt64 }>
  writeSet: Array<{ logicalKey: string; recordType: string; nextRevision: DecimalUInt64; valueDigest: Hex32 }>
  reason: 'receive' | 'reserve' | 'approval-consume' | 'artifact-persist' |
    'effect-progress' | 'activation' | 'migration' | 'backup' | 'tombstone' |
    'destruction' | 'retirement'
  journalPhase: 'prepared' | 'backend-submitted' | 'acknowledged' | 'resolved' | 'conflicting'
  createdAtMs: DecimalUInt64
}
```

The write set is immutable after `prepared`. A backend transaction is used only where the accepted backend explicitly supplies the required atomicity; otherwise the protected normal-operation journal is the authority transition. `prepared` is durable before backend submission. `backend-submitted` records submission intent. `acknowledged` records a known successful barrier. A local timeout/disconnect after submission is `unknown-outcome`, not failure. `resolve-commit(commitId)` reads authoritative backend/journal evidence and returns `committed`, `not-committed`, or `unknown`; unknown blocks projection, disclosure, cleanup, and reservation release.

| Acknowledgement | Public projection | External effect | Cleanup/retirement | Restart action |
| --- | --- | --- | --- | --- |
| known failure | none | none | none | preserve prior authority; mark failed journal |
| unknown outcome | none | none | none | resolve commit; conflict if evidence disagrees |
| known success, logical only | no destructive claim | no irreversible effect | none | reopen/verify before next transition |
| selected durable barrier success | projection allowed | only if effect-specific artifact rules satisfied | only if migration/backup rules satisfied | resolve/reopen per journal |

The selected Windows backend and durability mapping are OD-04 pending. Until selected, only non-destructive candidate/probe records may use the weakest documented acknowledgement; authority cutover, cleanup, retirement, and effect dispatch are blocked.

## B.4 Generation catalogue and access matrix

```ts
type GenerationCatalogueEntryV1 = {
  generation: number
  state: 'candidate' | 'active' | 'retained' | 'retiring' | 'destroyed-history'
  rootRecordRef: string
  inventoryCommitment: Hex32
  backupCoverageRef?: string
  rootAliasSet: Hex32[]
  unresolvedOperationIds: Hex16[]
  lifecycleEpoch: DecimalUInt64
  createdManifestRevision: DecimalUInt64
}
```

| Generation state | Public view | Receive observation | Spend/new operation | Named old-operation settlement | Backup | Reactivate/monitor |
| --- | --- | --- | --- | --- | --- |
| candidate | candidate summary only | no | no | no | validation-only | no |
| active | yes | yes | yes with approval | yes | yes | n/a |
| retained | yes, marked retained | policy-pending observation only | no | yes, scoped operation capability | yes | OD-06 pending |
| retiring | limited status | no new observation | no | only resolution required for retirement | validation-only | no |
| destroyed-history | historical nonsecret status | no | no | no | no | no |

Reservations use profile-wide canonical network/outpoint key. Candidate or retained entries cannot reserve an outpoint reserved by any other entry. Importing the same root produces an alias relation; it does not create duplicate input authority. A receipt for retained identity is handled only by the selected OD-06 policy; otherwise it is preserved as an unadmitted observation requiring explicit recovery action.
