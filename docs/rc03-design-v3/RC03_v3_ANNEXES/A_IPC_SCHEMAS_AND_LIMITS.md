# Annex A — IPC schemas, limits, and trusted ceremony

Status: normative proposed design, version `3.0.0-draft`. Pending owner policy cells are blocked.

## A.1 Common types and limits

All protocol text is UTF-8 NFC after decoding. JSON objects must have unique keys. Unknown fields are rejected. Integers are base-10 JSON numbers representing safe integers only; no float, exponent, negative value, string-number, or `null` substitutes are accepted unless a field explicitly says otherwise. Byte strings are lowercase hex with fixed length or base64url without padding as declared.

| Name | Proposed bound | Validation error |
| --- | ---: | --- |
| protocol major | `1` | `WALLET_ERR_PROTOCOL_VERSION` |
| request body | 262144 bytes | `WALLET_ERR_LIMIT` |
| public result | 1048576 bytes | `WALLET_ERR_LIMIT` |
| top-level object keys | 64 | `WALLET_ERR_LIMIT` |
| nesting depth | 32 | `WALLET_ERR_LIMIT` |
| array members | 100000 | `WALLET_ERR_LIMIT` |
| message UTF-8 bytes | 65536 | `WALLET_ERR_LIMIT` |
| output records per inventory | 100000 | `WALLET_ERR_LIMIT` |
| effects per operation | 32 | `WALLET_ERR_LIMIT` |
| transactions per bundle | 16 | `WALLET_ERR_LIMIT` |
| pending request ledger | 256 entries per profile | `WALLET_ERR_BUSY` |
| foreground approval | 1 | `WALLET_ERR_BUSY` |
| queued approvals | 8 | `WALLET_ERR_BUSY` |
| ordinary IPC deadline | 15 seconds | `WALLET_ERR_TIMEOUT` |
| profile probe deadline | 30 seconds | `WALLET_ERR_TIMEOUT` |
| approved effect-dispatch deadline | 60 seconds | `WALLET_ERR_TIMEOUT` |

`WalletId`, `ProfileId`, `CandidateId`, `OperationId`, `CommitId`, `ApprovalId`, `ArtifactId`, and `RequestId` are 16-byte random identifiers encoded as 32 lowercase hex characters. `Generation` is `uint32` in `[0, 4294967295]`. `LifecycleEpoch`, `ManifestRevision`, `MemberRevision`, and `EffectRevision` are positive `uint64` encoded as canonical decimal strings to avoid JavaScript numeric truncation. `txid` is exactly 32 bytes lowercase hex in canonical internal byte order defined by the existing transaction library; its display conversion is outside this IPC format. `vout` is `uint32`.

## A.2 Main-derived caller facts

The request payload contains no trusted sender/frame/origin identity. Main derives:

```ts
type CallerFactsV1 = {
  webContentsId: number
  windowId: number
  frameProcessId: number
  frameRoutingId: number
  isMainFrame: boolean
  origin: string
  windowEpoch: string
  navigationEpoch: string
  receivedAtMs: number
}
```

Admission requires the current primary Finney window, main frame, exact selected packaged origin, expected navigation epoch, and a live focused foreground surface where a trusted ceremony is required. Main re-derives the facts before approval issuance, approval consumption, signing, and every external effect. Any changed/destroyed/replaced window/frame/origin returns `WALLET_ERR_CALLER_CHANGED` and invalidates dependent handles.

## A.3 Request envelopes

```ts
type ProfileRequestV1 = {
  protocolVersion: 1
  requestId: Hex16
  method: 'profile.inspect' | 'profile.prepareCreate' | 'profile.prepareImport' |
    'profile.resumeMigration' | 'profile.retryProbe' | 'profile.beginNewAfterDestruction'
  payload: Record<string, unknown>
}

type WalletRequestV1 = {
  protocolVersion: 1
  requestId: Hex16
  profileId: Hex16
  walletId: Hex16
  generation: UInt32
  lifecycleEpoch: DecimalUInt64
  manifestRevision: DecimalUInt64
  method: WalletMethodV1
  payload: Record<string, unknown>
}
```

Profile methods are admitted only by the lifecycle table in Annex B. `profile.prepareCreate` and `profile.prepareImport` create no authority and return only a bounded opaque preparation handle. `profile.beginNewAfterDestruction` requires a valid terminal profile record and an OD-03-selected trusted ceremony; without it, `WALLET_ERR_POLICY_PENDING`.

`WalletMethodV1` is closed:

