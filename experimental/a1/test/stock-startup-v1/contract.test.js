const { test } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('crypto')
const { classify, REQUIRED } = require('./classify')
const { PACKAGE_SOURCE, REQUIREMENT_HASH, CASE_MATRIX_SHA256, publicArguments, validatePublicArguments,
  validateEnvironment, encodeEnvironment, commandLine, bytesRecord, checkBytes, caseFor, paths } = require('./contract')

const digest = value => crypto.createHash('sha256').update(value).digest('hex')
const clone = value => JSON.parse(JSON.stringify(value))

function fixture(caseId = 'S03-UPPER') {
  const selected = caseFor(caseId)
  const fixtureId = '3'.repeat(32)
  const fixtureRoot = 'C:\\FinneyA1Lab\\fixtures\\stock-startup-v1\\' + fixtureId
  const values = { $moduleDirectory: fixtureRoot + '\\modules',
    $requireOption: '--require="' + fixtureRoot + '\\injection.cjs"', $certificate: fixtureRoot + '\\certificate.pem' }
  const environment = [
    { name: 'SystemRoot', value: 'C:\\Windows' }, { name: 'WINDIR', value: 'C:\\Windows' },
    { name: 'TEMP', value: paths('xec-regtest', 'client-b').protection },
    { name: 'TMP', value: paths('xec-regtest', 'client-b').protection },
  ]
  const exception = selected.environment ? { name: selected.environment.name,
    value: Object.hasOwn(values, selected.environment.value) ? values[selected.environment.value] : selected.environment.value } : null
  if (exception) environment.push(exception)
  const identity = { packageSource: PACKAGE_SOURCE, requirementHash: REQUIREMENT_HASH,
    toolingCommit: '1'.repeat(40), executableSha256: digest('synthetic executable'),
    archiveSha256: digest('synthetic archive'), configurationSha256: digest('synthetic config'),
    inventorySha256: digest('synthetic inventory') }
  const launch = {
    executable: 'C:\\FinneyA1Lab\\candidate.exe',
    commandLine: bytesRecord(Buffer.from('"C:\\FinneyA1Lab\\candidate.exe" "--profile=client-b"\0', 'utf16le')),
    environment: bytesRecord(encodeEnvironment(environment, exception)),
  }
  const record = {
    version: 2, caseId, runId: '2'.repeat(32), network: 'xec-regtest', profile: 'client-b',
    authorizationSha256: digest('synthetic authorization'),
    execution: 'LAUNCHED', identity, launch, fixture: { status: 'VALID', id: fixtureId },
    wrapper: { pid: 1234, creationTime: '134000000000000000', exitCode: 1, ready: false,
      readyBindingValid: false, stderr: 'ENVIRONMENT_OVERRIDE_DENIED\n', timeout: false,
      outputOverflow: false, drainComplete: true, forcedTermination: false },
    kernel: { pid: 1234, creationTime: '134000000000000000', exitCode: 1 },
    observation: { forbiddenEffects: [], startedBeforeCreation: true, descendantsExited: true,
      drained: true, loss: 0, unattributedRelevantEvents: 0, clockChangeResolved: true,
      suppressionEstablished: false, attestations: [] },
  }
  record.provenance = { version: 2, packageSourceHead: PACKAGE_SOURCE,
    packageSourceRoot: 'C:\\FinneyA1Lab\\source',
    toolingRoot: 'C:\\FinneyA1Lab\\evidence\\stock-tooling-v2-' + '4'.repeat(32) + '\\tooling',
    toolingCommit: identity.toolingCommit, commitEvidence: 'HOST_EXPORT_APPROVAL_NOT_GUEST_GIT',
    manifestSha256: digest('synthetic manifest'), deliverySha256: digest('synthetic delivery'),
    caseMatrixSha256: CASE_MATRIX_SHA256, authorizationSha256: record.authorizationSha256,
    runId: record.runId, caseId, network: record.network, profile: record.profile }
  record.observation.attestations = [...REQUIRED, 'no-injection-or-trust-change',
    'no-candidate-created', 'unsupported-route'].map(category => ({
    category, state: 'SUPPORTED', runId: record.runId, caseId, network: record.network,
    profile: record.profile, executableSha256: identity.executableSha256,
    commandLineSha256: launch.commandLine.sha256, environmentSha256: launch.environment.sha256,
    artifact: 'synthetic-unit-record-only', sha256: digest(category), hashChecked: true,
    assessor: 'independent-observer',
  }))
  return record
}

