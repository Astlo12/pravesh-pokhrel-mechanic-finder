/**
 * Shared booking lifecycle labels and helpers (matches backend state machine).
 */

export const BOOKING_STATUS_LABELS = {
  pending: 'Pending',
  accepted: 'On the way',
  mechanic_arrived: 'Mechanic arrived',
  arrival_confirmed: 'Ready to start',
  in_progress: 'Service in progress',
  completion_pending: 'Awaiting your confirmation',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Declined',
};

/** Customer-facing short descriptions (dashboards / lists) */
export const CUSTOMER_STATUS_DESCRIPTIONS = {
  pending: 'Awaiting mechanic.',
  accepted: 'Mechanic en route.',
  mechanic_arrived: 'Confirm meet-up.',
  arrival_confirmed: 'Service starting soon.',
  in_progress: 'Service in progress.',
  completion_pending: 'Confirm completion.',
  completed: 'Closed.',
  cancelled: 'Cancelled.',
  rejected: 'Declined.',
};

/** Mechanic-facing short descriptions (for dashboards / lists — not tracking UI) */
export const MECHANIC_STATUS_DESCRIPTIONS = {
  pending: 'Awaiting your response.',
  accepted: 'En route.',
  mechanic_arrived: 'Awaiting customer confirmation.',
  arrival_confirmed: 'Ready to start service.',
  in_progress: 'Service in progress.',
  completion_pending: 'Awaiting customer sign-off.',
  completed: 'Closed.',
  cancelled: 'Cancelled.',
  rejected: 'Declined.',
};

export const ACTIVE_CUSTOMER_STATUSES = [
  'pending',
  'accepted',
  'mechanic_arrived',
  'arrival_confirmed',
  'in_progress',
  'completion_pending',
];

export const ACTIVE_MECHANIC_STATUSES = [
  'pending',
  'accepted',
  'mechanic_arrived',
  'arrival_confirmed',
  'in_progress',
  'completion_pending',
];

/** Show live map / socket updates */
export const MAP_LIVE_STATUSES = [
  'accepted',
  'mechanic_arrived',
  'arrival_confirmed',
  'in_progress',
  'completion_pending',
];

/** Poll / calculate ETA only while en route */
export const ETA_LIVE_STATUSES = ['accepted'];

export const HISTORY_STATUSES = ['completed', 'cancelled', 'rejected'];

export function customerCanCancel(status) {
  return ['pending', 'accepted', 'mechanic_arrived', 'arrival_confirmed'].includes(status);
}

export function customerCanConfirmArrival(status) {
  return status === 'mechanic_arrived';
}

export function customerCanConfirmCompletion(status) {
  return status === 'completion_pending';
}

export function labelForStatus(status) {
  return BOOKING_STATUS_LABELS[status] || status?.replace(/_/g, ' ') || '—';
}
