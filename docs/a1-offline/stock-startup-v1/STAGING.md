# STOCK-A1 separate tooling provenance — contract version 2

STAGING-01, within Architecture-V1/a0e5890/ARCH-002. This is the source-only correction authorized by the 2026-10-17 staging adjudication and DEC-029. New validation is UNEXECUTED. Stop delivery for Operations Manager identity binding; this document does not authorize guest transfer or an S02 attempt. No application/package/runtime/build/profile change is included.

## Three identities, one operational anchor

1. Candidate package source remains `a0e5890e612c81fda4d2698f78dbe4b81fba3e0d`, measured separately from `C:\FinneyA1Lab\source`. Its own `.git` must exist, Git must resolve exactly that root and HEAD, and full tracked/untracked status must be empty. The preserved `?? powershell` is a refusal, not an exception. Package inventory, executable/ASAR, configuration, fuses, native-entry and source-correspondence obligations remain additional checks.
2. Tooling commit is the new host delivery commit, attributed by the independently checked host export and approval. The staged tree is not a checkout. `toolingCommit` is never a claim that guest Git measured this commit. No `.git`, fallback to a parent repository or copy into the frozen source is permitted.
3. The case matrix remains version 1, with the same 43 definitions, requirement/source/limits and bytes. Dispatch reads it from the verified tooling tree. Contract/classifier resolve the identical relative file and compare its actual SHA-256 with the raw record. A matrix row is not execution permission.

The trusted lab operator and owner-routed OM approval remain the authority. There is no new signing key, privileged broker or unbypassable security boundary. OM independently verifies the delivered commit and content, then pins manifest, archive and case-matrix digests in a fresh bounded approval. The operator obtains the approval's SHA-256 from that separate routed packet, not from the staging directory, and supplies it as mandatory `AuthorizationSha256`. Before running any entry, the operator verifies that entry's bytes against the independently pinned manifest. A script cannot authenticate malicious replacements of itself; the trusted operational anchor is indispensable.

The dispatcher hashes the approval before parsing its references. It verifies the pinned manifest and fixed dispatcher/provenance-module bytes before loading the module. The shared provenance function then checks the entire layout, hashes, source, matrix, approval and attempt ledger. It repeats that gate before native compilation/creation. Changed/unknown identities stop before candidate creation. Point-in-time hashing does not make the tree immutable against a concurrent malicious administrator; preserve trusted exclusive staging and observe changes throughout the later interval. No such attacker-resistance claim is added here.

## Export and manifest

After the scoped commit, export only these two directories with Git archive ZIP from that exact commit, without `--worktree-attributes`:

    git archive --format=zip --output=<fresh-output>/tooling.zip <exact-tooling-commit> docs/a1-offline/stock-startup-v1 experimental/a1/test/stock-startup-v1

This is a documented export recipe, not guest-execution permission. The delivered manifest uses format `git-archive-zip-raw-v1`. Inspect committed and repository-local export attributes before export; unexpected export-ignore/export-subst/filter conversion blocks delivery. Compare each decompressed entry's raw bytes with the exact Git blob. No checkout newline conversion, BOM change, re-encoding or guest normalization is allowed. Archive timestamps/compression are incidental to the pinned archive identity; a recreated ZIP must not silently replace the approved archive even if its content is equal.

Produce `manifest.json` outside the ZIP using [tooling-manifest.schema.json](../../../experimental/a1/test/stock-startup-v1/tooling-manifest.schema.json): version 2; exact tooling commit attribution; package source; requirement hash; matrix relative path/hash; archive byte count/hash; and all 16 file entries `{relative, bytes, sha256}`. Each file is at most 1 MiB, archive at most 1 MiB; tree at most 64 entries. The manifest does not contain itself or an approval. The ZIP contains only the Git files, not the manifest or delivery commit report. This order avoids a circular commit/manifest/archive hash.

OM binds the resulting manifest digest and archive digest after checking the export chain. A manifest that changes together with its content fails the independent approval pin. The supplied archive and every unpacked file must match; a correct ZIP alone does not validate an altered extracted tree. The gate does not extract an archive or repair a tree.

## Fixed guest layout and versioned approval

OM chooses a fresh lowercase 32-hex delivery ID and binds exactly:

    C:\FinneyA1Lab\evidence\stock-tooling-v2-<deliveryId>\manifest.json
    C:\FinneyA1Lab\evidence\stock-tooling-v2-<deliveryId>\tooling.zip
    C:\FinneyA1Lab\evidence\stock-tooling-v2-<deliveryId>\tooling\docs\a1-offline\stock-startup-v1\...
    C:\FinneyA1Lab\evidence\stock-tooling-v2-<deliveryId>\tooling\experimental\a1\test\stock-startup-v1\...

`tooling` has exactly the 16 manifest files and their necessary directories. Extra files, empty extra directories, Git metadata, aliases, duplicate/case-ambiguous entries, escape paths and reparse paths/entries refuse. Original path spelling is preserved. Generated test outputs, native-helper compilation artifacts, captures and temporary work must stay outside `tooling` and outside frozen source/package/profile trees, with separate identity/time attribution. There is no broad ignore rule for generated files. The source status check still includes all untracked source files. The test's fresh fixture trees are retained, never cleaned to produce a pass.

Version 2 [dispatch input](../../../experimental/a1/test/stock-startup-v1/dispatch-input.schema.json) adds `scope`, `packageSource`, `packageSourceRoot`, `requirementHash`, `toolingCommit`, `deliveryId`, `toolingRoot`, `toolingManifest`, `toolingArchive`, and `attemptLedger`. `harnessCommit` alone is insufficient. Required owner approval, UTC validity window, run/case/network/profile, package/fixture/observer references remain. The external `AuthorizationSha256` is a mandatory dispatcher argument, not stored alongside the approval as an authority source. No populated approval is shipped.

