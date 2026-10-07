# A1 boundary remediation — owner-operated verification v1

Source parent: `c199d43afb4e1b421d1f3e4f8b860b86232fa421`. Candidate: the frozen containing commit recorded in the delivery manifest. Scope: inactive Windows x64 A1 shell, two fixed offline configurations, nonsecret profile markers. No wallet, signing, message, public network, migration, recovery, destruction or release operation. All new executable cases in this document are **UNEXECUTED**.

## Boundary implementation

The inspector verifies the fixed lab/runtime/profiles/network ancestors first. It enumerates each verified parent to distinguish an absent optional profile/protection directory from an inaccessible one. Each present selected tree is walked completely. Every entry's metadata, non-reparse attribute, SID owner and ACL are checked before directory enumeration. Hidden entries are included by the filesystem enumerator. Neither junctions nor other reparse points are descended into. Failed or partial enumeration, metadata/ACL failure, invalid paths, wrong owner and forbidden Allow entries abort admission. The profile tree is checked too; `profile.js` retains its exact marker/lock-only inventory restriction.

One monotonic stopwatch starts before inspection. Depth greater than 32 below each selected tree root, more than 4,096 enumerated entries across the scan (including optional-parent listings), or elapsed time reaching 6,000 ms causes refusal. There is no truncation-success mode. A blocked filesystem/firewall call is additionally bounded by the existing 10-second child-process timeout; time checks cannot interrupt a kernel call themselves. Firewall inspection still requires three enabled outbound-Block profiles and a successfully enumerated rule set with no enabled outbound Allow. The external error remains `BOUNDARY_UNVERIFIED`; internal errors identify a failure in extracted-function tests only.

Only the current account, SYSTEM and Administrators are general Allow principals. The existing root DACL-protection requirement remains. An effective owner Modify grant is required; an inherit-only owner entry alone is insufficient. No ACLs are changed by admission. Main/profile marker, regular-file, single-link, identity, changed-record, lock and missing-protection checks remain in place.

The pinned network-service capability remains exactly:
`S-1-15-3-1024-395641907-2340533657-1796656376-1949871151-3167452726-3934347287-2361051074-3061173417`.
Explicit grants are accepted only on directory anchors named exactly `Cache`, `Network`, and `Shared Dictionary` immediately under the selected protection root. Below them, capability grants must be inherited and bounded by a validated immediate parent's compatible grant. Files require ObjectInherit on the parent and no propagation on the file. Effective directory grants require ContainerInherit; inherit-only directory carriers must retain a permitted inheritance flag. NoPropagate parents cannot supply further inheritable grants. Child rights cannot exceed the supplying parent after generic file-right expansion or the existing Modify-plus-Synchronize ceiling. Generic-all, permission/owner changes, delete-child and other excess rights are excluded. Explicit descendant grants are not permitted. All descendant owners, reparse attributes and other ACEs are still checked.

