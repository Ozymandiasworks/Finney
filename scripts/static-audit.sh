#!/usr/bin/env bash
set -euo pipefail

fail=0

check_absent() {
  local description="$1"
  local pattern="$2"
  shift 2
  if grep -RInE "$pattern" "$@" 2>/dev/null; then
    echo "FAIL: $description"
    fail=1
  else
    echo "PASS: $description"
  fi
}

check_absent \
  "obsolete Lotus public infrastructure is absent from active app configuration" \
  'https://chronik\.be\.cash/xpi|https://mainnet-relay\.cashweb\.io|https://mainnet-keyserver\.cashweb\.io|explorer\.givelotus|t\.me/givelotus' \
  src src-electron quasar.conf.js package.json

check_absent \
  "active source no longer imports bitcore-lib-xpi" \
  "from ['\"]bitcore-lib-xpi['\"]|app/local_modules/bitcore-lib-xpi" \
  src test package.json yarn.lock

check_absent \
  "old one-XPI raw-unit literals are absent from application TypeScript/Vue source" \
  '1_000_000|1000000' \
  src --include='*.ts' --include='*.vue'

check_absent \
  "no known broad-replacement artifacts remain" \
  'eXEC|XECres|XECred' \
  src

check_absent \
  "active source does not log wallet private keys or relay authorization tokens" \
  "console\.(log|debug|info)\([^\n]*(xPrivKey|relayToken|mnemonic|seed|privateKey)" \
  src src-electron

node --check src-electron/electron-main.js
node --check src-electron/electron-preload.js
node --check quasar.conf.js
node --check scripts/check-runtime.js

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git diff --check
else
  echo "INFO: git metadata not present; skipping git diff --check."
fi

if [[ "$fail" -ne 0 ]]; then
  exit 1
fi

echo "Finney static audit passed."