Current dispatch scope is only `FIRST_FEASIBILITY`, `S02-REOPEN`, `xec-regtest`, `client-b`. New versions explicitly refuse other rows even if the matrix defines them. D2/S08/S09/other-network/hostile-input dispatch requires a later scope handoff; it is not an automatic consequence of passing S02. Synthetic classifier tests retain the whole matrix's historical classification semantics, not dispatch permission.

The independently pinned attempt ledger is a version-1 JSON operational record with `scope: FIRST_FEASIBILITY`, matching `runId/caseId/network/profile`, `maximumCandidateAttempts: 1`, `candidateAttempts: 0`, `dispatcherInvocations: 0`, and `previousCheckpointSha256` identifying the verified final checkpoint. OM must reconcile actual prior attempts before issuing it; an uncertain count blocks. Reusing a run ID refuses because `stock-startup-v2-<runId>` is new-only. A different commit, delivery, approval or turn does not reset the cumulative allowance. The record is operational evidence, not a machine-enforced global anti-replay database; the trusted operator must not issue competing approvals or retry a launch with uncertain results.

Approval expiry remains actual UTC with explicit `Z`; no guessed clock offset, clock changes, backdating or extended expiry workaround. Clock correlation is still a separate prerequisite. All old approvals/results remain unchanged at their old source/evidence identities; version-1 results are rejected by the new classifier, never silently promoted to version 2.

## Result and failure attribution

Version-2 raw records keep package source and tooling commit distinct. `provenance` records measured package-source root/HEAD, actual bounded tooling root, attributed tooling commit with `HOST_EXPORT_APPROVAL_NOT_GUEST_GIT`, manifest/archive/matrix/approval digests and run/case/network/profile. The existing package identity and original input/token/handle records remain. The classifier checks its own loaded matrix digest and these bindings, but hashes and supplied assertions are not independent truth. All classification remains `acceptance: UNQUALIFIED`, `independentVerification: NOT PERFORMED`.

A failed provenance gate before the run record exists throws a tooling error; the operator preserves stdout/stderr/exit separately. It is NOT LAUNCHED, not an application REFUSED result, native SUPPRESSED result or acceptance pass. Failures after record creation retain dispatcher-error.json. Existing wrapper `passed:false/exitCode:null`, independent kernel exit 1 and the original failed PREMAIN evidence remain unchanged and separately attributed.

Compilation/loading uses only the verified NativeLaunch.cs. Existing compilation/output behavior is unchanged. Installed-toolchain temporary paths and generated helper artifacts require separately attributed guest validation/observation before any candidate attempt; a successful historical compile does not establish this delivery's runtime operation. No compiler/runtime is downloaded or modified.

## Regression definitions and remaining integration

[provenance.test.ps1](../../../experimental/a1/test/stock-startup-v1/provenance.test.ps1) calls the same `Confirm-StockProvenance`, path and inventory logic as dispatch. It creates only a new synthetic evidence subtree, copies the exact source files there, preserves every case and records setup failures separately. The external Git command result is deliberately substituted; actual filesystem/hash/root/schema/approval/matrix/ledger checks execute. A continuation sentinel proves a rejected gate did not reach the next step; no native helper or candidate is invoked by this suite. Synthetic manifest/ZIP-like bytes are hash fixtures, not assertions of a genuine Git export. A setup failure, including unavailable junction creation, is a failure/inconclusive prerequisite, not a negative-case pass.

Definitions cover separate commits/no staged .git, wrong/swapped roots and identities, archive/manifest/approval/file substitution, missing/extra/duplicate/case-aliased/traversal/reparse dependencies, wrong matrix/requirement/source, stale/expired/future/schema-mismatched approvals, case/network/profile/run binding, spent allowance and tracked/untracked source dirt. [contract.test.js](../../../experimental/a1/test/stock-startup-v1/contract.test.js) adds raw-provenance/version substitution checks while preserving null-wrapper versus kernel distinctions. Neither suite runs in this authoring phase.

Later separately routed guest validation must cover the real Git wrapper, actual pinned export, bootstrap, installed PowerShell parsing/module operation, native compilation without invocation, and negative dispatcher preflight with independent no-candidate observation. Checkpoint the exact commands, versions, fixture/setup failures and results; do not equate synthetic gate tests with packaged reproduction. Preserve the single S02 allowance. Do not operate the candidate simply to validate this module.

The f21755a results remain historical: 23 pure regressions passed; dispatcher parser reported zero errors; unchanged NativeLaunch.cs compiled but was not invoked; dispatcher invocations and S02 attempts were zero. This revised delivery has no execution results. Historical six transfer hashes, 29 older source checks and independent close/reopen passes retain their original scope only.

## Stop and remaining prerequisites

Source delivery stops before transfer/VM queries/validation. OM must bind the new commit, manifest/archive/matrix and checkpoint before a continuation. No new owner D1/D2/D3 selection is needed.

S02 additionally requires disposition of preserved guest `?? powershell` without an invented exception, supported clock correlation, complete package/fuse/configuration/native identity, valid preserved client-b copies including ACL/provider evidence, standard-account launch, qualified observer sensitivity controls, original-input/token/handle/descendant and interval egress/isolation evidence. Unknown effects, failed controls, losses, incomplete exits or uncertain attempts block. RECORD-01 and remaining provider/isolation/A1 obligations stay open. No fixture repair, reset, migration, account or settings change is implied.

Targeted independent Security verification remains separate at exact repaired source/package/evidence identities. No unchanged Architecture replay, automatic Cryptography cycle, finding closure, Gate 1 passage or release follows from this delivery.
