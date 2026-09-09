#!/usr/bin/env node

const requiredNodeMajor = 16
const nodeMajor = Number(process.versions.node.split('.')[0])

if (nodeMajor !== requiredNodeMajor) {
  console.error(
    `Finney v0.1 baseline expects Node 16.x for the legacy Quasar/Electron dependency tree. ` +
      `Detected Node ${process.versions.node}.`,
  )
  console.error('Recommended development runtime: Node 16.20.2 + Yarn 1.22.22.')
  process.exit(1)
}

console.log(`PASS: Node ${process.versions.node}`)
