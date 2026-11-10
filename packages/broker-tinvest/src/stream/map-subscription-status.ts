import { SubscriptionStatus } from '@ttech-pub/grpc-node-client';

export type InternalSubscriptionStatus =
  | 'SUCCESS'
  | 'INSTRUMENT_NOT_FOUND'
  | 'SUBSCRIPTION_ACTION_IS_INVALID'
  | 'INTERVAL_IS_INVALID'
  | 'LIMIT_IS_EXCEEDED'
  | 'INTERNAL_ERROR'
  | 'TOO_MANY_REQUESTS'
  | 'SUBSCRIPTION_NOT_FOUND'
  | 'SOURCE_IS_INVALID'
  | 'UNSPECIFIED'
  | 'UNKNOWN';

export function mapSubscriptionStatus(status: SubscriptionStatus): InternalSubscriptionStatus {
  switch (status) {
    case SubscriptionStatus.SUBSCRIPTION_STATUS_SUCCESS:
      return 'SUCCESS';
    case SubscriptionStatus.SUBSCRIPTION_STATUS_INSTRUMENT_NOT_FOUND:
      return 'INSTRUMENT_NOT_FOUND';
    case SubscriptionStatus.SUBSCRIPTION_STATUS_SUBSCRIPTION_ACTION_IS_INVALID:
      return 'SUBSCRIPTION_ACTION_IS_INVALID';
    case SubscriptionStatus.SUBSCRIPTION_STATUS_INTERVAL_IS_INVALID:
      return 'INTERVAL_IS_INVALID';
    case SubscriptionStatus.SUBSCRIPTION_STATUS_LIMIT_IS_EXCEEDED:
      return 'LIMIT_IS_EXCEEDED';
    case SubscriptionStatus.SUBSCRIPTION_STATUS_INTERNAL_ERROR:
      return 'INTERNAL_ERROR';
    case SubscriptionStatus.SUBSCRIPTION_STATUS_TOO_MANY_REQUESTS:
      return 'TOO_MANY_REQUESTS';
    case SubscriptionStatus.SUBSCRIPTION_STATUS_SUBSCRIPTION_NOT_FOUND:
      return 'SUBSCRIPTION_NOT_FOUND';
    case SubscriptionStatus.SUBSCRIPTION_STATUS_SOURCE_IS_INVALID:
      return 'SOURCE_IS_INVALID';
    case SubscriptionStatus.SUBSCRIPTION_STATUS_UNSPECIFIED:
      return 'UNSPECIFIED';
    default:
      return 'UNKNOWN';
  }
}
