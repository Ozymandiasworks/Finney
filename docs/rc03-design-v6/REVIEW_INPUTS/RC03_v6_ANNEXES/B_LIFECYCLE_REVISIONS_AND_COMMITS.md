# Annex B — Authority, lifecycle and recoverable commits

Version `6.0.0-draft`; proposed only. Types use [A1](A_IPC_SCHEMAS_AND_LIMITS.md#a1--representation-and-shared-grammar); authentication uses [F1](F_PROPOSED_CRYPTOGRAPHIC_FORMAT_AND_COMMITMENTS.md#f1--canonical-records-and-key-hierarchy).

## B1 — Startup classifier and admissions

Each startup attempt gets a main boot ID and settles within30s. Probe independently, read-only and noninitializing: installation anchor and lifecycle ledger; selected profile slot; protected authority head/staging/commit journal; every mapped legacy root/output/message namespace including projection-only residuals; provider/account/backend mapping. An I/O error, locked provider, unsupported record or failed parser is never NOT_FOUND. Missing wallet plus present outputs is legacy/conflicting, never absence. No subscriptions, autosave, setup seed generation or secret-consuming worker starts until admitted. Retry is a new bounded attempt; late probe results from prior attempts cannot mutate state.

Classification is a validation pipeline, not an unvalidated marker priority list:

1. Verify installation identity, provider and authenticated lifecycle head. Unreadable returns unavailable/locked; unknown schema returns unsupported; malformed authenticated binding returns corrupt. No missing anchor fallback when any protected managed store/residue exists. Recognized legacy-only sources are classified separately under D1; they do not authorize an anchor over residue. A new destination may be bootstrapped only through the explicit D1 acquisition intent and successful empty-destination proof.
2. Resolve lifecycle journal's exact pending cross-store operation (D4) before interpreting expected missing stores as corruption. A valid terminal/supersession chain chooses the current slot. An old terminal does not dominate a valid linked successor.
3. Open the selected authority backend exclusively and resolve B4 atomic head/journal state. Authenticated prepared/staged-but-uncommitted objects are expected intermediate state, not missing active members. Orphan stage bytes cannot become authority.
4. Validate every member reachable from the resolved committed head. Unexplained missing/substituted/current-member mismatch is corrupt; incompatible competing complete heads/mappings are conflicting. A prepared journal never excuses a missing member in the committed head.
5. Reduce verified evidence using the table. Preserve lower-level diagnostics; status is the most restrictive applicable row. A claimed destruction completion with an unreadable covered store remains unavailable/deleting, not terminal.

| State | Evidence | Admitted actions; writes |
|---|---|---|
| unavailable / locked | Required probe/backend/provider timed out/failed/account inaccessible | inspect/retry only; no authority writes |
| unsupported | Any required schema/suite/mapping not understood | inspect; preserve bytes, no initialization/repair |
| corrupt | Authenticated graph or selected record fails exact checks | inspect, separately authorized isolated recovery only; no generic repair |
| conflicting | Authorities, root aliases, source fence or installation slots disagree | inspect, explicit recovery plan only |
| profile-deleting | Verified lifecycle journal at irreversible boundary | D4 named deletion resume; no signing/new authority |
| profile-destroyed | Terminal removal proof; no valid supersession | inspect, explicit beginNewAfterDestruction only |
| normal-commit-recovery | Unknown acknowledgement or prepared normal commit requiring B4 resolution | resolve named commit; all effects/deletion blocked |
| migrating | Verified acquisition journal, no protected activation | inspect, D1 resume/cancel after fresh fence |
| candidate-only | Verified initial head, zero active and one prepared/validated candidate | inspect/resume/cancel candidate, request activation; no send |
| cleanup-pending | Committed protected active head plus accounted legacy residue | view; C4 approved named settlement; cleanup only with current recovery/fence |
| ready | Exactly one active generation and verified current graph | A2 permitted methods; sensitive methods still require policy/approval |
| legacy-bootstrap | Valid mapped legacy evidence, no current protected authority | preliminary inspect; trusted D1 acquisition only |
| verified-absence | Every selected namespace/ledger/projection probe succeeded absent and installation slot explicitly unused | explicit prepareCreate/import; never automatic creation |

Conflicting diagnoses need not be erased to report the controlling state. Provider unavailability while deleting reports unavailable with deletion phase preserved. Probe result is a closed Status with state/reason; never resolve failure to `{}`. Generation schemas newer than understood are refused even for apparently harmless mutation.

## B2 — Bootstrap, replacement and candidate records

Installation identity and profile slot are established explicitly, before candidate secrets. A truly unused installation creates a random installation ID and independent lifecycle authentication key through G1 provider, with the ordered D1 bootstrap files/journal; all other mapped namespaces must have been successfully absent. Crash between anchor and empty lifecycle slot is `bootstrap-pending` represented as normal-commit-recovery, reconciled from authenticated creation intent. Unknown anchor write means no candidate generation until resolved. Existing installation never regenerates a missing anchor over residue.

`Candidate={schema:1,id:ID,profile:ID,wallet:ID,generation:U32,network:Network,kind:'create'|'mnemonic-import'|'portable-import'|'migration',state:'prepared'|'validating'|'validated'|'quarantined'|'cancel-requested'|'cancelled'|'activated',expectedActive:U32|null,expectedEpoch:U64,rootRefs:Ref[],inventoryRef:Ref,sourceDigest:H|null,validationRef:Ref|null,policyDigest:H,request:RequestBinding}`. U64 is a CBOR unsigned integer internally (A decimal only at IPC). Candidate identity is immutable. Main-generated profile/wallet/generation IDs and initial manifest with active=null are committed before returning a preparation handle; secret material is generated/imported only through the trusted channel, protected under the same profile key and candidate graph. No in-memory-only handle represents durable successful preparation.

| Transition | Atomic result / failure / restart |
|---|---|
| absence -> explicit prepare | Durable installation slot intent, new profile key and head(active=null,candidate prepared); first failed commit leaves verified prior absence plus classified staging; unknown blocks second preparation until resolution |
| prepared -> validating -> validated | Save protected root/output inventory, match mnemonic/root/network/scripts and complete recovery obligations, then candidate validation digest; failed validation leaves quarantined candidate, never active |
| candidate-only restart | Reopen same IDs and graph; display inspect/cancel/resume; no fresh seed, implicit activation or deletion |
| concurrent prepare | Global candidate quota1 and installation writer serialize; second caller BUSY; stale request returns original durable candidate |
| existing A -> prepare B | A remains active and unchanged; new IDs/generation for B; frozen/uncertain A operations remain referenced; candidate shares no live grants |
| validated B -> activate | Fresh trusted approval; same expected A and epoch, provider/fence/policy/recovery all ready; one atomic head change sets B active, A retained, increments lifecycle epoch; preserves A roots/outputs/operations/reservations |
| activation unknown | No projection/subscriptions/effects until B4 resolves; restart sees exactly prior A or committed B, never half catalogue |
| cancel before activation | Journal candidate-only cleanup; no active/root/source deletion; after cleanup keep request tombstone and cancelled identity; first-profile head remains empty/cancelled, explicit reprepare allowed with new ID |
| cancel after activation | Reject rollback; retained A remains recoverable. Any later reactivation is explicitly UNSUPPORTED_WORKFLOW in this version, not cancellation |

Validated import with incomplete descriptors but valid bound scalar can be recoverable per E. Unresolved quarantine blocks complete qualification/activation if required coverage is incomplete; original bytes preserved. Mnemonic-only import is explicitly partial recovery, not complete known-output recovery. Candidate can be inspected but cannot retire any old source. Zero-active cancelled head is candidate-only, not absence; it exposes explicit preparation, not implicit setup. Candidate secret generation failure never calls old wallet reset/clear.

`CandidateValidation={schema:1,id:ID,candidate:ID,generation:U32,rootRefs:Ref[],inventoryRef:Ref,sourceDigest:H|null,policyDigest:H,expectedActive:U32|null,expectedEpoch:U64,mode:'new-empty'|'mnemonic-partial'|'complete-recovery',checkedOutputs:U32,quarantinedOutputs:U32,coverageDigest:H,validatorVersion:1}` is a protected `candidate-validation` record. Counts are bounded by A5. It binds the exact root/inventory/source/policy/epoch used in validation; it is not a reusable boolean approval. Activation compares all bindings with the current authenticated candidate and recalculates membership, completeness and required readiness checks under the writer fence. Changed inputs invalidate the record and return the candidate to validating. A partial mnemonic import can be explicitly activated as a partial recovery, but cannot qualify complete historical output recovery or retire an older source. Missing/substituted validation records or unresolved required outputs prevent activation. CandidateValidation itself is included with candidate recovery evidence in F4, but imported evidence grants no activation authority.

## B3 — Authoritative schemas and revision domains

All logical records are closed typed values in the authenticated graph F1. `Ref=[type:RecordType,id:ID,revision:U64,digest:bstr32]`; expected digest is trusted only by walking from authenticated head. No renderer-provided Ref is accepted. RecordType is `manifest,catalogue,root,output,scalar,quarantine,operation,effect,reservation,replay,tombstone,migration,backup,policy,candidate,candidate-validation,retirement,observation,content-retention,membership-page,inventory-page,artifact-chunk,effect-audit-page,provenance,task,ceremony,external,snapshot,sender-ephemeral,snapshot-support`. Unknown type/version/purpose rejected. Logical records have full original RecordPlain envelopes and F4 physical cells/bindings. Max logical record1MiB; larger inventories are immutable pages of <=256KiB with sorted membership (F1); exact signed artifacts use encrypted chunks referenced by operation. `PageRef` is Ref with type membership-page. `InventoryPageRef` is Ref with type inventory-page; body is `{schema:1,id:ID,kind:'leaf',outputs:Ref[<=256],sourceEntries:SourceEntry[<=256]}` or `{schema:1,id:ID,kind:'index',pages:Ref[<=512]}`; max two levels, never cycles. SourceEntry is `{namespace:bytes<=128,key:bytes<=1024,digest:H,class:OutputState,raw:Blob}`; Blob is C1 bounded chunk reference. Read paths enumerate leaves even when output cache is empty. Empty sourceEntries is allowed for native inventories; complete raw acquisition supplies all source entries.

`Manifest={schema:1,profile:ID,wallet:ID,network:Network,epoch:U64,revision:U64,active:U32|null,catalogue:Ref,policy:Ref,membership:PageRef[],coverageRevision:U64,coverageDigest:H}`. `Catalogue={schema:1,entries:Generation[<=16]}`; `Generation={generation:U32,state:'candidate'|'active'|'retained'|'retiring'|'retired-local-kept'|'destroyed-history',root:Ref|null,inventory:Ref[],rootAliases:H[<=16],operations:ID[<=4096],createdRevision:U64}`. Sorted by generation, unique; rootAliases are protected equality relations derived internally from validated root, never an external authority claim. Same root import aliases rather than duplicates owned inputs.

`Root={schema:1,profile:ID,wallet:ID,generation:U32,network:Network,purpose:'legacy-wallet-root',mnemonic:utf8|null,rootXpriv:utf8,derivation:'finney-legacy-899-145-v1',publicIdentity:bytes33,discovery:{receiveUpper:U31,changeUpper:U31},rootAlias:H}`. Mnemonic/root agreement rederived where mnemonic present; absence allowed only as declared legacy root-only recovery. Preserve the exact seed derivation and root serialization, validate supported network. No storage key derives from any wallet scalar. `BoundKeyRef={schema:1,profile:ID,wallet:ID,generation:U32,network:Network,purpose:'ordinary-spend'|'change-spend'|'stamp-spend'|'stealth-spend'|'identity-message'|'identity-publication',member:CellRef,origin:QRef,output:ID|null}` is **main internal**; validate exact purpose, operation, committed membership and generation every use. E defines outputs and scalar fallback.

Epoch changes on activation/reactivation, retirement scope change and destruction. Manifest revision advances each authority commit. Record revision advances only that record. CoverageRevision advances only F6 semantic mutations. Immutable operation intent/version never changes; effect progress has separate revision. Unrelated receipt does not invalidate approval; selected input/member mutation, relevant policy, epoch or caller does. Authority head CAS compares expected revision under one exclusive writer; a second process cannot bypass it using a read-then-write race.

## B4 — Atomic-backend-only commit proposal

No nontransactional fallback is proposed. The physical head binds PhysicalManifest and Binding (B7/F4); logical Ref closure is separately checked. Required provider/backend proposal: **one native LevelDB authority database, level7.0.1 / leveldown6.1.1, atomic WriteBatch with sync:true**, single main writer plus OS-held exclusive installation lock. Actual packaged ABI, native backend and flush behavior must be proved under G1 before adoption. Separate content/legacy/lifecycle databases are never described as part of this transaction. If selected backend cannot supply these semantics, authority mutation stays unavailable and the design requires revision; a digest journal is not a substitute.

Large changes use immutable encrypted pages; old versions remain intact. `Commit={schema:1,id:ID,profile:ID,expectedHead:HeadRef,nextHead:HeadRef,reason:Reason,reads:Ref[],staged:[{objectKey:bstr,completeEnvelope:bytes|durableObjectRef,digest:H,length:U32}],priorRefs:Ref[],phase:'prepared'|'committed'|'aborted',writerEpoch:U64}`. A durableObjectRef resolves to **full encrypted bytes**, never just a hash. Prepared and final journals are authenticated by F1. `HeadRef=[manifestRevision,manifestObjectId,physicalManifestDigest,commitId]`. Reason closed to candidate/receive/reserve/approval/artifact/effect/activation/migration/backup/tombstone/retirement/policy/task/ceremony/external/observation/replay/content-retention. reads/priorRefs are PhysicalRef arrays for actual storage, not untransformed source Refs. HeadRef digest is the physical manifest plaintext digest bound by the MAC; not an envelope-ciphertext digest. Staged durableObjectRef={namespace:'stage',id:ID,digest:H,length:U32} resolves exact immutable encrypted bytes, with namespace fixed by main. Installation deletion is D4 instead.

1. Hold installation OS lock and native DB lock; load/verify current head H0. Validate expected epoch/read refs and resource reservation. Freeze immutable H1 write set with full recoverable encrypted bytes.
2. Sync each bounded immutable stage batch (<=1MiB/256 records). Stage is invisible to ordinary readers; H0 reachable data remains. Failure preserves H0. Persist authenticated PREPARED journal with H0,H1 and every stage reference after stage acknowledgements. Fail/timeout resolves from DB, never proceeds blindly.
3. Recheck H0, writer token, selected member revisions; single atomic `batch(sync:true)` writes new authenticated head H1, COMMITTED journal/idempotency result, and any remaining small immutable values. This batch is the **sole authority linearization point**. No separate index/cache becomes authoritative. Expected mismatch aborts before submission. Commit result and head cannot be partially committed under the required backend contract.
4. F8 usage reservations survive every graph abort/rollback below. A successful callback is the selected synchronous barrier, subject to G's failure model. Unknown callback/timeout stops all writes/effects; close safely when possible, reopen exclusively and authenticate both head and journal. H1 plus COMMITTED matching all stage bytes means committed; H0 plus PREPARED/absent final result means not committed; anything mixed/missing in H1 is corrupt/unknown and frozen. H0 with incomplete unreferenced stage is an aborted preparation, not corruption of H0. Never roll forward an uncommitted H1 merely because stages exist.
5. Public projection follows resolved commit. GC may remove orphan aborted stages or old objects only after authenticated reachability from current head, retained generations, unresolved commits and backup snapshot pins proves no references. Sync GC journal/cursor; disk pressure never overrides retention. Keep at least prior head while resolving any acknowledgement; after known resolution old versions may be collected only if not required for recovery. Monotonic logical versions do not detect a full valid store rollback.

Commit-ID repeats with byte-identical write set return original result; conflicting repeats reject. Storage callback error after possible submission is UNKNOWN_OUTCOME unless backend proves not submitted/rolled back. Read-back verifies content but is not the sync barrier. No success claim from cache updates. On missing stages for an uncommitted H1 abort and preserve H0/source; missing committed stages freeze corrupt, never silently roll back a potentially disclosed payment.

## B5 — Generation access and interfaces

Candidate: inspect/validation only. Active: declared methods with consent. Retained: view, backup and read-only reconcile; no fresh signatures; exact named artifact delivery only under C4 selected alternative. Retiring: reconciliation/backup checks only, no admission of new effects. Destroyed-history: nonsecret status only. A retained receipt is protected as an unadmitted observation pending selected monitoring/recovery policy, not used as an automatic new spend.

Reservation index spans every generation: `[network,canonicalTxid,vout] -> {operation,generation,artifactDigest|null,state}`; one owner. Freeze/cache/indexer absence never drops that membership. Overlapping imports require alias merge and identical script/value evidence or OWNERSHIP_CONFLICT. Late A callbacks after B activation only update authenticated named A effect and cannot mutate B projection/inputs or resurrect grants.

RC-04 interface `commit(expected,completeWriteSet,reason)->{commitId,outcome:'committed'|'not-committed'|'unknown',barrier:'sync-writebatch'}` and `resolve(commitId)`; no void persistence. RC-14 `inspect()->Status`, candidate prepare/activate/cancel with no error-to-empty. RC-08 `freezeCoverage()->SnapshotToken`, `verifyActualArtifact()->Qualification`, `recheckAtRetirement()` in F6. RC-15 `retainThenTombstone(scope)` versus `destroyManagedProfile(scope)` in D; neither calls signing. These internal APIs are not IPC escape methods.

## B6 — Planned acceptance fixtures (all UNEXECUTED)

| ID | Fixture/injection | Required result | Layer |
|---|---|---|---|
| W1-01 | Empty/create/import; candidate-only restart/cancel; concurrent prepare; fail/lost first anchor/head ACK | Durable stable IDs or classified prior state; no seed regeneration or ghost activation | mocks, actual backend, packaged |
| W1-02 | Replace A with B while A frozen outputs/unknown effects exist; kill before/after validation/activation | Exactly A or B active; old complete recovery retained; no clear/reset | backend interruption plus packaged |
| W1-03 | Every probe EIO/permission/locked/future schema/corrupt/output-only; overlapping marker combinations | Settles<=30s, no mutation/autosave/setup; intermediate classified before generic corruption | unit plus actual backend |
| W3-01 | Each B4 stage/journal/head/callback/projection/GC edge: fail, disk full, delay, kill, lost ACK | H0 or complete committed H1; no disclosure until resolve; missing committed stage freezes | fault backend, real reopen, storage-crash separate |
| W3-02 | Cross-type/key/profile/wallet/network/generation/revision/page/member substitution, replay both digest+value | Reject against authenticated root; full-store rollback explicitly outside claim | actual provider plus independent vectors |
| W3-03 | Competing CAS/process; receipt versus reserve/sign/backup/delete; stale writer epoch | One owner, stable selected inputs; no partial membership or double reservation | integration and native lock |
| W3-04 | Independent canonical encoders and key-domain vectors; duplicate/omitted/reordered members | Byte-identical valid tuples; malformed/noncanonical reject | independent cryptography vectors |
| W5-02 | Activate B then late A result/receipt, duplicate root, copied operation | Only scoped retained observation; no fresh signing or duplicate ownership | lifecycle integration |

## B7 — Closed supporting types and ownership registry

No omitted supporting type may be supplied as an arbitrary object. Existing B/C/D/E schemas remain the closed logical bodies, with the explicit v5 replacements below. IDs in RecordPlain/body refer to logical OriginSpace identity; F4 provides fresh physical main authority. Main alone owns every writer. Public statuses contain no original secret envelope, physical Cell or general store handle.

~~~text
SourceIdentity={schema:1,kind:'native'|'legacy'|'network'|'portable',owner:ID,
 mappingDigest:H|null,volume:bytes16|null,file:bytes16|null,
 origin:Text(2048)|null,partition:Text(128)|null,namespace:bytes<=128,
 key:bytes<=1024,recordDigest:H,inventoryDigest:H|null,
 artifactDigest:H|null,adapter:ID|null}
LifeRef=[type:'bootstrap'|'profile-init'|'slot'|'destruction'|'supersession'|'task'|'ceremony'|'external'|'replay'|'backup',
 id:ID,revision:U64,digest:H]
SnapshotToken={schema:1,id:ID,profile:ID,headRevision:U64,bindingDigest:H,
 logicalRoots:QRef[],authorityEpoch:U64,coverageBytes:bytes<=65536|SnapshotBlob,coverageDigest:H,
 charge:U64,recordCount:U32,pinId:ID,state:'pinned'|'released'|'expired'}
PhysicalManifest={schema:2,profile:ID,wallet:ID,revision:U64,epoch:U64,
 binding:PhysicalRef,physicalMembers:PhysicalRef[<=128],logicalAuthority:AuthorityIndex,
 admission:'candidate'|'ready'|'frozen'|'deleting',commit:ID}
PhysicalRef=[type:'cell'|'binding'|'binding-page'|'physical-members'|'authority-page'|'physical-manifest',id:ID,revision:U64,digest:H]
~~~

SourceIdentity native: owner is logical profile, mappingDigest/volume/file/origin/partition/inventoryDigest/artifactDigest/adapter=null. Legacy: owner=migration ID; mappingDigest/volume/file/origin/partition/inventoryDigest required, adapter/artifactDigest=null. Network: owner=observation ID and adapter required, mapping/file/origin/partition/inventory/artifact fields null. Portable: owner=origin profile and artifactDigest required, adapter/mapping/file/origin/partition/inventory null. namespace/key/recordDigest always identify the exact original raw record, not a fabricated derivation class. A whole-image preliminary identity uses key empty and recordDigest=image digest; per-record acquisition specializes key/digest after enumeration. Fixed main mapping binds file identities; no caller path.

LifeRef digest=SHA256(C([1,installationId,slotEpoch,type,id,revision,body])) excluding MAC; every lookup must match the independently authenticated LifeHead and L record MAC. No private authority is created by a valid digest alone. SnapshotToken logicalRoots holds at most16 current manifest QRefs; coverageBytes uses inline bytes for lengths0..65536 inclusive and MUST use F13 SnapshotBlob above65536. No C1 Blob/artifact-chunk may back this field; the1MiB record limit never changes this threshold. Digest always hashes resolved bytes. SnapshotToken is one complete encoded graph pin, not a renderer token; expiry/release blocks export from that pin without mutating authority. PhysicalManifest.physicalMembers references the F4 bounded member pages. Entries exclude the manifest and member-page nodes, include Binding/binding-page/every Cell exactly once and sort by(type,id,revision); the authenticated head and explicit page refs close the graph. logicalAuthority is the same PortableAuthority projected by the validated current logical manifest/catalogue; selected Manifest2/Catalogue2 roles/epoch/policy/current membership must agree under F12 or CONFLICT, never choose the more permissive copy. Ref closure is checked before exposing any key operation. Commit and journal B4 use PhysicalRefs for actual immutable staged values; original logical Ref validation remains F4. The U usage namespace is not rolled back or collected with graph objects.

~~~text
Task={schema:1,id:ID,kind:TaskKind,subjectKind:SubjectKind,subject:ID,
 origin:RequestBinding,profile:ID|null,generation:U32|null,
 state:TaskState,detail:Detail,subjectIndex:Ref|null,ceremony:ID|null,consume:ID|null,
 result:PublicResult|null,error:Error|null,revision:U64,restored:boolean}
TaskState='prepared'|'awaiting-input'|'awaiting-consent'|'running'|'paused'|
 'unknown'|'complete'|'cancelled'|'expired'|'failed'|'imported-inert'|'unavailable'
Ceremony={schema:1,id:ID,task:ID,purpose:Purpose,summary:Summary,
 summaryDigest:H,scope:Scope,caller:CallerBinding,boot:ID,nonce:ID,grantDigest:H|null,
 expiresMonotonic:U64,state:'issued'|'accepted'|'consumed'|'cancelled'|'expired',
 consume:ID|null,restored:boolean}
CallerBinding={webContents:U32,process:U32,frame:U32,origin:Text(2048),
 documentEpoch:U64,boot:ID,installation:ID,profile:ID|null}
External={schema:1,id:ID,task:ID,destination:Text(2048),sourceMessage:H|null,
 summaryDigest:H,consume:ID|null,
 state:'prepared'|'awaiting-consent'|'consumed'|'dispatch-intent'|
 'submitted'|'unknown'|'failed'|'cancelled'|'expired'|'imported-inert',
 boot:ID,attempt:0|1,result:'none'|'os-accepted'|'os-rejected'|'unknown'}
~~~

TaskKind: create,import,acquire,activate,reactivate,mnemonic-display,send,message,publication,recovery-delivery,continuation-accept,backup,verify-backup,restore,delete-content,retire,destruction,destruction-resume,external,reconcile,cancel-candidate,cancel-operation,probe. SubjectKind: candidate,migration,operation,backup,tombstone,retirement,destruction,external,profile. Detail is a closed tagged union {kind:TaskKind,phase:enum}: candidate kinds use B2's Candidate.state; acquire uses D1 Migration.phase; send/message/publication/recovery-delivery/continuation-accept/reconcile/cancel-operation use C's OperationState; backup uses the A8 preparation/credential/export phases when generated credential is selected, otherwise pending/complete/failed; verify-backup uses verification pending/complete/failed; delete-content uses Tombstone.state; retire D2 Retirement.state; destruction/resume D4 Destruction.phase; external External.state; mnemonic-display uses issued/consumed/displayed/cancelled/expired/unknown; probe uses B1 State. Reactivate is unavailable only. No arbitrary Text progress state. subjectIndex is null except delete-content, where D3 requires an inventory-page deletion-index; its referenced tombstones remain covered even when Task itself is bookkeeping. PublicResult is null or exactly A's declared result for origin.method, never private metadata or a generic blob. Every task's subject target must exist in its owning P/L domain; id is not interchangeable with subject ID. Tasks are recorded together with durable replay mapping on preparation.

Tasks/ceremonies with no ready P or read-only nonce-exhausted emergency backup (bootstrap, destruction after P removal, successor and profile external launch) are nonsecret L records under LifeRef; all others are logical P records. A task never migrates between domains implicitly: L bootstrap task links the committed candidate ID and remains L-owned to completion. Profile task lookup is main-routed to its recorded domain, not caller-selected. L never stores mnemonic/credential/content or transaction bytes; private input is memory-only scoped to its trusted ceremony. Original imported P tasks/ceremonies/external records are historical and nonexecutable by the F4 binding-entry imported flag and new boot/installation admission.

The complete logical type/edge registry below is also the portable-transform inventory. All types preserve their full original envelope, receive one Cell binding, and use F6's projection. ID edges listed are validated without recursive hashing. Ref edges are validated exactly and mapped through F4; references in nested arrays inherit the same rule. SourceIdentity, RequestBinding and original artifact/intent byte hashes are origin facts, not live-authority handles.

| Type; body schema | Ref fields (including nested) | ID relationships / scope |
|---|---|---|
| manifest; B3 | catalogue,policy,membership | profile-wide; active selects catalogue generation |
| catalogue; B3/F12 | Generation.root/inventory | schema2 qualified generation keys and operations LocalIDs; profile-wide |
| root; B3 | none | same logical profile/wallet/generation; mnemonic/root agreement |
| output; E1 v2 | scalar,derivation.senderEphemeralSecret,aliases.evidence,bindingEvidence refs | reservation -> reservation; origin and spend status independent |
| scalar; E1 | none | output -> output of same generation; binding tuple excludes scalar Ref |
| sender-ephemeral; E6 | none | output -> exact output; sender public reconstruction only; binding excludes secret Ref |
| snapshot-support; F13 | none | snapshot owner identity only; exclusive bookkeeping, never spend authority |
| quarantine; E1 | none | source origin only; no spending permission |
| operation; C1/C2/C7 | reservations,effects,intent.inputs.ref,changeRefs,Artifact Blob chunks | effect/intent/continuation operation IDs exact same; originRequest immutable |
| effect; C2 | auditPages,evidence.raw Blob chunks | operation/dependency IDs -> operation/effect in same graph; no cycles in dispatch dependencies |
| effect-audit-page; C2 | Evidence.raw Blob chunks | operation/effect IDs and unique ordinal |
| reservation; C7 and original body below | none | operation/output typed LocalIDs, canonical outpoint -> exactly one owned output under F12 |
| replay; C3 | none | subjectKind/subject exact target; original RequestBinding not reminted |
| content-retention; D3 | outputs,scalars,descriptorEvidence,replay,reservation | operations IDs -> operation; generation exact |
| tombstone; D3 | retention | message IDs are immutable wire IDs; scope bound |
| migration; D1 v2 | sourceInventory,quarantine; inline DeleteItem list is not a Ref | candidate ID -> candidate; source identity exact |
| candidate; B2/B7 schema2 | rootRefs,inventoryRef,validationRef | expected logical active generation or null |
| candidate-validation; B2/B7 schema2 | rootRefs,inventoryRef | candidate ID -> same candidate; bookkeeping only |
| retirement; D2 v2 | scopeRefs | qualification ID -> backup; orchestration cannot own sole recovery data |
| backup; Qualification below | none | artifact digest external file, not an unresolved graph Ref |
| snapshot; SnapshotToken | logicalRoots,coverageBytes.chunks (SnapshotBlob only) | pin/head identity bookkeeping only |
| policy; G5 | none | profile-wide; pending never enables dependent operation |
| observation; F4 below | raw Blob chunks | generation/source identity; unadmitted blocks completeness |
| inventory-page; B3/D3 | outputs,pages,sourceEntries.raw Blob chunks; deletion-index pages are tombstone Refs | acyclic sorted page tree; complete persistent enumeration |
| artifact-chunk; C1 | none | artifact ID/part/ordinal; exact bytes immutable |
| provenance; F4 below | none | old digests are origin claims, never live Ref lookup |
| membership-page; F1 | entries as Ref | original source membership checked before local binding |
| task; above | subjectIndex when delete-content | subject/ceremony links by owning domain; imported inert |
| ceremony; above | none | task/consume IDs; no secret or signing authority on restore |
| external; above | none | task ID; one OS attempt maximum; imported inert |

Additional closed bodies retained from the portable section:
Reservation={schema:1,network,txid,vout,operation,generation,state:'reserved'|'possibly-spent'|'spent-retained',artifactDigest:H|null}; types Network,H,U32,ID,U32 in field order. Observation={schema:1,id:ID,profile:ID,generation:U32,source:SourceIdentity,sequence:U64,rawDigest:H,raw:Blob,admission:'unadmitted'|'validated'|'conflicting'}. Provenance={schema:1,id:ID,originalProfile:ID,originalWallet:ID,originalGeneration:U32,originalRecordDigest:H,artifactDigest:H}; fixed origin facts, no accumulating chain at each restore. Qualification={schema:1,id:ID,artifactDigest:H,byteLength:U64,coverageDigest:H,policyDigest:H,verification:'pending'|'complete'|'failed',verifiedFixtureVersion:U32,locationHandle:ID,stale:boolean}. Backup file identity/handle is locally revalidated, never trusted from imported metadata. Policy uses exactly F11's closed body, selection/adoption enums and semantic preimage; G5 supplies the pending alternatives. No untyped future field. The field types of previously abbreviated Quarantine.id/profile/generation and expectedBinding are ID/ID/U32 and bytes<=4096; its source is SourceIdentity.

New native Candidate2 retains B2 Candidate fields with schema=2, generation=0xffffffff, expectedActive=GKey|null, and adds activationTarget:GKey. Its context/profile/wallet are the coordinator writerSpace; rootRefs/inventoryRef are qualified original targets (all imported generations remain inventoried), and the selected target must exist in the current qualified catalogue. CandidateValidation2 makes the same changes, adds activationTarget:GKey and binds the same candidate, roots/inventory/policy/epoch. Candidate ID back-reference follows F10. RootRef target generations are validated against their catalogue GKeys rather than assumed equal to the profile-wide candidate envelope. The intended target's public identity/network is displayed in fresh activation consent; original active role is only a proposed target, never permission. Activation changes that GKey's local role atomically and retains every other generation and unresolved obligation. Historical schema1 candidate/validation records remain inert evidence; native multi-space acquisition uses schema2. Expected active/epoch mismatch, missing root/valid fallback or ambiguous target refuses without altering old authority. Cancellation removes only admitted candidate staging after its journal/guard, never original imported source. This qualification is required for the F12 positive restore-to-activation path, not a new reactivation feature.

## B8 — Additional planned fixtures (all UNEXECUTED)

| ID | Fixture/injection | Required result | Layer |
|---|---|---|---|
| D1-01 | Untouched legacy-only, empty destination, lost protected anchor, output-only, mixed/unavailable namespace | Only explicit M-A destination bootstrap admitted; no anchor regeneration over residue | classifier plus packaged mapping |
| D1-02 | Kill/lost ACK at every prepare-file/key-wrap/rename/slot/intent/U-init edge | Original acquisition IDs retained; classified pending or locked state; original source untouched | native filesystem/provider interruption |
| D1-03 | Source/mapping substitution or old writer after restart/cancel; unsupported M-B | Reacquire live immutable proof or refuse; M-B side-effect-free unavailable | integration and native exclusion |
| D7-01 | Every A method/task/ceremony row independently validated; mutate each bound field | Exact closed grammar, persistent subject and typed outcome; no ambient authority | independent schema/reducer fixtures |
| D7-02 | Reload/cache eviction/restart/cancel/expiry before and after consume and each dispatch | Stable task lookup, at most one permitted effect; all imported tasks inert | lifecycle and actual backend |


Scope/version closure: Root.mnemonic is null or UTF8 bytes<=4096; rootXpriv is validated supported serialized UTF8 bytes<=256. Current generation role mapping is candidate=0,active=1,retained=2,retired-local-kept=3 in F4; retiring/destroyed-history are not admitted current authority in this version (retirement is orchestration until commit; destruction is L). Historical records preserve declared old values as evidence only. Current epoch/role agreement across the F12 selected logical Manifest2/Catalogue2, Binding and AuthorityIndex is checked atomically; no independent authority switch is inferred from an imported original role. Empty bootstrap head has no wallet secret, policy unselected and active=null; unknown encryption/head outcome never invents a second candidate.


Closed L-only bodies completing bootstrap/task ownership (never portable wallet authority):

~~~text
ProfileInit={schema:1,id:ID,installation:ID,profile:ID,wallet:ID,keyId:ID,
 bootstrap:ID,anchorDigest:H|null,phase:'prepared'|'anchor-published'|
 'usage-initialized'|'profile-ready',headDigest:H|null}
Slot={schema:1,id:ID,installation:ID,epoch:U64,profile:ID|null,
 state:'unused'|'preparing'|'candidate'|'ready'|'deleting'|'destroyed',
 bootstrap:ID|null,profileInit:ID|null,terminal:ID|null,supersession:ID|null}
~~~

LifeRef.type profile-init/slot uses these exact bodies; bootstrap uses D1 BootstrapIntent; destruction/supersession use D4; task/ceremony/external/replay/backup use the B7/C3 corresponding closed nonsecret bodies with profile context validated from the slot. ProfileInit intentDigest for the wrapped anchor is SHA256(C([schema,id,installation,profile,wallet,keyId,bootstrap])) and excludes mutable phase/anchorDigest/headDigest; LifeHead/record MAC authenticates those progress fields. BootstrapIntent digest in the lifecycle anchor likewise commits all its immutable fields excluding phase; no phase update invalidates its binding. L snapshot/update capacity is <=65536 records and<=64MiB encoded metadata within the independently provisioned backend; at cap refuse before new obligations, preserve terminal/usage/replay data. No L record stores KP, content, artifact plaintext or credential. Complete wallet backup intentionally excludes this local lifecycle domain and recreates nonexecutable destination lifecycle through explicit bootstrap; source-granted task authority is never portable.
