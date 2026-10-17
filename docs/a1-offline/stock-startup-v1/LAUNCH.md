# STOCK-A1 launch specification — tooling contract version 2

Stage I authoring under DEC-026, with the DEC-029 STAGING-01 provenance correction. New validation is UNEXECUTED; source delivery stops for exact OM identity binding before guest work. See [separate provenance and current scope](STAGING.md). This is a qualification harness, not an application security boundary or a qualified package.

## Authority and subject

Approved requirement: A1-STOCK-STARTUP-1, exact block in the 2026-10-16 owner-selected proposal, SHA-256 ec6524ebdc4be39279ba356e23020a8d7e45d0d06dcad878c48bb8cbf40a3fb6. DEC-025 selects D1=D/STOCK-A1 and D2=B; D3=A remains selected. DEC-026 authorizes source authoring only. The package-source baseline is a0e5890e612c81fda4d2698f78dbe4b81fba3e0d; production baseline b61c888bbbdae632541c41c7f829a9ed13ad77b2 is separate. See [coverage](COVERAGE.md) and [cases](CASE_MATRIX.json).

The operator, administration, startup preparation and package integrity are trusted. This is the inactive nonsecret offline Windows A1 lab only. No wallet, keys, messaging, signing, publication, import, recovery, public testnet or production use. Hostile arbitrary direct startup is excluded; an optional helper is bypassable. Direct execution with the same qualified inputs remains covered.

## Public grammar

The canonical public argument list is exactly one --profile=client-a or --profile=client-b, optionally followed by one --create-profile. No duplicate, extra argument, response file, URL, network selector, native role, debugger, extension, alternate data path or caller-selected cwd/handle is admitted.

Example future command, not permission to execute:

    "C:\FinneyA1Lab\source\dist\a1\xec-regtest\package\win-unpacked\FinneyA1.exe" --profile=client-b

Creation adds --create-profile. A second fixed package lives under xec-testnet instead of xec-regtest. These are source-declared paths, not measured existing packages. Exact inventory/hash binding precedes use; copied/renamed candidates need their own recorded path and unchanged relative assets.

Network is fixed by the package configuration: version 1, stage A1, network xec-testnet or xec-regtest, endpointPolicy deny-all-v1, activation false, and null indexer/relay/registry/broadcast. The configuration hash in a qualification manifest must come from inspecting the identified ASAR; a declared hash is not a measured configuration.

Working directory is C:\FinneyA1Lab. Selected profile is C:\FinneyA1Lab\profiles\<network>\<profile>; protection is C:\FinneyA1Lab\runtime\a1-userdata-<network>-<profile>. No discovery of older profiles, repair, migration or reset is supported.

## Environment and process inputs

Create a new Unicode environment block, never inherit-and-filter. The initial browser recipe contains only SystemRoot=C:\Windows, WINDIR=C:\Windows, and TEMP/TMP equal to the selected protection directory. Confirm this Windows installation before execution. No PATH, COMSPEC, APPDATA, LOCALAPPDATA, USERPROFILE or other convenience variables are added. If required, stop on the precise dependency instead of inventing a fallback.

Protection must exist and be valid for reopen. For explicit creation it must remain absent until the application's checked lifecycle creates it. The harness does not create it to satisfy TEMP. An early native write, outside fallback or failure caused by the absent temporary directory blocks qualification.

The ordinary environment excludes FINNEY_, ELECTRON_, NODE_, CHROME_ and CHROMIUM_ prefixes case-insensitively. Duplicate case-insensitive names are rejected. Empty differs from absent. Only named finite D2 fixtures add one exceptional variable; they do not create an arbitrary forwarding interface.

The standard, non-elevated lab account launches the candidate. Record parent SID/groups/session and observed administrator-role membership; elevation, integrity, privileges and the actual child's token require independent evidence. Do not infer them from the account label.

The authored native helper uses CreateProcessW with CREATE_UNICODE_ENVIRONMENT and EXTENDED_STARTUPINFO_PRESENT. STARTUPINFOEX limits inheritance to NUL stdin and two anonymous write-pipe handles. The literal UTF-16LE command line, terminating NUL and double-NUL-terminated environment block are retained with SHA-256 before creation. Record the submitted API values separately from independently corroborated actual process inputs. The environment is sorted case-insensitively; supplied spelling is preserved. No shell performs candidate argument expansion.

The helper does not confer unbypassable authority. The unchanged helper compiled but was not invoked during f21755a guest validation; the revised delivery is unexecuted. Independent original-input/token/handle evidence remains necessary. Only the fixed boundary helper's existing three-variable environment is source-established; its temporary behavior is unmeasured.

## Roles and effects

