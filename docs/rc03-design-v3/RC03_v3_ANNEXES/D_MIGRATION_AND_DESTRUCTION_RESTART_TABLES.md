# Annex D — Migration, cleanup, tombstone, and destruction restart tables

Status: normative proposed design, version `3.0.0-draft`.

## D.1 Migration records

```ts
type MigrationJournalV3 = {
  migrationId: Hex16
  profileId: Hex16
  sourceMappingId: string
  sourceSchemaVersion: number
  preliminaryInventoryDigest?: Hex32
  frozenInventory: Array<{ sourceKey: string; valueDigest: Hex32; expectedDeletion: boolean }>
  frozenInventoryCommitment?: Hex32
  sourceFenceEvidence?: string
  targetGeneration: number
  targetInventoryCommitment?: Hex32
  phase: MigrationPhaseV1
  protectedCommitId?: Hex16
  projectionCommitId?: Hex16
  deletionIntents: Array<{ sourceKey: string; intentCommitId: Hex16; deletionAck?: string }>
  cleanupCursor?: string
  conflictEvidence?: string
}
```

`preliminaryInventoryDigest` is diagnostic and cannot authorize copying or deletion. `frozenInventory` becomes authoritative only after accepted OD-04/OD-05 mapping/exclusion evidence and final cooperative drain acknowledgements. Every source key has an explicit deletion intent before it can be removed.

## D.2 Migration transition and restart table

| Prior evidence/phase | Authority/caller | Approval | Expected revisions/fence | Durable writes / acknowledgement | Projection / disclosure | Failure/cancellation | Restart action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| legacy bootstrap | main migration service | explicit migration ceremony, OD-01 | profile mapping accepted; no journal | preliminary journal | none | cancel removes preliminary journal only | inspect again |
| preliminary inventory | main | none | all mapped stores readable | preliminary digest | none | unsupported/unavailable preserves source | retry probe only |
| drain requested | main + writers | none | writer lease and old-writer OD-05 evidence | drain request + acknowledgements | none | missing/late writer blocks | preserve diagnostics; no frozen snapshot |
| final drain | main | none | accepted mapping, drain complete | frozen inventory + source fence evidence + journal barrier | none | source change/ack loss -> conflict | re-open source; preserve both |
| protected copying | main | none | frozen inventory | bounded protected records + copy progress journal | none | cancel before protected commit removes target candidate only | verify each copied record |
| protected verified | main | none | target records and descriptor/scalar validation | target commitment + verification record | none | mismatch -> conflict | preserve source/target; no cleanup |
| protected committed | main | no new approval | protected commit ID resolved known success | manifest/catalogue switch + committed journal barrier | protected public projection may follow | unknown ACK -> no projection | resolve commit, then verify/reopen |
| projection published | main | none | committed protected authority | projection commit | public view only | projection failure does not affect authority | rebuild projection from authority |
| cleanup pending | main cleanup service | OD-02/04/05 prerequisite satisfied | frozen inventory and backup coverage current | deletion intent for next chunk before delete | none | no cleanup if policy/backend pending | retain protected + source |
| delete submitted | main | none | deletion intent acknowledged | source deletion then deletion acknowledgement | none | unknown deletion ACK -> no cursor | reconcile exact source key |
| cursor advance | main | none | source deletion acknowledged | cursor/journal commit | none | cursor ACK loss leaves expected deletion | reconcile against deletion intent |
| cleanup complete | main | retirement policy as required | every expected key absent, no unexplained source record | terminal migration record | public cleanup status | unexpected addition/modification -> conflict | preserve authority; cleanup stops |

`protected committed` is the boundary after which source authority is not reactivated automatically. Before it, precommit cancellation preserves source and removes only target candidate data under journal control. After it, cancellation means pause/recovery, not rollback of protected authority. No migration path deletes the final complete source without qualifying portable backup coverage.

## D.3 Tombstone ordering

| Step | Durable prerequisite | Write set | Allowed next action | Failure/restart |
| --- | --- | --- | --- | --- |
| retain recovery/replay | current descriptor/scalar/replay metadata identified | protected retention record | create tombstone | failure leaves content unchanged |
| tombstone commit | retention record acknowledged | tombstone + message membership update | remove content | unknown ACK blocks removal |
| content removal | tombstone commit resolved | content-store removal cursor | project deletion | failure/restart retains tombstone and content status |
| late receipt/replay | tombstone lookup | no authority mutation unless accepted observation schema permits | reject/suppress/reconcile by OD-03 policy | never signs/broadcasts |

Content deletion has no operation/effect route that can forward outputs, sign, broadcast, reserve, or retire a key. Remote deletion scope and pending delivery are OD-03 pending; corresponding remote actions are blocked until selected.

## D.4 Whole-profile destruction

```ts
type DestructionJournalV1 = {
  destructionId: Hex16
  profileId: Hex16
  scope: 'whole-profile'
  managedStores: string[]
  excludedExternalCopies: string[]
  phase: 'prepared' | 'approved' | 'irreversible' | 'removing' | 'terminal' | 'blocked'
  cancellationAllowed: boolean
  terminalProfileRecordRef?: string
  progress: Array<{ store: string; state: 'pending' | 'removed' | 'unavailable' }>
}
```

| Prior phase | Caller/approval | Durable action | Cancellation | Restart/result |
| --- | --- | --- | --- | --- |
| prepared | main prepares scope | managed/excluded inventory | allowed | discard prepared journal |
| approved | OD-01 ceremony | approval-consumed scope journal | allowed until irreversible | prompt timeout/abort preserves profile |
| irreversible | main after selected boundary | irreversible marker before destructive writes | no | restart returns `profile-deleting` |
| removing | main | each covered store progress acknowledgement | no | unavailable store -> `blocked`, never terminal |
| terminal | main | terminal profile record after covered-store reconciliation | no | startup `profile-destroyed` |
| post-destruction creation | OD-03 ceremony | new profile ID journal, not marker deletion | n/a | explicit new profile or remain destroyed |

Destruction is logical deletion of enumerated managed stores only. External portable artifacts, system backups, swap, crash dumps, legacy residual copies, and other user-held exports are explicitly excluded unless the selected scope records a managed action for them. A terminal record cannot be erased merely to permit setup.
