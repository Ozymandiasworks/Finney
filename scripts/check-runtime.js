#!/usr/bin/env node

const requiredNodeMajor = 24
const nodeMajor = Number(process.versions.node.split('.')[0])

if (nodeMajor !== requiredNodeMajor) {
  console.error(
    `Finney expects Node 24.x for the Electron 44 dependency tree. ` +
      `Detected Node ${process.versions.node}.`,
  )
  console.error('Recommended development runtime: Node 24.19.0 + Yarn 1.22.22.')
  process.exit(1)
}

console.log(`PASS: Node ${process.versions.node}`)