Windows may split an inherited generic ACE into effective and inherit-only entries. Those forms are handled separately, with the parent context carried only by the checked traversal. See [Windows inheritance rules](https://learn.microsoft.com/en-us/windows/win32/secauthz/ace-inheritance-rules) and [file-right mapping](https://learn.microsoft.com/en-us/windows/win32/fileio/file-security-and-access-rights). This is a bounded acceptance predicate, not proof that an attacker cannot alter a same-user DACL. The protection root, Local State, profile metadata, lookalikes/siblings and other network/profile paths do not gain a capability exception.

`profile.js` retains its fixed PowerShell executable, encoded bundled script, enumerated arguments, minimal environment, 8,192-byte output cap and 10-second timeout. The revised script still fits the Windows command-line budget. No renderer command, new IPC, configurable executable or general-purpose execution method is exposed.

This walk is not an atomic namespace snapshot. Same-user concurrent changes, post-admission changes, unsigned package replacement, compromised native code, forensic erasure and power-loss durability are outside the claimed protection. No handle-based race-proof custody architecture is introduced.

## Historical results retained

At draft 4: six transferred source hashes matched; `yarn test:a1` reported 29 passed, 0 failed, 0 cancelled/skipped/todo. Its 57 synthetic ACL and 13 mocked firewall cases are coverage within the 29 tests, not 70 extra independent tests. Separate testnet/regtest packages each passed first-start, normal-close and reopen smoke, including actual fuse checks and selected negative launches/NODE_OPTIONS canary. **Do not rerun `packaged-smoke.js` for those historical results.**

Recorded build environment: Node v24.19.0, Electron 44.3.0; smoke reports embedded Node 24.20.0, Chromium 152.0.7977.78, ABI 149. The installed-file/source-test launch screenshot reports Yarn 1.22.22. Separate native-probe success is recorded in the chronological receipt; a standalone raw probe output/loaded-binary hash record has not been located in the supplied A1 packet. Do not convert that receipt into packaged native/provider/durability evidence.

Historical unsigned executable SHA-256 (both packages): `f6cea4fa9e786d105d0d44b24326eb8b9381cf04103e9022a7805bf131bcea09`.
Testnet archive: `21d878dae495a9b3529fc51db187f18ec83f33818a876bb37d84c8389ecf96b9`.
Regtest archive: `7477ea938123aaa1a48f0468127eacc02201588e163e02709b69fe56252ceeda`.
These belong to draft 4, **not this repair**. A later copy is not authenticated merely by reproducing a manifest beside it.

## Execution boundary and preservation

Only the owner operates the guest under this handoff. No host install/build/test/app command or VM configuration/reset/start/stop is authorized to the Builder. A fresh disposable guest state or explicit non-destructive case arrangement must be supplied by the owner. Preserve all earlier packages, profiles, locks, Local State, source archives and raw evidence. Neither these instructions nor a failing test grants permission to remove an occupied path or repair its permissions. New negative fixtures also remain evidence. Do not run in the existing successful/failed draft 4 profiles.

Require an isolated Windows x64 guest with standard disposable account, NTFS, no real wallet/credential/personal data, no shared clipboard/drag-and-drop/USB/sensitive mounts, no NIC/public route, existing outbound-denial policy, and the fixed `C:\FinneyA1Lab` layout. Do not introduce a NIC, host share, public endpoint or outbound allowance for observer controls. Record actual settings before/during/after the new interval. A self-written approval record or startup status is not proof.

Freeze source before transfer/execution. Transfer only the pinned source and approved evidence/tools using the owner's established offline method. Verify the branch/commit, clean tracked state, every manifest file hash and locked toolchain. The new `observe-boundary-case.ps1` requires a real Git checkout with matching HEAD; do not invent a commit in a copied directory. Obtain a local bundle from the owner if necessary. Hash transfers on both sides. Record missing prerequisites rather than installing/fetching/reconfiguring automatically.

Use one independent preserved case state per adverse fixture; prepare administrative-only ACL/owner fixtures separately and **launch the application as the standard lab account**. Never elevate the app or grant extra rights to make it start. The fixture's expected refusal must not be masked by another stale lock, invalid ancestor, wrong executable or failed isolation prerequisite. Positive controls precede adversarial alteration; record both identities. If this cannot be established, mark the case BLOCKED, not passed.

## Guest source checks and builds (prepared, not run)

After independent isolation verification and a fresh approved source/state arrangement, from guest PowerShell:

```powershell
Set-Location -LiteralPath 'C:\FinneyA1Lab\source'
git branch --show-current
git rev-parse HEAD
git status --short
node --version
yarn --version
$PSVersionTable
node --test experimental/a1/test/guards.test.js experimental/a1/test/boundary-tree.test.js
```

Save full stdout/stderr, command, UTC times and exit code to a new evidence directory. No automatic retry. Expected registration is 31 Node tests (29 existing, two new); actual pass/fail/skip totals must come from the runner. The ACL wrapper now specifies 112 synthetic cases, the traversal wrapper 12 synthetic I/O-fault cases, and the real-filesystem wrapper 14 retained cases. None of these expected counts is an executed result. The real owner-mismatch case changes the expected SID, not on-disk ownership: it does **not** replace the actual depth-two wrong-owner packaged case. The junction fixture's unchanged content is not evidence of no reads; use an independent file-access observer in the packaged campaign.

The A1 guest prerequisite inspects testnet/client-a before registering tests. An unsafe existing fixture can stop the runner before any tests; record this as prerequisite failure, not a failing behavioral assertion. The new traversal fixture creates a unique `fixtures\a1-tree-*` root and retains it; do not manually delete it after a failure. Existing guard unit fixtures keep their original cleanup behavior inside their newly allocated directories; they never target old package fixtures.

Build each changed candidate once in fresh, unoccupied `dist\a1\<network>` paths using the unchanged locked environment:

```powershell
yarn build:a1:regtest
yarn build:a1:testnet
```

Preserve exact output/exit code and `package-hashes.json`. Do not rerun historical smoke. The **new focused positive case** is necessary because recursive inspection now reaches previously unchecked Chromium descendants. On a fresh reserved client-b create/normal-close, inventory nested directories and inherited ACEs, then ordinary open/normal-close the same new candidate once per configuration. Require readiness, normal exit, unchanged profile/protection-key fingerprints and no lock afterwards. Do not print proof/key bytes. This qualifies changed-path compatibility, not a repeat claim for draft 4 or broad custody recovery.

Before either package launch, inspect `app.asar` read-only with the already locked local ASAR tooling (no `npx` downloads). Record its complete entry list; only app files and configuration may be present. Extract to a **new evidence directory**, hash every entry, compare app bytes with the frozen source and `configuration.json` with the selected fixed JSON. Inspect entry package/main, sandbox preferences, CSP, absence of preload/IPC/wallet/LevelDB and fuse wire in the actual executable. The application must not gain a testing bridge. A source checkout or `package-hashes.json` alone cannot establish archive contents. If local archive tooling is missing, record the blocker; do not fetch a replacement.

Prepared guest commands for that inspection (repeat with the other fixed network, new output):

```powershell
$network = 'xec-regtest'
$archive = "C:\FinneyA1Lab\source\dist\a1\$network\package\win-unpacked\resources\app.asar"
$inspection = Join-Path 'C:\FinneyA1Lab\evidence' ('archive-' + $network + '-' + [guid]::NewGuid().ToString('N'))
if (Test-Path -LiteralPath $inspection) { throw 'EVIDENCE_ALREADY_EXISTS' }
$asarRoot = (Resolve-Path -LiteralPath '.\node_modules\asar').Path
$asarInfo = Get-Content -Raw -LiteralPath (Join-Path $asarRoot 'package.json') | ConvertFrom-Json
if ($asarInfo.version -ne '3.1.0') { throw 'UNEXPECTED_ARCHIVE_TOOL' }
$bin = if ($asarInfo.bin -is [string]) { $asarInfo.bin } else { $asarInfo.bin.asar }
$asarCli = [IO.Path]::GetFullPath((Join-Path $asarRoot $bin))
if (-not $asarCli.StartsWith($asarRoot + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'INVALID_TOOL_PATH' }
$null = New-Item -ItemType Directory -Path $inspection
Get-FileHash -Algorithm SHA256 -LiteralPath $archive, $asarCli | ConvertTo-Json | Set-Content "$inspection\inputs.json"
node $asarCli list $archive > "$inspection\entries.txt" 2> "$inspection\list-errors.txt"
if ($LASTEXITCODE -ne 0) { throw 'ARCHIVE_LIST_FAILED' }
```

Before extraction, inspect the listing for unexpected entries/links/traversal, and stop on any discrepancy. For the expected eight root app files plus `configuration.json` only, continue:

```powershell
$expected = @(Get-ChildItem -File -LiteralPath 'C:\FinneyA1Lab\source\experimental\a1\app' | ForEach-Object Name) + 'configuration.json'
$listed = @(Get-Content "$inspection\entries.txt" | ForEach-Object { $_.TrimStart([char[]]@('/', '\')) })
if (Compare-Object ($expected | Sort-Object) ($listed | Sort-Object)) { throw 'UNEXPECTED_ARCHIVE_ENTRIES' }
node $asarCli extract $archive "$inspection\contents" > "$inspection\extract.txt" 2> "$inspection\extract-errors.txt"
if ($LASTEXITCODE -ne 0) { throw 'ARCHIVE_EXTRACT_FAILED' }
$comparisons = foreach ($name in $expected) {
  $reference = if ($name -eq 'configuration.json') { "experimental\a1\config\$network.json" } else { "experimental\a1\app\$name" }
  $observed = (Get-FileHash -Algorithm SHA256 -LiteralPath (Join-Path "$inspection\contents" $name)).Hash
  $wanted = (Get-FileHash -Algorithm SHA256 -LiteralPath $reference).Hash
  [pscustomobject]@{ name = $name; sha256 = $observed; expected = $wanted; matches = ($observed -eq $wanted) }
}
$comparisons | ConvertTo-Json | Set-Content "$inspection\entry-hashes.json"
if (@($comparisons | Where-Object matches -ne $true).Count) { throw 'ARCHIVE_CONTENT_MISMATCH' }
```

This is a prepared tool invocation, not an executed archive inspection. Record the tool's own hash/version. No package bytes or manifests are modified. Unexpected linked/unpacked entries are a blocker, never silently flattened into the expected set.

## Actual package observer

`experimental/a1/test/observe-boundary-case.ps1` is an external guest-only test utility, **not packaged**. It checks source/executable/archive identity and owner-operated prerequisites, launches one case, writes independent stdout/stderr and a result record, and never changes fixture state or force-terminates the app. It deliberately does not pre-run the source boundary inspector against an unsafe fixture; the package must encounter it. For ready cases the owner closes the visible window normally within 60 seconds. Timeout is failure and requires the owner to close it; no reset is performed.

Example after inserting actual frozen/build identities, not historical hashes:

```powershell
$sourceCommit = '<frozen repair SHA from manifest>'
$exeHash = '<actual new executable SHA256>'
$asarHash = '<actual new configuration archive SHA256>'
powershell.exe -NoLogo -NoProfile -NonInteractive -File experimental\a1\test\observe-boundary-case.ps1 -Network xec-regtest -CaseId PATH-OWNER -SourceCommit $sourceCommit -ExecutableHash $exeHash -ArchiveHash $asarHash -Expected refuse -ExpectedError BOUNDARY_UNVERIFIED
```

Use `-Expected ready -CreateProfile` for a reserved empty positive fixture; ordinary reopen omits `-CreateProfile`. The default selected profile is client-b. All raw files go under a new `C:\FinneyA1Lab\evidence\<CaseId>-<unique-id>` directory. The observer does not prove file preservation or egress by itself. Attach independent pre/post inventory, ACL/owner records, canary hashes, file-access traces and process/connection evidence to that case. Do not put any generated binaries or runtime state in Git.

## Case plan

Every row in [BOUNDARY_CASES.json](BOUNDARY_CASES.json) is UNEXECUTED and specifies identity, prerequisites, fixture/attempt, oracle, control, raw evidence and preservation. Each listed variant is separately recorded; group labels are not extra passes. Stop a case on unexpected readiness, destination, subprocess, changed canary or preservation failure. Do not fix the fixture and relabel the same run passed.

Real depth-two wrong-owner preparation, in a **separately approved guest fixture preparation session only**: select the exact new case's `...\Cache\one\two\data.fixture`, verify every parent is ordinary and lab-contained, capture owner/SDDL/hash, and use `icacls <exact-target> /setowner *S-1-5-18` with administrative fixture authority. Return to the standard lab account for launch. Preserve the changed descriptor. Never run this against host paths, historical profiles or the whole lab recursively.

Other real ACL fixtures: on the exact new nested file, add Everyone Read (foreign Allow), the pinned capability FullControl (excess rights), or explicit capability Modify (forbidden descendant grant), one per preserved case. For allowed inheritance, use the actual pinned anchor self grant and raw `OICIIO/0xE0010000` ACE before creating children; read back both generic carrier and mapped effective inherited entries. For denied enumeration add a current-owner `ListDirectory` Deny on a depth-two directory while retaining owner Modify Allow; for metadata denial record an actual `Get-Acl` access failure as the standard account (e.g. a narrowly prepared OWNER RIGHTS/READ_CONTROL denial). If Windows still permits the read, that fixture is invalid and must not be called a metadata-failure pass. No production policy exception is added for these tests.

For a nested junction use an exact lab-created link at depth two pointing to a separate synthetic canary tree. Observe the application and its inspector process with a guest file-access trace. Assert rejection before the link is enumerated/target touched. Reading the target by the **operator** before/after is a separately marked control, never an app access. Include a broken-target junction and, if supported under separately authorized preparation, a file reparse point. No new host mount is needed or allowed.

Resource cases must use finite fixtures: depth 33, 4,097 enumerated entries, and a controlled guest I/O delay that crosses the six-second scan or ten-second process timeout. The 14-case extracted test intentionally lowers budgets for cheap coverage; it does not demonstrate the production limits. If actual delay cannot be induced without broad OS changes, keep that package case unexecuted. Do not fill the disk or change system-wide quotas as an implicit test step.

## Isolation, observer controls and inaccessible routes

Capture account/token/groups, Windows build, filesystem, interfaces/routes, mounted drives/volumes, SMB mappings and hypervisor NIC/shared-folder/clipboard/drag-and-drop/USB settings before, during and after. Inventory lab data and verify no host production/profile/credential paths are mounted; use fresh synthetic host-path canaries and distinct guest controls, not real personal paths or a real wallet. Read-only settings collected after the run qualify only that observation time. Any missing interval is a limitation.

Guest commands for raw inventory include `whoami /all`, `Get-CimInstance Win32_OperatingSystem`, `Get-Volume`, `Get-PSDrive -PSProvider FileSystem`, `Get-SmbMapping`, `Get-NetAdapter -IncludeHidden`, `Get-NetIPConfiguration -All`, `Get-NetRoute`, `Get-NetFirewallProfile -PolicyStore ActiveStore` and `Get-NetFirewallRule -PolicyStore ActiveStore`. They do not themselves measure denial. Owner obtains hypervisor settings read-only from the host before/during/after; no VM change is requested. Do not dump real credentials, browser stores or key material as proof of exclusion.

Use an already available guest WFP/ETW or packet observer plus process/file observation. Bind timestamps, executable hash and PID/process tree to each attempt. Keep external NICs absent and deny policy unchanged. A finite non-package loopback socket control, or a denied attempt to a documentation address (`192.0.2.1`) while no interface/route exists, may establish observer coverage **only if its attempt and expected allow/drop/no-route result are independently visible**. It is an observer control, not packaged egress evidence. If WFP auditing or the capture provider is unavailable, request a bounded owner setup rather than quietly enabling networking or relaxing rules. No silence-only pass.

For the exact package use applicable drag/drop/OS-open/pre-main stimuli, correlate observed input/dispatch with file/process/connection observations, and report the actual dispatch point. The static shell has no application JS, links, preload, IPC or enabled DevTools. Consequently a requested `fetch`, WebSocket, DNS, `ipcRenderer`, native or subprocess API **cannot simply be called from its UI**. Inspect the actual archive, preferences and denied debug surfaces to establish that absence. An unreachable API is `NOT EXPOSED — CONTENTS/CONFIGURATION EVIDENCE`, not `EXECUTED REFUSAL` and not a fabricated connection attempt. Test direct guard invocations only in a separately identified unpackaged/instrumented fixture; retain that label. Do not enable JS, Node, preload, debug, remote module, disable fuses/sandbox or add a production callback to manufacture package coverage. Any demanded dynamic route that is not reachable stays an explicit review limitation until the owner routes its assessment.

Prepare missing pre-main variants separately: `--inspect=127.0.0.1:9229`, `--inspect-brk=127.0.0.1:9229`, `--remote-debugging-port=9222`, `--remote-debugging-pipe`, `--js-flags=...`, `--load-extension=<nonsecret empty fixture>`, `--user-data-dir=<nonsecret foreign canary>`, and a synthetic `NODE_PATH` module canary. Record full literal argv/environment names and only synthetic values, actual exit/error, absence of readiness, debugger listeners/child processes and canary changes. Use the pinned executable directly with redirected output; the generic observer intentionally does not accept arbitrary flags. The old NODE_OPTIONS/fuse smoke remains historical; new checks cover additional variants and the repair package identity, not a repeat smoke suite.

Provider failure cases use nonsecret markers only. A valid-base64 invalid encrypted proof must reach actual packaged decryption and refuse (`PROFILE_LOCKED`), preserving the record. Foreign account material can test DPAPI binding only after all preceding owner/header checks are deliberately valid in a synthetic fixture; an earlier `FOREIGN_PROFILE` refusal is not DPAPI evidence. `PROTECTION_UNAVAILABLE` must come from a real provider-unavailable environment, not a mocked boolean or malformed config. That case remains blocked if no narrowly controlled guest setup can demonstrate it. Do not alter account protection or provider behavior on the host. The shell has no LevelDB dependency; the separate native probe's loaded `.node` identities/error propagation belong to a distinct environment record, not app.asar qualification.

## Current acceptance ledger and stop

| Requirement | Implemented / historical evidence | New result / remaining evidence |
|---|---|---|
| A1-01 OS/data | Existing fixed namespace, SID/ACL/firewall checks; later hypervisor settings receipt | Recursive enforcement prepared; actual interval isolation/canary/egress evidence UNEXECUTED; not independently verified |
| A1-02 guarded startup | Draft 4 two-configuration close/reopen and duplicate refusal historically passed | Descendant compatibility, real wrong-owner/ACL/reparse/metadata/enumeration/resource failures and exact package refusals UNEXECUTED |
| A1-03 network lock | Fixed config and inactive routes unchanged; synthetic/mocked source coverage historically passed | Effective packaged egress and additional pre-main case evidence UNEXECUTED; inaccessible APIs separately scoped |
| A1-04 capability closure | No ordinary bridge/Node/wallet; sandbox preferences historically reported | Actual archive/capability/hostile-input assessment at new hashes UNEXECUTED; no dynamic refusal claim for absent APIs |
| A1-05 runtime/backend | Historical builds/safeStorage reopen; separate native-probe receipt | Current package/provider failures and raw native loaded-binary record missing; no backend added to shell |
| A1-06 regressions/evidence | Historical 29/0 and two targeted smoke passes retained | New 31-test registration, fixtures, builds and package identity UNEXECUTED; safe baseline logs not located in supplied A1 evidence; no unrelated repairs |

Attach available historical evidence first. Request already-produced raw native and safe baseline logs from the owner before scheduling missing runs. If no such logs exist, baseline `check:runtime`, `audit:static`, `test:core`, `test:unit:ci` need individual guest effect review/authorization and a pinned untouched baseline; the core aggregate includes a loopback relay/synthetic keys. They are not automatically part of this focused invocation and may not run on the host. Do not infer a pre-remediation failure from an absent log.

All newly prepared cases remain unexecuted; no findings are independently closed. Required next review is targeted independent Security at the frozen source and actual package hashes, with an explicit owner-routed input/exposure disclosure. Historical report/adjudication rationale is excluded from the neutral packet. No automatic new Architecture/Cryptography cycle, Gate passage or further development follows this source delivery.
