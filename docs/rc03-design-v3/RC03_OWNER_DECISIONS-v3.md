# RC-03 owner decisions v3

Status: all entries are **PENDING** unless an owner record with date, scope, and provenance is later added. Recommendations are not selections or risk acceptance. Dependent transitions remain blocked.

| ID | Required decision/subdecision | Complete alternatives | Consequences and recommendation | Blocked scope |
| --- | --- | --- | --- | --- |
| OD-01A | trusted approval surface | A isolated packaged trusted surface; B OS-mediated ceremony; C ordinary renderer | A/B require platform evidence. C does not meet custody target. Recommend A or proven B. | all privileged operations |
| OD-01B | secret channel and display | A trusted surface only; B platform credential channel with main binding; C ordinary renderer | A/B can preserve boundary; C is not acceptable. | import/export/recovery credentials |
| OD-01C | approval continuation after reload/crash | A fresh approval before undispatched durable artifacts; B scoped continuation of exact durable approved effect set | A is conservative but can strand delivery until user returns. B needs exact UX/evidence and no new spending. Recommend A until B is reviewed. | R4/R5 resume dispatch |
| OD-01D | trusted summary/spoofing model | A main-rendered immutable summary; B independently audited alternate display | Both require focus/window epoch/cancellation/recheck. | all approvals |
| OD-02A | portable container/library | A owner-selected established reviewed container/library; B candidate P-1 after review; C no portable target | C reduces required recovery and needs explicit owner change. Recommend evaluate A/B through Cryptography. | export/import/retirement |
| OD-02B | recovery credential/device policy | A generated high-entropy credential; B user-selected passphrase with defined strength; C hybrid recovery envelope | Trade device compatibility against offline guessing risk. No mnemonic-as-only-backup key. | backup creation/restoration |
| OD-02C | complete restore standard | A full offline profile reconstruction, script and synthetic-signature validation; B sampling | B cannot establish complete scalar-only recovery. Recommend A. | sole-source retirement |
| OD-02D | pending operation/artifact coverage | A include exact unresolved artifacts/reservations/tombstones; B block backup qualification while unresolved | A is richer; B is conservative. Either needs explicit semantics. | coverage/retirement |
| OD-02E | artifact availability/staleness | A current durable local artifact plus verification; B removable/user-held artifact availability proof; C stale artifact allowed | A is testable; B needs UX/evidence; C is unsafe for retirement. | retirement/cleanup |
| OD-03A | retained recovery/replay metadata | A explicit minimum descriptor/replay table; B retain full message content; C aggressively delete metadata | A balances privacy/recovery; B expands retention; C can strand recovery. Recommend A. | content tombstones |
| OD-03B | pending delivery/remote deletion | A preserve exact pending artifact locally, no remote delete; B defined remote delete protocol; C discard | B needs transport semantics. C may lose delivery/replay evidence. | deletion and delivery |
| OD-03C | destruction cancellation and new-profile UX | A cancel before irreversible boundary and explicit new profile afterward; B no cancellation after preparation | A supports recovery but requires durable boundary. Recommend A. | whole-profile destruction |
| OD-04A | Windows package/provider/backend | A exact pinned package/provider/backend/origin/partition matrix; B generic Windows claim | B is untestable. Recommend A. | acquisition/authority commits |
| OD-04B | durability failure model | A bounded actual backend acknowledgement/commit resolution; B stronger storage/power-loss claim with dedicated evidence | A is minimum truthful model. B requires separate testing. | projection/effects/cleanup |
| OD-04C | main transport policy | A per-adapter verified Tor/fail-closed map; B assume renderer session | B is unacceptable. Recommend A. | enabled main network paths |
| OD-05A | old-writer exclusion | A isolated one-time legacy acquisition; B demonstrated same-profile exclusivity; C coexistence | C cannot support cleanup. Recommend A plus residual-copy disclosure. | migration/cutover |
| OD-05B | update/downgrade/profile policy | A supported updater/isolation; B conflict-only detection | A has deployment cost; B cannot prevent old writes. | activation/cleanup compatibility |
| OD-05C | residual copies | A retain/disclose and separately retire; B call erased | B is unsupported. Recommend A. | deletion claims |
| OD-06A | complete-store rollback limitation | A accept documented absence of full valid-store freshness detection; B commission independent freshness design | A narrows claims; B is separate architecture. Recommend A this gate. | owner-facing claims |
| OD-06B | logical deletion limitation | A logical managed-store deletion only; B forensic erasure claim | B needs separate platform design. Recommend A. | destruction claims |
| OD-06C | scalar compromise response | A identity-equivalent incident scope with context-qualified account implications; B treat output scalar isolated | B conflicts with reviewed mathematical boundary. Recommend A. | recovery/export/incident policy |
| OD-06D | retained identity policy | A monitor retained identities; B explicit recovery/reactivation only; C discard after switch | A needs network/privacy semantics; C breaks recovery. Recommend B until reviewed. | R6 retained receipts |
| OD-06E | overlapping roots and unknown outcome UX | A canonical profile-wide reservation + indefinite unresolved status; B per-generation reservation/rebuild | B risks duplicate authority/effects. Recommend A. | R5/R6 |
| OD-07 | canonical toolchain | A Node 24.19.0/Yarn 1.22.22 and selector alignment later; B Node 16 selector compatibility; C range-only | A matches runtime guard/package intent. B fails current guard. Recommend A. | implementation acceptance |

## Recording requirement

A decision record must name selected option, effective date, profile/platform scope, accepted limitations, implementation boundary, required reviewer sign-off, and reversal/migration policy. It must not be inferred from an example, recommendation, test, or report. Until recorded, every dependent row in the technical annexes returns the pending-policy result without substituting a weaker fallback.
