# Annex F — Proposed cryptographic format, commitments, and KDF requirements

Status: review candidate only, version `3.0.0-draft`. No algorithm, library, parameter, or container described here is selected or authorized. OD-02 and specialist Cryptography review block implementation and all recovery-dependent retirement.

## F.1 Candidate portable container P-1

P-1 is a candidate to be assessed, not adopted. It uses a fixed magic `FNYR`, format version `1`, a deterministic-CBOR profile defined by RFC 8949 requirements, an authenticated streaming payload mechanism from a maintained pinned library, and an Argon2id v1.3 candidate credential derivation. The eventual implementation may use P-1 only after owner selection, library/version review, compatibility vectors, dependency approval, and independent review. It must not substitute a custom construction.

Container bytes:

| Component | Encoding/bound | Authentication rule |
| --- | --- | --- |
| magic | 4 bytes `46 4e 59 52` | included in associated data |
| version | uint16, only `1` | included in associated data |
| header length | uint32, 256–16384 bytes | bounds checked before parse |
| canonical header | deterministic CBOR map | whole exact bytes are associated data |
| encrypted frames | max 65536 plaintext bytes each; max 8192 frames | authenticated ordered stream |
| final marker | mandatory authenticated final frame | missing marker rejects artifact |

The header has unique required keys: `suite`, `kdf`, `salt`, `streamHeader`, `profileId`, `walletId`, `network`, `lifecycleEpoch`, `manifestRevision`, `catalogueCommitment`, `coverageDigest`, `snapshotDigest`, `createdAtMs`, `containerNonceId`, and `payloadSchema`. Unknown critical keys, duplicate keys, absent keys, unsupported suite/KDF/version, or noncanonical encoding reject before authority activation. Identity/revision/count fields remain untrusted until authentication succeeds.

## F.2 Candidate credentials and parser ceilings

Candidate P-1 uses Argon2id with output length 32 bytes and 16-byte salt. It proposes export floors `memoryKiB=65536`, `iterations=3`, `parallelism=1`; proposed import ceilings `memoryKiB=262144`, `iterations=10`, `parallelism=4`; maximum password input `1024` UTF-8 bytes after a selected normalization policy. Parameter values must be unsigned integers, checked before arithmetic/allocation, satisfy floor/ceiling relationships, and respect process-wide one active KDF plus one queued KDF. Resource failure returns a typed error and never silently reduces costs.

These numerical profiles are Cryptography review candidates informed by documented Argon2id profiles; they are not an owner-selected device/latency policy. The owner must choose supported recovery device envelope, credential generation/strength policy, password encoding/normalization/whitespace treatment, cancellation policy, and legacy import behavior. A wallet mnemonic cannot be the sole secret used to decrypt its own only recovery artifact.

Salt and stream nonce/header are distinct fresh random values from an accepted OS-backed cryptographic RNG. RNG failure aborts export before any artifact is committed. Retransmission of byte-identical persisted artifact bytes is permitted; changed plaintext, header, key, or content requires a new export attempt with fresh suite-required nonce material. Concurrent/restarted exports must not reuse forbidden key/nonce combinations.

## F.3 Payload and actual-byte coverage

The decrypted payload is deterministic CBOR with bounded arrays and contains only: `payloadSchema`, `profile`, `catalogue`, `roots`, `descriptors`, `scalarFallbacks`, `operations`, `reservations`, `replayLedger`, `tombstones`, `backupPolicyState`, and `coverageProof`. It excludes ordinary renderer state, approval credentials, and raw transient secret UI values.

`snapshotDigest` is a domain-separated candidate digest over the frozen authoritative snapshot tuple: profile ID, lifecycle epoch, manifest revision, retained catalogue entry revisions, member record commitments, operation/effect revisions, reservation keys, tombstone revisions, and policy version. `coverageDigest` is a different domain over exact required generations, descriptor/scalar identities, unresolved-operation policy, and retention requirements. `artifactDigest` is computed over final container bytes after final authenticated marker and is recorded with durable write acknowledgement. The protected backup record stores artifact digest, frozen snapshot digest, coverage digest, selected suite/KDF identifiers, verification status, and staleness state.

The candidate commitment grammar uses deterministic CBOR with explicit domain byte strings: `finney/rc03/record/v1`, `finney/rc03/inventory/v1`, `finney/rc03/operation-intent/v1`, `finney/rc03/snapshot/v1`, and `finney/rc03/coverage/v1`. A candidate SHA-256 digest may bind the canonical bytes to an already authenticated/protected expected record; it does not authenticate replaceable data by itself. Exact algorithm placement, any MAC/key hierarchy, and purpose-separated key schedule are specialist decisions. Transaction and identity scalars are never storage/backup keys.

## F.4 Export, verification, and restore

1. Main obtains an accepted writer freeze and creates a snapshot token.
2. Main reads each exact frozen member and recomputes coverage before export.
3. Main serializes payload, encrypts/authenticates it, verifies finalization, writes a temporary artifact, flushes/renames according to selected backend semantics, and records final artifact digest only after acknowledged completion.
4. A separate restore verifier opens exact artifact bytes, performs pre-authentication syntax/bounds checks, executes KDF only within ceilings, authenticates all frames/final marker, validates payload grammar and bindings, recomputes coverage, validates descriptors/scalars/scripts and required pending-operation/tombstone policy, and records the result.
5. Restore creates an inactive candidate. It does not activate, sign, rebroadcast, release reservation, or resurrect approval. Activation requires ordinary candidate policy and trusted approval.
6. Before retirement, main recomputes current required coverage from authoritative state; any relevant mutation marks the artifact stale. A stale, absent, partial, unverified, inaccessible, or policy-incomplete artifact cannot qualify cleanup/retirement.

Fresh-profile verification must work without original OS wrapping credentials or relay history, reconstruct all required known scripts, and verify synthetic signatures without broadcast. A successful earlier restore does not validate later artifact bytes or snapshot state.

## F.5 Required specialist vectors and negatives

Review/implementation vectors must cover exact canonical encodings, header alterations, duplicate/omitted/sorted members, wrong password, empty/truncated/extended file, swapped profile/wallet/generation/chunk, absent final marker, unknown/downgraded suite, invalid/overflow/fractional KDF values, KDF resource exhaustion, RNG failure, interrupted/parallel export, changed-content retry, scalar edge cases, derivation aliases, and independent decoder/encoder agreement. The related-key mathematical reference evidence is prerequisite context only; pinned-library and independent compatibility vectors remain required.