test('public recipe has only the two profile selectors and explicit creation', () => {
  for (const profile of ['client-a', 'client-b']) {
    for (const create of [false, true]) validatePublicArguments(publicArguments(profile, create))
  }
  for (const argv of [[], ['--profile=client-a', '--profile=client-b'], ['--profile=client-a', '--inspect'],
    ['--profile=client-a', '--user-data-dir=C:\\foreign'], ['--type=renderer'], ['--profile=client-c'],
    ['--create-profile', '--profile=client-a'], ['--profile=client-a', '--create-profile', '--create-profile']]) {
    assert.throws(() => validatePublicArguments(argv))
  }
})

test('ordinary environment never admits a prohibited prefix or unlisted variable', () => {
  for (const name of ['NODE_PATH', 'node_path', 'FINNEY_LIVE', 'electron_run_as_node',
    'NODE_OPTIONS', 'NODE_EXTRA_CA_CERTS', 'CHROME_LOG_FILE', 'chromium_log']) {
    assert.throws(() => validateEnvironment([{ name, value: '' }]))
  }
  assert.throws(() => validateEnvironment([{ name: 'PATH', value: 'C:\\foreign' }]))
  assert.throws(() => validateEnvironment([{ name: 'CHROME_LOG_FILE', value: '' }],
    { name: 'CHROME_LOG_FILE', value: '' }))
})

test('case-insensitive duplicates cannot erase an original environment value', () => {
  assert.throws(() => validateEnvironment([{ name: 'TEMP', value: 'one' }, { name: 'temp', value: 'two' }]))
})

test('absence, empty value and original spelling have different literal encodings', () => {
  const absent = encodeEnvironment([])
  const upper = encodeEnvironment([{ name: 'NODE_PATH', value: '' }], { name: 'NODE_PATH', value: '' })
  const lower = encodeEnvironment([{ name: 'node_path', value: '' }], { name: 'node_path', value: '' })
  assert.equal(absent.toString('hex'), '00000000')
  assert.equal(upper.toString('utf16le'), 'NODE_PATH=\0\0')
  assert.notDeepEqual(upper, absent)
  assert.notDeepEqual(upper, lower)
})

test('literal command capture preserves Unicode and quoting without shell interpretation', () => {
  const command = commandLine('C:\\FinneyA1Lab\\copy name\\é.exe', ['--profile=client-b'])
  assert.equal(command, '"C:\\FinneyA1Lab\\copy name\\é.exe" "--profile=client-b"')
  assert.throws(() => commandLine('C:\\bad\0.exe', []))
  const raw = bytesRecord(Buffer.from(command + '\0', 'utf16le'))
  assert.equal(checkBytes(raw), true)
  raw.base64 = Buffer.from(command + 'x\0', 'utf16le').toString('base64')
  assert.equal(checkBytes(raw), false)
})

test('an otherwise complete synthetic refusal remains unqualified, not independent acceptance', () => {
  const record = fixture()
  const before = clone(record)
  const result = classify(record)
  assert.equal(result.outcome, 'REFUSED')
  assert.equal(result.acceptance, 'UNQUALIFIED')
  assert.equal(result.independentVerification, 'NOT PERFORMED')
  assert.deepEqual(record, before)
})

test('null wrapper exit is preserved separately from kernel exit one', () => {
  const record = fixture()
  record.wrapper.exitCode = null
  const result = classify(record)
  assert.equal(result.outcome, 'INCONCLUSIVE')
  assert.equal(result.raw.exitCode, null)
  assert.equal(result.corroboration.exitCode, 1)
})

