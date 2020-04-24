import BigNumber from 'bignumber.js'
import { Notification } from 'react-native-firebase/notifications'
import { call, put, select } from 'redux-saga/effects'
import {
  NotificationReceiveState,
  NotificationTypes,
  PaymentRequest,
  TransferNotificationData,
} from 'src/account/types'
import { showMessage } from 'src/alert/actions'
import { TokenTransactionType } from 'src/apollo/types'
import { CURRENCIES, resolveCurrency } from 'src/geth/consts'
import { addressToE164NumberSelector } from 'src/identity/reducer'
import { inviteesSelector } from 'src/invite/reducer'
import { getRecipientFromPaymentRequest } from 'src/paymentRequest/utils'
import { getRecipientFromAddress } from 'src/recipients/recipient'
import { recipientCacheSelector } from 'src/recipients/reducer'
import {
  navigateToPaymentTransferReview,
  navigateToRequestedPaymentReview,
} from 'src/transactions/actions'
import { divideByWei } from 'src/utils/formatting'
import Logger from 'src/utils/Logger'

const TAG = 'FirebaseNotifications'

function* handlePaymentRequested(
  paymentRequest: PaymentRequest,
  notificationState: NotificationReceiveState
) {
  if (notificationState === NotificationReceiveState.APP_ALREADY_OPEN) {
    return
  }

  if (!paymentRequest.requesterAddress) {
    Logger.error(TAG, 'Payment request must specify a requester address')
    return
  }

  const recipientCache = yield select(recipientCacheSelector)
  const targetRecipient = getRecipientFromPaymentRequest(paymentRequest, recipientCache)

  navigateToRequestedPaymentReview({
    firebasePendingRequestUid: paymentRequest.uid,
    recipient: targetRecipient,
    amount: new BigNumber(paymentRequest.amount),
    reason: paymentRequest.comment,
    recipientAddress: targetRecipient.address,
    type: TokenTransactionType.PayRequest,
  })
}

function* handlePaymentReceived(
  transferNotification: TransferNotificationData,
  notificationState: NotificationReceiveState
) {
  if (notificationState !== NotificationReceiveState.APP_ALREADY_OPEN) {
    const recipientCache = yield select(recipientCacheSelector)
    const addressToE164Number = yield select(addressToE164NumberSelector)
    const invitees = yield select(inviteesSelector)
    const address = transferNotification.sender.toLowerCase()
    const currency = resolveCurrency(transferNotification.currency)
    const type = TokenTransactionType.Received

    navigateToPaymentTransferReview(
      TokenTransactionType.Received,
      new BigNumber(transferNotification.timestamp).toNumber(),
      {
        amount: {
          value: divideByWei(transferNotification.value),
          currencyCode: CURRENCIES[currency].code,
        },
        address: transferNotification.sender.toLowerCase(),
        comment: transferNotification.comment,
        recipient: getRecipientFromAddress(
          address,
          invitees,
          recipientCache,
          type,
          addressToE164Number
        ),
        type,
      }
    )
  }
}

export function* handleNotification(
  notification: Notification,
  notificationState: NotificationReceiveState
) {
  if (notificationState === NotificationReceiveState.APP_ALREADY_OPEN) {
    yield put(showMessage(notification.title))
  }
  switch (notification.data.type) {
    case NotificationTypes.PAYMENT_REQUESTED:
      yield call(
        handlePaymentRequested,
        (notification.data as unknown) as PaymentRequest,
        notificationState
      )
      break

    case NotificationTypes.PAYMENT_RECEIVED:
      yield call(
        handlePaymentReceived,
        (notification.data as unknown) as TransferNotificationData,
        notificationState
      )
      break

    default:
      Logger.info(TAG, `Got unknown notification type ${notification.data.type}`)
      break
  }
}
