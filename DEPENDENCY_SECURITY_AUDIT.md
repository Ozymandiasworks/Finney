# Dependency security audit

Updated: 2026-09-12.

## Scope

This audit classifies the current manifests that produce Dependabot findings. It preserves the alpha.20 Node 16, Quasar 2.15 and Electron 20 runtime while remediation is performed in small compatibility groups.

## Classification

### Production and runtime

- The root `yarn.lock` supplies the desktop application's production dependencies. Direct DOMPurify, Axios and ws remediation was completed in PR #4 and passed `yarn test` and `yarn build`.
- Electron is declared as a development dependency but is a runtime security boundary because Electron Builder packages its binary with the application. The grouped Dependabot update from Electron 20.1.1 to 39.8.10 is not suitable for merge: its normal install rejects Node 16, and its build fails in the upgraded Quasar loader and Sass pipeline.
- `bitcore-lib-xec` is a local runtime dependency. Its declared runtime dependencies are resolved through the root `yarn.lock`; transaction construction, signing, address handling, stamps and messaging must not receive transitive upgrades without the core regression and package-build checks.

### Build and development only

- colord is used by Quasar's cssnano/PostCSS optimization path.
- SVGO is used by Quasar's PostCSS SVG optimization path.
- js-yaml is used by ESLint and Electron Builder build tooling.
- The three lockfile-only updates in this branch are therefore build-time remediation. They do not change packaged application source or runtime dependency declarations.

### Vendored bitcore-lib-xec

- `local_modules/bitcore-lib-xec/package-lock.json` is not read by the root Yarn install. It pins the vendored library's standalone test, coverage and browser-build toolchain, including historical development dependencies.
- Finney's production build uses the vendored library source and the dependencies resolved in the root `yarn.lock`. It does not install the vendored lockfile or its development dependencies.
- The vendored lockfile is a candidate for removal from the Finney application repository, but not in this change. Removing it would reduce duplicate development-only findings while also removing reproducible standalone vendored-library test installs. That source-integrity and maintenance decision needs a dedicated review.

### Separate Capacitor manifest

- `src-capacitor/yarn.lock` belongs to the separate Capacitor 2.4.4 mobile project and is not used by the Electron package build.
- Its findings must be remediated as a mobile compatibility project. They are not duplicates that can be fixed by changing the root lockfile.

### Duplicate findings

The root `yarn.lock`, vendored npm lockfile and Capacitor lockfile can each report the same transitive advisory independently. Dependabot alert totals therefore do not equal the number of distinct runtime paths. Each manifest needs its own reachability classification.

## Validated build-tool remediation

This branch contains only these root lockfile resolutions:

- colord 2.9.3 to 2.10.0
- js-yaml 4.1.0 to 4.3.2
- SVGO 2.8.0 to 2.8.4

Validation on Node 16.20.2, Quasar 2.15.1 and Electron 20.1.1:

- `yarn install --frozen-lockfile --force`
- `yarn test`
- `yarn build`

The complete core regression suite passed. Electron Builder produced the Windows installer and block map successfully. No application source, frozen transaction code, package manifest or production dependency declaration changed.

## Remediation order

1. Merge the validated three-package build-tool lockfile update as its own change.
2. Keep Electron 20 remediation separate. Define the supported Node and Electron target, repair the Quasar/Sass upgrade path, and then run core regressions, Electron package build, disposable application startup and two-client messaging checks before any merge.
3. Review the vendored `bitcore-lib-xec` lockfile separately. Retain it only if standalone vendored-library test reproducibility is a requirement; otherwise remove the unused historical lockfile after recording the source-integrity checks.
4. Upgrade the Capacitor project independently with mobile build and device validation.
5. Continue direct runtime remediation in small groups, prioritizing code reachable from message parsing, renderer boundaries, transaction handling and network input.

No broad dependency upgrade, Electron upgrade, Capacitor update or vendored runtime dependency change is included here.