test('contradictory exits and PID reuse do not establish refusal', () => {
  for (const change of [
    record => { record.kernel.exitCode = 0 },
    record => { record.kernel.pid++ },
    record => { record.kernel.creationTime = '134000000000000001' },
  ]) {
    const record = fixture()
    change(record)
    assert.equal(classify(record).outcome, 'INCONCLUSIVE')
  }
})

test('missing-profile and boundary errors never substitute for environment refusal', () => {
  for (const error of ['PROFILE_MISSING', 'BOUNDARY_UNVERIFIED', 'ENVIRONMENT_OVERRIDE_DENIED\nPROFILE_MISSING']) {
    const record = fixture()
    record.wrapper.stderr = error
    assert.equal(classify(record).outcome, 'INCONCLUSIVE')
  }
})

test('invalid and unverified fixtures remain distinct', () => {
  const record = fixture()
  record.fixture.status = 'INVALID'
  assert.equal(classify(record).outcome, 'INVALID FIXTURE')
  record.fixture.status = 'UNVERIFIED'
  assert.equal(classify(record).outcome, 'INCONCLUSIVE')
})

test('continuation for the three required-refusal names is a failure', () => {
  for (const caseId of ['S03-UPPER', 'S04-UPPER', 'S05-UPPER']) {
    const record = fixture(caseId)
    record.wrapper.exitCode = 0
    record.kernel.exitCode = 0
    record.wrapper.ready = true
    assert.equal(classify(record).outcome, 'FAIL')
  }
})

test('named suppression needs specific evidence beyond readiness and zero exit', () => {
  for (const caseId of ['S06-UPPER', 'S07-UPPER']) {
    const record = fixture(caseId)
    record.wrapper.exitCode = record.kernel.exitCode = 0
    record.wrapper.ready = record.wrapper.readyBindingValid = true
    record.wrapper.stderr = ''
    assert.equal(classify(record).outcome, 'INCONCLUSIVE')
    record.observation.suppressionEstablished = true
    assert.equal(classify(record).outcome, 'SUPPRESSED')
    record.observation.attestations = record.observation.attestations.filter(item => item.category !== 'no-injection-or-trust-change')
    assert.equal(classify(record).outcome, 'INCONCLUSIVE')
  }
})

test('a certificate read or transient forbidden effect cannot pass as suppression', () => {
  const record = fixture('S07-UPPER')
  record.observation.forbiddenEffects = ['supplied certificate file read']
  assert.equal(classify(record).outcome, 'FAIL')
})

test('every mandatory independent observation is necessary', () => {
  for (const category of REQUIRED) {
    const record = fixture()
    record.observation.attestations = record.observation.attestations.filter(item => item.category !== category)
    assert.equal(classify(record).outcome, 'INCONCLUSIVE', category)
  }
})

test('substituted, unchecked or duplicate evidence cannot qualify a result', () => {
  for (const change of [
    item => { item.runId = '3'.repeat(32) },
    item => { item.caseId = 'S04-UPPER' },
    item => { item.profile = 'client-a' },
    item => { item.network = 'xec-testnet' },
    item => { item.executableSha256 = digest('different executable') },
    item => { item.commandLineSha256 = digest('different command') },
    item => { item.environmentSha256 = digest('different environment') },
    item => { item.hashChecked = false },
    item => { item.assessor = 'application-status' },
  ]) {
    const record = fixture()
    change(record.observation.attestations[0])
    assert.equal(classify(record).outcome, 'INCONCLUSIVE')
  }
  const duplicate = fixture()
  duplicate.observation.attestations.push(clone(duplicate.observation.attestations[0]))
  assert.equal(classify(duplicate).outcome, 'INCONCLUSIVE')
})

test('a correctly hashed but wrong original input does not qualify the named case', () => {
  const record = fixture('S06-UPPER')
  record.launch.environment = bytesRecord(Buffer.from('NODE_PATH=wrong\0\0', 'utf16le'))
  for (const attestation of record.observation.attestations) {
    attestation.environmentSha256 = record.launch.environment.sha256
  }
  assert.equal(classify(record).outcome, 'INCONCLUSIVE')
})

