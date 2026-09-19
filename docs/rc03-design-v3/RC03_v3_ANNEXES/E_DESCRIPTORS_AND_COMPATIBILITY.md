# Annex E — Recovery descriptors, compatibility, and scalar exposure

Status: normative proposed design, version `3.0.0-draft`. It preserves existing derivation/wire semantics and requires specialist review before implementation.

## E.1 Common descriptor fields

```ts
type CommonDescriptorV1 = {
  descriptorVersion: 1
  profileId: Hex16
  walletId: Hex16
  generation: number
  network: 'xec-livenet' | 'xec-testnet'
  outpoint: { txid: Hex32; vout: number }
  historicalOutpointAliases: Array<{ txid: Hex32; vout: number }>
  expectedAddress: string
  expectedScriptHex: string
  satoshis: DecimalUInt64
  lifecycle: 'unspent' | 'frozen' | 'pending' | 'spent-retained' | 'orphaned' | 'recovery-only'
  derivationVariant: 'ordinary' | 'change' | 'stamp' | 'stealth'
  sourceRecordKey: string
}
```

`expectedScriptHex` is limited to 512 bytes and `sourceRecordKey` to 1024 UTF-8 bytes. Alias count is at most 16. Every descriptor validates the expected derived/scalar public key against expected script/address and outpoint binding before it is accepted as recoverable.

## E.2 Ordinary and change descriptors

```ts
type OrdinaryDescriptorV1 = CommonDescriptorV1 & {
  derivationVariant: 'ordinary' | 'change'
  account: 0
  branch: 0 | 1
  index: number
  path: "m/44'/899'/0'/0/i" | "m/44'/899'/0'/1/i"
  discoveryUpperBound: number
}
```

`index` and `discoveryUpperBound` are `uint31` values. Ordinary uses branch 0; change uses branch 1. Existing account/path semantics are unchanged. The initial recovery inventory explicitly records known indices; discovery bounds are not an arbitrary-gap guarantee. Existing BIP39 behavior uses no additional mnemonic passphrase. A portable backup password/credential is independent input and must never be passed into mnemonic seed derivation.

## E.3 Stamp descriptors

```ts
type StampDescriptorV1 = CommonDescriptorV1 & {
  derivationVariant: 'stamp'
  payloadDigestHex: Hex32
  transactionEncounterOrdinal: number
  listedOutputEncounterOrdinal: number
  transactionGroupIdentity: Hex32
  path: '44/145/i/j'
}
```

Both encounter ordinals are `uint31`. They are semantic values from original message/transaction grouping and listed-output order. They are not on-chain `vout`, inventory sort position, count of currently unspent outputs, or alias position. Canonical commitment sorting is solely a representation of descriptor records and never renumbers these fields. The payload digest and exact encounter fields remain even when the output is spent or content is deleted, subject to the owner-selected minimum retention policy.

## E.4 Stealth descriptors

```ts
type StealthDescriptorV1 = CommonDescriptorV1 & {
  derivationVariant: 'stealth'
  ephemeralPublicKeyHex: Hex33
  transactionEncounterOrdinal: number
  listedOutputEncounterOrdinal: number
  senderContextAvailable: boolean
  path: '44/145/i/j'
}
```

The ephemeral key is a compressed valid curve point, 33 bytes. The descriptor does not infer sender secret context from an ephemeral public key. It records whether the required existing derivation context is present and validates the recovered result against script/address. Sender-context exposure analysis is a specialist obligation; lack of sender context is a boundary, not permission to alter the wire algorithm.

## E.5 Scalar fallback and quarantine

```ts
type ScalarFallbackV1 = {
  scalarBytes: Hex32
  reason: 'legacy-import' | 'descriptor-incomplete' | 'historical-alias-unresolved'
  validatedAgainstScript: boolean
  exposureClass: 'identity-equivalent-potential'
}
```

Scalar bytes must satisfy `1 <= scalar < secp256k1_n`, be exactly 32 bytes, and reproduce the expected script/public key under the preserved library semantics. Leading-zero, zero, `n`, greater-than-`n`, malformed length, invalid point, and exceptional derivation conditions are explicit negative cases. Valid scalar fallbacks remain protected/recovery material after spending. They are excluded from ordinary renderer/projection/log/export paths and subject to the same incident/custody policy as identity material.

A raw legacy record with neither a validated descriptor nor scalar fallback is stored as a bounded quarantined evidence record with source key/digest/reason; it is never silently omitted, normalized into a new derivation, or treated as complete recovery. Quarantine blocks migration cleanup, sole-copy retirement, complete backup qualification, and destruction-complete claims for the affected scope.

## E.6 Compatibility obligations

The review package requires vectors for: ordinary/change paths; identity `m/44'/899'/0'/0/0`; Stamp and stealth `44/145/i/j`; private/public child agreement; original encounter order; nonsequential vouts; aliases; missing context; BIP39 normalization/no-extra-passphrase behavior; scalar edge cases; and known source-library exceptional branches. Vectors must run against the pinned local library and an independent implementation. Mathematical reference results are not application compatibility evidence.

The current exposure boundary is explicit: a leaked Stamp scalar plus public Stamp derivation context can recover recipient identity scalar under the documented construction; sender-context stealth has analogous risk. Account-wide ordinary/change implications additionally require account xpub context. This does not assert master seed recovery, universal outsider stealth recovery, a legacy cryptographic break, or a changed derivation protocol. OD-06 must record compromise-response scope before dependent activation/retirement claims.
