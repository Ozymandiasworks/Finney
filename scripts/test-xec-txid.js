const { Transaction, crypto } = require('../local_modules/bitcore-lib-xec')

// Raw transaction broadcast during Finney's first funded XEC test. Chronik and
// the eCash network identify it by the standard Bitcoin-style txid below.
const rawTx =
  '02000000010d54eed6ef86a6fd50c0e47444437061ec0575cbf1fafdd7bd3f28ea72a16027000000006a47304402206ac843c4a0f3c567e7a925f008afdfdaa5bb580d488a91d6f51c45dd30fe6b580220168709616fa8035f82e039a388ebdbd0c46e92093f05b7ad7fc1bada8ddea1bc4121039f211f2460b512063aa61d9593ba9d3b8635d06cf5da344da913f16778ec7737ffffffff03cd090000000000001976a91495bff695b836d54d0064e7cbae9e9b285c4f8b5c88ac22020000000000001976a9144c4a9ffc0ccac50acc4463e2f44cc82b3565dc8e88acf3180000000000001976a914338affb2d04d15b9d17e93ef92ee087dbece2a7388ac00000000'
const expectedTxid =
  '6b5f292f95e3958f4ab34549caa363d3d1ddf8aea44832ccdc25fc7b6cf716d3'

const tx = new Transaction(Buffer.from(rawTx, 'hex'))
const canonical = Buffer.from(
  crypto.Hash.sha256sha256(Buffer.from(rawTx, 'hex')),
)
  .reverse()
  .toString('hex')

if (canonical !== expectedTxid) {
  throw new Error(`Test vector is invalid: ${canonical} !== ${expectedTxid}`)
}
if (tx.txid !== expectedTxid) {
  throw new Error(`Finney XEC txid mismatch: ${tx.txid} !== ${expectedTxid}`)
}
if (tx.hash !== expectedTxid) {
  throw new Error(`Finney XEC transaction hash mismatch: ${tx.hash} !== ${expectedTxid}`)
}

console.log(`PASS: XEC txid matches Chronik/network txid ${expectedTxid}`)