Finite normal candidates: browser, static sandboxed renderer, GPU if needed, individually identified required Chromium utility/network-service roles, and the fixed boundary PowerShell helper. Record actual native argv, handles, loaded dependencies and lineage. A parent PID or role string alone is not authority. Crashpad, relauncher, Node utility service or any newly found shipped entry needs a specific disposition; a genuinely required ordinary child is not excluded merely to avoid qualifying it.

The fixed helper is C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe with -NoLogo -NoProfile -NonInteractive -EncodedCommand carrying the exact packaged boundary script and validated network/profile, cwd C:\Windows\System32, SystemRoot/WINDIR and the fixed system PSModulePath. Existing limits are 10 seconds and 8192 output bytes. No helper changes are made here.

Permitted effects retain the approved categories: identified package/required runtime loading, necessary dependency/configuration metadata inspection, qualified processes/threads/non-debug IPC, bounded nonsecret output; after applicable checks, marker/lock lifecycle and nonsecret runtime state only in selected profile/protection namespaces. Preferences, caches and temporary files belong only in protection.

OS-maintained timestamps/journals/auditing/paging/prefetch and separately attributed launcher/observer output retain their explicit allowance. They can expose paths/timing; no forensic erasure is promised. Application-originated foreign reads/writes/directories are not excepted for being empty, transient, subsequently removed or described as routine.

All candidate/descendant outbound requests remain forbidden, with independent deny-by-default egress enforcement. Debug listeners and pipes need separate evidence. Sandbox/context isolation, no renderer Node, no privileged ordinary IPC, fixed network, owner/ACL/reparse admission, exclusive use and typed refusal remain unchanged.

## Dispatcher inputs and output

The future dispatcher accepts only CaseId, Network, Profile, AuthorizationPath and the independently routed AuthorizationSha256. It requires the clean frozen package-source checkout, separately pinned version-2 staged tooling, an unexpired case-bound Stage II approval and cumulative attempt ledger, verified package/fixture manifests and current independent observer readiness. See [STAGING.md](STAGING.md) for the exact export/root/approval contract and current S02-only scope. A supplied approval is a trusted operational prerequisite, not proof of isolation and not an authorization generated by this harness.

[dispatch-input.schema.json](../../../experimental/a1/test/stock-startup-v1/dispatch-input.schema.json) defines the owner authorization envelope. No populated authorization or runtime fixture is supplied.

Referenced package manifest version 1 requires packageSource, requirementHash, network, root, executable leaf name, executableSha256, archiveSha256, configurationSha256 and files [{relative, sha256}]. The dispatcher hashes every listed file and rejects extras, duplicates, traversal and reparse entries; maximum 4096 entries. Record actual loaded OS/native modules separately. Inventory and runtime measurement are not interchangeable. Observe package mutation/identity through the interval; these checks do not make package bytes immutable.

Fixture manifest requires id (32 lowercase hexadecimal characters), runId, network, profile, ownerSid and state VALID or ABSENT. VALID requires profileFiles, protectionFiles and a cleanControlReference; independent validity evidence must bind the reference, including the protected provider state. Merely matching marker bytes is not proof of a usable profile. ABSENT does not permit reset. Synthetic module/certificate fields supply exact hashes where those cases require them; valid/readable targets and sensitivity controls remain external prerequisites.

Observer readiness requires matching runId/caseId/network/profile/executable hash, capturing, controlsReady, isolationReady, noCandidateRunning and expiry. It is a preparation record; actual interval evidence must establish these properties. No observer is installed/started by this dispatcher.

One invocation handles one authorized case; no campaign or retry loop. Evidence is new-only under C:\FinneyA1Lab\evidence\stock-startup-v2-<runId>. Occupied run IDs refuse. The current dispatcher only admits the bounded S02 reopen; other matrix rows remain definitions and classification coverage, not current dispatch permission.

Native stdout/stderr capture retains at most 1 MiB per stream and counts overflow. Overflow preserves the bounded raw prefix and marks the capture incomplete; discarded excess cannot support absence claims. Startup/refusal deadline is 60 seconds; a readiness event triggers a normal WM_CLOSE request to the exact live PID/window, with 10 seconds for close and 10 seconds for pipe drain. The wrapper never kills a process, deletes a fixture or infers descendant completion. A timeout/live process requires a separately authorized operator action and leaves the result unqualified. Launcher shutdown may affect pipe lifetime; do not interpret that as normal application closure.

No app/package invocation, helper compilation, synthetic fixture, certificate or observation was performed during Stage I. Future invocation compiles NativeLaunch.cs using the installed Windows facility; that compile and its separately attributed temporary artifacts need Stage II permission and observation. No Electron/custom-runtime build or dependency download is introduced.
