# Annex C — Operation, approval, artifact, and external-effect tables

Status: normative proposed design, version `3.0.0-draft`.

## C.1 Immutable operation records

```ts
type WalletOperationV3 = {
  operationId: Hex16
  immutableVersion: 1
  profileId: Hex16
  walletId: Hex16
  generation: number
  lifecycleEpoch: DecimalUInt64
  intentBytes: Base64Url
  intentCommitment: Hex32
  unsignedTemplateBytes?: Base64Url
  approvalId?: Hex16
  approvalState: 'none' | 'issued' | 'consumed' | 'expired' | 'aborted'
  reservationKeys: Array<{ network: string; txid: Hex32; vout: number }>
  artifact?: FinalArtifactV1
  effects: EffectV1[]
  aggregateState: OperationStateV1
  replayExpiryMs: DecimalUInt64
}

type FinalArtifactV1 = {
  artifactId: Hex16
  immutableBytesDigest: Hex32
  signedTransactions: Array<{ txid: Hex32; bytes: Base64Url }>
  deliverableMessages: Array<{ messageId: Hex32; bytes: Base64Url }>
  createdFromIntentCommitment: Hex32
  durableCommitId: Hex16
}
```

`intentBytes` is canonical main-generated semantic intent. `unsignedTemplateBytes` may contain a deterministic, nonsigning template but cannot be sent or resumed as a final payment. `FinalArtifactV1` contains exact signed transaction bytes and exact deliverable message bytes. It is committed before any disclosure that can enable spending or delivery. A transaction ID without bytes is insufficient for exact retry.

## C.2 Transition table

| Prior state/evidence | Caller/purpose | Approval | Expected revisions | Durable writes and acknowledgement | Projection / first disclosure | Cancellation/failure | Restart action |
| --- | --- | --- | --- | --- | --- | --- |
| none | `prepareSend` | none | active epoch, manifest and selected input revisions | prepared operation + reservation plan; known authority commit | public summary only; no disclosure | abort removes unconsumed plan | resolve prepared commit; no effect |
| prepared | `approveSend` | trusted OD-01 ceremony | same epoch, selected members, immutable intent | atomic reservation + approval-consumed plan commit | main-only approval result | changed summary/caller/epoch aborts | no final bytes: request fresh approval |
| approved plan | main signing | consumed durable approval | exact immutable plan | final signed bytes and effect plan committed with barrier | none before known commit | in-memory signature loss has no continuation | no final artifact: fresh approval, no effect |
| final artifact committed | main dispatch | selected continuation policy; currently blocked pending OD-01 | artifact commit and effect revision | effect `in-flight` commit | first permitted external disclosure | timeout is unknown, not failure | resolve effect; retain reservation |
| effect unknown | `resumeOperation` | no fresh spend authorization; observation/reconciliation only | immutable artifact/effect ID | observation/effect result commit | no new artifact | user may abandon UI only; reservation remains | retry exact persisted bytes only if policy/evidence permits |
| all effects terminal | main | none | effect revisions | aggregate result + history projection after authority commit | public status | terminal failure does not erase recovery | reopen normal projection |

No final-artifact persistence boundary may be crossed with an unknown authority-commit acknowledgement. No cancellation after final-artifact disclosure releases an input or permits a replacement transaction. The owner must select whether a durable approved artifact may continue delivery after restart; absent decision, `resumeOperation` reports unknown/blocked and does not dispatch.

## C.3 Effect inventory and evidence policy

| Effect type | External disclosure capable of effect | Required persisted bytes | Evidence states | Dependency/aggregate rule |
| --- | --- | --- | --- | --- |
| preflight observation | query request | canonical query and request ID | not-started, response, timeout, malformed | advisory only; cannot release reservation |
| transaction broadcast | signed transaction bytes | exact bytes + txid + selected inputs | submitted, accepted-response, rejected-response, unknown, confirmed, reorged | each bundle member tracked separately |
| relay delivery | encrypted serialized message/envelope | exact message bytes + ID + target | submitted, relay-accepted, rejected, unknown | may depend on selected broadcast plan |
| registry/profile publication | signed bytes and any spendable attachment | exact signed payload + attachment artifact IDs | submitted, accepted, rejected, unknown | uses same operation if attachment spends |
| forum/offering publication | signed bytes and any spendable attachment | exact signed payload + attachment artifact IDs | submitted, accepted, rejected, unknown | no bypass around payment operation |
| local history projection | no external network | public projection reference | committed, failed | follows authority commit only |

Aggregate operation states: `prepared`, `approval-required`, `artifact-persisted`, `dispatching`, `spent-delivery-unknown`, `spent-delivery-failed`, `delivered`, `reorg-observed`, `conflicting`, `cancelled-before-disclosure`. `spent-delivery-unknown` and `spent-delivery-failed` retain reservations and expose a truthful user-visible unresolved/failed delivery state; they are not mapped to generic `failed` or `cancelled`.

## C.4 Replay, collisions, and unknown outcomes

The replay ledger stores request ID, caller facts digest, method, intent commitment, operation ID, created time, and expiry. Same request ID with different method/payload/caller binding returns `WALLET_ERR_CONFLICT`. Expiry never permits rebuilding a previous payment: it removes only request lookup, while operation records retain immutable artifact identity through final settlement/retention policy. A restored approval is historical and may not satisfy a new trusted ceremony.

For every unknown external response: preserve exact bytes; persist observed evidence with source/time; request conservative reconciliation; retain reservation; do not infer rejection from not-found alone; do not create a replacement payment; and do not extend user authorization. OD-06 selects the user experience for indefinite uncertainty, but no alternative permits automatic new spending.

## C.5 Transport ownership

Every effect record stores `transportId`, `transportVersion`, proxy/Tor policy identifier, and failure contract identifier. A main-owned effect may dispatch only when its selected adapter reports the required policy verification. Proxy/Tor verification failure produces a typed unknown/blocked result and no direct fallback. This annex neither enables nor changes any transport.