test('loss, missing control, unresolved clock change and late descendants block qualification', () => {
  for (const [field, value] of [['loss', 1], ['unattributedRelevantEvents', 1],
    ['startedBeforeCreation', false], ['clockChangeResolved', false], ['descendantsExited', false], ['drained', false]]) {
    const record = fixture()
    record.observation[field] = value
    assert.equal(classify(record).outcome, 'INCONCLUSIVE', field)
  }
})

test('timeout, overflow, failed drain and forced termination cannot become success', () => {
  for (const [field, value] of [['timeout', true], ['outputOverflow', true],
    ['drainComplete', false], ['forcedTermination', true]]) {
    const record = fixture()
    record.wrapper[field] = value
    assert.equal(classify(record).outcome, 'INCONCLUSIVE')
  }
})

test('package, requirement and harness identities cannot be conflated or absent', () => {
  for (const key of Object.keys(fixture().identity)) {
    const record = fixture()
    delete record.identity[key]
    assert.equal(classify(record).outcome, 'INCONCLUSIVE', key)
  }
  const record = fixture()
  record.identity.packageSource = record.identity.toolingCommit
  assert.equal(classify(record).outcome, 'INCONCLUSIVE')
})

test('preparation denial requires no candidate and separate observation', () => {
  const record = fixture('S01-NODE-PATH')
  record.execution = 'NOT LAUNCHED'
  record.preparationRejected = true
  record.wrapper.pid = null
  assert.equal(classify(record).outcome, 'NOT LAUNCHED')
  record.execution = 'LAUNCHED'
  assert.equal(classify(record).outcome, 'FAIL')
})

test('excluded, unsupported and unexecuted do not mean prevented or accepted', () => {
  const excluded = fixture('X-INSPECTOR')
  excluded.execution = 'NOT LAUNCHED'
  assert.equal(classify(excluded).outcome, 'EXCLUDED')
  const pending = fixture()
  pending.execution = 'UNEXECUTED'
  assert.equal(classify(pending).outcome, 'UNEXECUTED')
  const unsupported = fixture()
  unsupported.execution = 'NOT LAUNCHED'
  unsupported.unsupported = true
  assert.equal(classify(unsupported).outcome, 'UNSUPPORTED')
  unsupported.observation.attestations = []
  assert.equal(classify(unsupported).outcome, 'INCONCLUSIVE')
})

test('renaming is not a process-name exemption and readiness must bind the selected profile', () => {
  const record = fixture('S09-RENAME')
  record.wrapper.exitCode = record.kernel.exitCode = 0
  record.wrapper.ready = true
  record.wrapper.readyBindingValid = false
  assert.equal(classify(record).outcome, 'INCONCLUSIVE')
  record.wrapper.readyBindingValid = true
  assert.equal(classify(record).outcome, 'ORDINARY SUCCESS')
})

test('malformed observation collections and unknown record versions fail explicitly', () => {
  assert.equal(classify(null).outcome, 'INCONCLUSIVE')
  const record = fixture()
  record.observation.attestations = {}
  assert.equal(classify(record).outcome, 'INCONCLUSIVE')
  record.version = 9
  assert.equal(classify(record).outcome, 'INCONCLUSIVE')
})

test('old results remain historical and missing or substituted staged provenance cannot qualify', () => {
  const old = fixture()
  old.version = 1
  assert.equal(classify(old).outcome, 'INCONCLUSIVE')
  for (const key of Object.keys(fixture().provenance)) {
    const record = fixture()
    delete record.provenance[key]
    assert.equal(classify(record).outcome, 'INCONCLUSIVE', key)
  }
  for (const change of [
    record => { record.provenance.caseMatrixSha256 = digest('wrong matrix') },
    record => { record.provenance.toolingCommit = PACKAGE_SOURCE },
    record => { record.provenance.runId = '9'.repeat(32) },
    record => { record.provenance.authorizationSha256 = digest('different approval') },
  ]) {
    const record = fixture()
    change(record)
    assert.equal(classify(record).outcome, 'INCONCLUSIVE')
  }
})
