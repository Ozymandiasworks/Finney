import assert from 'assert'
import axios, { Method } from 'axios'

import paymentrequest from './bip70/paymentrequest_pb'
import type { Payment, PaymentDetails } from './bip70/paymentrequest_pb'
import type { Utxo } from './types/utxo'
import type { Wallet } from './wallet'

export const legacyPaymentDisabledMessage =
  'Legacy HTTP 402 payments are disabled for this release'

export default {
  async getPaymentRequest(url: string, method: Method, data?: Uint8Array) {
    try {
      await axios({
        method,
        url,
        responseType: 'arraybuffer',
        data,
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const response = err.response
      if (response.status === 402) {
        const paymentRequest = paymentrequest.PaymentRequest.deserializeBinary(
          response.data,
        )
        const serializedPaymentDetails =
          paymentRequest.getSerializedPaymentDetails()
        assert(
          typeof serializedPaymentDetails !== 'string',
          'serializedPaymentDetails of wrong type?',
        )
        const paymentDetails = paymentrequest.PaymentDetails.deserializeBinary(
          serializedPaymentDetails,
        )
        return { paymentRequest, paymentDetails }
      }
    }
  },

  async sendPayment(paymentUrl: string, payment: Payment) {
    const rawPayment = payment.serializeBinary()
    const response = await axios({
      method: 'post',
      headers: {
        'Content-Type': 'application/bitcoincash-payment',
        'Accept': 'application/bitcoincash-paymentack',
      },
      url: paymentUrl,
      data: rawPayment,
    })

    const token = response.headers.authorization
    const paymentReceipt = response.data
    return { paymentReceipt, token }
  },

  async constructPaymentTransaction(
    wallet: Wallet,
    paymentDetails: PaymentDetails,
  ): Promise<{
    payment: Payment
    paymentUrl: string
    usedUtxos: Utxo[]
  }> {
    void wallet
    void paymentDetails
    throw new Error(legacyPaymentDisabledMessage)
  },
}