| Family | Methods | Main result | Approval |
| --- | --- | --- | --- |
| status/view | `wallet.status`, `wallet.addresses`, `wallet.outputs` | public projection | none |
| candidate | `wallet.inspectCandidate`, `wallet.activateCandidate`, `wallet.cancelCandidate` | candidate state | activation: OD-01 |
| receive | `wallet.observeReceipt`, `wallet.reconcile`, `wallet.inspectOperation` | public observation/status | none; observation cannot spend |
| send | `wallet.prepareSend`, `wallet.approveSend`, `wallet.resumeOperation`, `wallet.cancelOperation` | immutable summary/status | approval: OD-01 |
| identity | `identity.prepareMessage`, `identity.publishProfile`, `identity.publishRegistry`, `identity.publishForum` | typed public status | when effect plan can disclose spendable bytes: OD-01 |
| recovery | `wallet.prepareBackup`, `wallet.verifyBackup`, `wallet.prepareRestore` | bounded status/candidate | secret/credential path: OD-01/02 |
| retention | `wallet.deleteContent`, `wallet.prepareRetirement`, `wallet.destroyProfile` | tombstone/destruction status | OD-01/03 |

No method returns private material. No method accepts an arbitrary key reference, derivation path, raw signing request, transaction bytes, encrypted-record key, storage path, arbitrary URL, or renderer-declared caller fact.

## A.4 Handles, results, and errors

Main issues opaque handles only after admission. A handle carries internally: type, profile/wallet, generation, lifecycle epoch, manifest revision, subject ID, caller facts, expiry, and one-use state. Handles are unguessable; a presented handle is not itself authority.

```ts
type WalletResultV1<T> =
  | { ok: true; requestId: Hex16; value: T }
  | { ok: false; requestId: Hex16; error: WalletErrorV1 }

type WalletErrorV1 = {
  code: 'WALLET_ERR_PROTOCOL_VERSION' | 'WALLET_ERR_SCHEMA' | 'WALLET_ERR_LIMIT' |
    'WALLET_ERR_STATE' | 'WALLET_ERR_UNAVAILABLE' | 'WALLET_ERR_CORRUPT' |
    'WALLET_ERR_UNSUPPORTED' | 'WALLET_ERR_CONFLICT' | 'WALLET_ERR_CALLER_CHANGED' |
    'WALLET_ERR_STALE' | 'WALLET_ERR_APPROVAL_REQUIRED' |
    'WALLET_ERR_APPROVAL_EXPIRED' | 'WALLET_ERR_POLICY_PENDING' |
    'WALLET_ERR_BUSY' | 'WALLET_ERR_TIMEOUT' | 'WALLET_ERR_UNKNOWN_OUTCOME' |
    'WALLET_ERR_OUTPOINT_OWNERSHIP_CONFLICT'
  retryable: boolean
  publicDetail?: string
}
```

Errors disclose no path, key, secret, encrypted plaintext, raw backend exception, or diagnostic stack. Main stores a redacted diagnostic correlation ID separately.

## A.5 Trusted ceremony alternatives — OD-01 pending

| Alternative | Channel and display | Required evidence | Blocked until selected |
| --- | --- | --- |
| A: isolated packaged surface | Separate minimally privileged packaged trusted window; main renders immutable summary into a restricted fixed UI; no ordinary renderer content, Node, or broad bridge | spoofing/focus/window epoch, accessibility, secret marker, origin/frame, crash/reload and prompt queue tests | all privileged operations |
| B: OS-mediated ceremony | Platform credential/approval facility with a main-owned immutable summary and an audited return channel | capability availability, binding, cancellation, user-switch, wrong-account, display integrity and synthetic credential leakage tests | all privileged operations |

Both alternatives require: one foreground prompt; expiration at 120 seconds; one-use approval nonce; main-owned summary; explicit cancel; window/navigation/frame change invalidation; effect-time recheck; and durable consumed/aborted result. Neither permits ordinary renderer secret entry or a renderer-provided confirmation boolean. The chosen credential channel and secret display policy are separate OD-01 subdecisions.

## A.6 Identity-operation schemas

Identity methods accept semantic fields only. `identity.prepareMessage` accepts recipient public identity/address, bounded plaintext, message type enum, and existing-format options; main derives existing wire-format bytes. `identity.publishProfile`, `identity.publishRegistry`, and `identity.publishForum` accept canonical public profile/registry/forum fields and effect-plan handle; main constructs established signed bytes. Any payload that would embed spendable transaction bytes enters the R4/R5 operation flow and cannot bypass it. Unknown historical workflow returns `WALLET_ERR_UNSUPPORTED` until it has an explicit semantic schema.
