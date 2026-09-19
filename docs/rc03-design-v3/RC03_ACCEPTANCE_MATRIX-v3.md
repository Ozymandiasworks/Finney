# RC-03 acceptance matrix v3

Status: proposed verification plan. No row is executed implementation evidence. Fixtures use generated synthetic identities/secrets and no live funds.

| ID | Package | Fixture and starting state | Injected boundary | Expected invariant/result | Evidence layer | Permitted claim |
| --- | --- | --- | --- | --- | --- |
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
| R7-02 | R7 | scalar/point boundary fixtures | zero/n/out-of-range/leading zero/invalid point/missing context | reject or quarantine without losing source evidence | unit + integration | descriptor validation |
| R8-01 | R8 | all profile/wallet/identity methods | forged payload identity, subframe, popup, navigation/reload/replaced window | main-derived caller check rejects; no privileged effect | packaged Windows | caller isolation |
| R8-02 | R8 | synthetic secret marker flows | import/export/failed setup/restore and prompt cancellation | no marker in ordinary renderer/IPC/log/error/worker/clipboard/temp/crash artifacts | packaged Windows | tested sink absence only |
| R8-03 | R8 | hostile request/import/identity data | size/depth/count/queue/KDF flood | reject before expensive work; cancellation/status remains responsive | IPC/parser integration | resource bounds |
| R9-01 | R9 | frozen multi-generation snapshot | mutation during export, omitted scalar/generation/tombstone, short write/rename/disk full | exact artifact fails coverage or becomes stale; retirement blocked | backend/filesystem integration | coverage gate |
| R9-02 | R9 | portable artifact candidate | wrong credential/tamper/truncate/unknown suite/hostile KDF/RNG failure | no plaintext/activation/authority mutation; typed failure | crypto/library vectors + integration | parser/format behavior |
| R9-03 | R9 | fresh profile without original OS key/relay | restore complete synthetic catalogue/pending operations | inactive candidate only; exact scripts/synthetic signatures; no fresh approval | packaged Windows recovery | offline restore behavior |
| R10-01 | R10 | content with recoverable descriptors | delete request/late delivery/replay/old-backup restore | retain then tombstone before removal; zero signing/broadcast | message/wallet integration | deletion separation |
| R10-02 | R10 | whole-profile destruction | interrupt every retain/tombstone/delete/terminal edge; inaccessible store; cancel each side | classified restart; no accidental setup/completion claim | actual backend + packaged Windows | logical destruction behavior |
| R11-01 | R11 | owner-selected package/provider/backend profile | unavailable/wrong-user/corrupt provider/lost ACK/chunk limit | only documented durability level actions occur | packaged Windows | selected configuration behavior |
| R11-02 | R11 | every enabled main transport | Tor/proxy/DNS verification failure | typed failure; no direct fallback | runtime transport integration | route failure contract |
| R12-01 | R12 | clean shell using every selector | resolve Node/Yarn/runtime guard | selected versions resolve and check passes after authorized alignment | tooling integration | reproducible toolchain |
| REG-01 | preserved | legacy HTTP 402 containment regression | ordinary invocation | payment remains disabled | existing regression | containment preserved |
| REG-02 | preserved | received-output authentication/canonical ID regression | malformed/untrusted output | validation behavior preserved | existing regression | validation preserved |
| REG-03 | preserved | diagnostic sink regression | synthetic key marker | no key-bearing diagnostic output | existing regression | diagnostic behavior preserved |

Every later result records source SHA, design/package hashes, exact Node/Yarn/Electron/backend/provider versions, fixture identity, starting state, injected edge, observed result, pass/fail/skip count, and limitation. Unit mocks, real backend reopen, controlled termination, packaged Windows execution, power/storage-failure evidence, offline recovery, and independent verification are reported separately. Clean close/read-back is not a power-loss claim. Independent verification at frozen repair SHA remains required for plaintext custody and destructive replacement repairs.
