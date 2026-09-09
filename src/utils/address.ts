import { Address, Networks } from 'bitcore-lib-xec'
import { networkName, displayNetwork } from './constants'

// Finney uses eCash CashAddr everywhere. These helpers remain separate so a
// future relay transport can use opaque mailbox identifiers without touching
// wallet display code.
export function toAPIAddress(address: string | Address) {
  return new Address(
    new Address(address).hashBuffer,
    Networks.get(networkName, undefined),
  ).toCashAddress()
}

export function toDisplayAddress(address: string | Address) {
  return new Address(
    new Address(address).hashBuffer,
    Networks.get(displayNetwork, undefined),
  ).toCashAddress()
}
