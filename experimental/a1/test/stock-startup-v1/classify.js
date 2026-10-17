const { PACKAGE_SOURCE, REQUIREMENT_HASH, CASE_MATRIX_SHA256, SHA1, SHA256, caseFor, checkBytes, matchesLaunch } = require('./contract')

const REQUIRED = Object.freeze(['actual-input', 'token-handles', 'package-inventory', 'fuses-config',
  'profile-validity', 'file-effects', 'process-tree', 'debug-listeners-pipes', 'outbound-attempts',
  'effective-isolation-egress', 'clock-correlation', 'observer-controls', 'exit-drain'])

function classify(record) {
  const result = (outcome, reasons, candidateOutcome = null, evidenceComplete = false) => ({
    version: 2, outcome, candidateOutcome, reasons, evidenceComplete,
    acceptance: 'UNQUALIFIED', independentVerification: 'NOT PERFORMED',
    raw: record && record.wrapper || null, corroboration: record && record.kernel || null,
  })
  if (!record || record.version !== 2) return result('INCONCLUSIVE', ['INVALID_RECORD_VERSION'])
  let selected
  try { selected = caseFor(record.caseId) } catch { return result('INCONCLUSIVE', ['UNKNOWN_CASE']) }
  if (record.execution === 'UNEXECUTED') return result('UNEXECUTED', ['NO_EXECUTION'])
  if (selected.kind === 'excluded' && record.execution === 'NOT LAUNCHED') {
    return result('EXCLUDED', ['OWNER_APPROVED_HOSTILE_STARTUP_EXCLUSION'])
  }
  const reasons = []
  const identity = record.identity || {}
  if (identity.packageSource !== PACKAGE_SOURCE || identity.requirementHash !== REQUIREMENT_HASH ||
    !SHA1.test(identity.toolingCommit || '') || identity.toolingCommit === PACKAGE_SOURCE ||
    !SHA256.test(identity.executableSha256 || '') ||
    !SHA256.test(identity.archiveSha256 || '') ||
    !SHA256.test(identity.configurationSha256 || '') ||
    !SHA256.test(identity.inventorySha256 || '')) reasons.push('INCOMPLETE_IDENTITY')
  const provenance = record.provenance || {}
  if (provenance.version !== 2 || provenance.packageSourceHead !== PACKAGE_SOURCE ||
    provenance.packageSourceRoot !== 'C:\\FinneyA1Lab\\source' ||
    !/^C:\\FinneyA1Lab\\evidence\\stock-tooling-v2-[a-f0-9]{32}\\tooling$/.test(provenance.toolingRoot || '') ||
    provenance.toolingCommit !== identity.toolingCommit ||
    provenance.commitEvidence !== 'HOST_EXPORT_APPROVAL_NOT_GUEST_GIT' ||
    !SHA256.test(provenance.manifestSha256 || '') || !SHA256.test(provenance.deliverySha256 || '') ||
    provenance.caseMatrixSha256 !== CASE_MATRIX_SHA256 ||
    !SHA256.test(provenance.authorizationSha256 || '') ||
    provenance.authorizationSha256 !== record.authorizationSha256 ||
    !['runId', 'caseId', 'network', 'profile'].every(key => provenance[key] === record[key])) {
    reasons.push('INCOMPLETE_STAGED_PROVENANCE')
  }
  if (typeof record.runId !== 'string' || !/^[a-f0-9]{32}$/.test(record.runId) ||
    !['xec-testnet', 'xec-regtest'].includes(record.network) ||
    !['client-a', 'client-b'].includes(record.profile)) reasons.push('INVALID_BINDING')
  const launch = record.launch || {}
  if (!checkBytes(launch.commandLine) || !checkBytes(launch.environment)) reasons.push('LITERAL_INPUT_MISSING')
  const observation = record.observation || {}
  const attestations = Array.isArray(observation.attestations) ? observation.attestations : []
  if (attestations.length > 32) return result('INCONCLUSIVE', ['OBSERVATION_RECORD_TOO_LARGE'])
  function evidence(name) {
    const matches = attestations.filter(item => item && item.category === name)
    if (matches.length !== 1) return false
    const item = matches[0]
    return item.state === 'SUPPORTED' && item.runId === record.runId &&
      item.caseId === record.caseId && item.network === record.network &&
      item.profile === record.profile && item.executableSha256 === identity.executableSha256 &&
      item.commandLineSha256 === launch.commandLine?.sha256 &&
      item.environmentSha256 === launch.environment?.sha256 &&
      typeof item.artifact === 'string' && item.artifact.length > 0 &&
      SHA256.test(item.sha256 || '') && item.hashChecked === true &&
      item.assessor === 'independent-observer'
  }
  if (record.fixture?.status === 'INVALID') return result('INVALID FIXTURE', ['FIXTURE_PREREQUISITE_FAILED'])
  if (record.execution === 'NOT LAUNCHED') {
    if (reasons.length === 0 && selected.kind === 'preparation' && record.wrapper?.pid === null &&
      record.preparationRejected === true && evidence('no-candidate-created') &&
      evidence('observer-controls') && observation.loss === 0) {
      return result('NOT LAUNCHED', ['PREPARATION_REJECTED'], null, true)
    }
    if (record.unsupported === true && evidence('unsupported-route')) {
      return result('UNSUPPORTED', ['ROUTE_UNSUPPORTED_WITH_EVIDENCE'])
    }
    return result('INCONCLUSIVE', ['PRECONDITION_OR_OBSERVATION_UNAVAILABLE', ...reasons])
  }
  if (record.execution !== 'LAUNCHED') return result('INCONCLUSIVE', ['INVALID_EXECUTION_STATE'])
  if (selected.kind === 'preparation' || selected.kind === 'excluded' || selected.kind === 'control') {
    return result('FAIL', ['CANDIDATE_CREATED_FOR_NONDISPATCH_CASE'])
  }
  if (!matchesLaunch(record, selected)) reasons.push('DISPATCH_INPUT_MISMATCH')
  if (record.fixture?.status !== 'VALID') reasons.push('VALID_FIXTURE_NOT_ESTABLISHED')
  const effects = observation.forbiddenEffects
  if (Array.isArray(effects) && effects.length) return result('FAIL', ['FORBIDDEN_EFFECT_REPORTED'])
  if (!Array.isArray(effects)) reasons.push('EFFECT_ASSESSMENT_MISSING')
  for (const name of REQUIRED) if (!evidence(name)) reasons.push('MISSING_' + name)
  if (selected.kind === 'suppression' && !evidence('no-injection-or-trust-change')) {
    reasons.push('SUPPRESSION_NOT_ESTABLISHED')
  }
  if (observation.startedBeforeCreation !== true || observation.descendantsExited !== true ||
    observation.drained !== true || observation.loss !== 0 ||
    observation.unattributedRelevantEvents !== 0 || observation.clockChangeResolved !== true) {
    reasons.push('INCOMPLETE_INTERVAL')
  }
  const raw = record.wrapper || {}
  const kernel = record.kernel || {}
  if (!Number.isSafeInteger(raw.pid) || raw.pid <= 0 || raw.pid !== kernel.pid ||
    typeof raw.creationTime !== 'string' || raw.creationTime !== kernel.creationTime) {
    reasons.push('PROCESS_IDENTITY_UNBOUND')
  }
  if (raw.timeout === true || raw.outputOverflow === true || raw.drainComplete !== true ||
    raw.forcedTermination !== false) reasons.push('INCOMPLETE_WRAPPER_CAPTURE')
  if (!Number.isInteger(raw.exitCode) || !Number.isInteger(kernel.exitCode) ||
    raw.exitCode !== kernel.exitCode) reasons.push('EXIT_UNCERTAIN_OR_CONTRADICTORY')
  const errorLines = typeof raw.stderr === 'string' ? raw.stderr.split(/\r?\n/).filter(Boolean) : []
  const refused = raw.exitCode === 1 && raw.ready === false &&
    errorLines.length === 1 && errorLines[0] === 'ENVIRONMENT_OVERRIDE_DENIED'
  const ordinary = raw.exitCode === 0 && raw.ready === true && raw.readyBindingValid === true
  let candidate = null
  if (selected.kind === 'refusal') {
    if (raw.ready === true || raw.exitCode === 0) return result('FAIL', ['REQUIRED_REFUSAL_DID_NOT_OCCUR'])
    if (refused) candidate = 'REFUSED'
    else reasons.push('UNRELATED_OR_UNATTRIBUTABLE_REFUSAL')
  } else if (selected.kind === 'suppression') {
    if (refused) candidate = 'REFUSED'
    else if (ordinary && observation.suppressionEstablished === true) candidate = 'SUPPRESSED'
    else reasons.push('SUPPRESSION_OR_REFUSAL_UNPROVEN')
  } else if (selected.kind === 'ordinary') {
    if (ordinary) candidate = 'ORDINARY SUCCESS'
    else reasons.push('ORDINARY_STARTUP_NOT_ESTABLISHED')
  }
  if (reasons.length || !candidate) return result('INCONCLUSIVE', reasons, candidate)
  return result(candidate, [], candidate, true)
}

module.exports = { classify, REQUIRED }
