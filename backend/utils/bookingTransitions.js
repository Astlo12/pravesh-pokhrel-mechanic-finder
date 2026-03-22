/**
 * Booking lifecycle (mechanic ↔ customer handshakes).
 *
 * Flow: pending → accepted → mechanic_arrived → arrival_confirmed →
 *       in_progress → completion_pending → completed
 */

const STATUSES = [
  'pending',
  'accepted',
  'mechanic_arrived',
  'arrival_confirmed',
  'in_progress',
  'completion_pending',
  'completed',
  'cancelled',
  'rejected',
];

/** Statuses where mechanic is "busy" with this job */
const BUSY_STATUSES = new Set([
  'accepted',
  'mechanic_arrived',
  'arrival_confirmed',
  'in_progress',
  'completion_pending',
]);

const MECHANIC_NEXT = {
  pending: ['accepted', 'rejected'],
  accepted: ['mechanic_arrived'],
  arrival_confirmed: ['in_progress'],
  in_progress: ['completion_pending'],
};

const CUSTOMER_NEXT = {
  pending: ['cancelled'],
  accepted: ['cancelled'],
  mechanic_arrived: ['arrival_confirmed', 'cancelled'],
  arrival_confirmed: ['cancelled'],
  completion_pending: ['completed'],
};

function isValidStatus(status) {
  return STATUSES.includes(status);
}

/**
 * @returns {{ ok: true, update: object } | { ok: false, error: string }}
 */
function validateTransition(booking, nextStatus, role) {
  const current = booking.status;
  if (!isValidStatus(nextStatus)) {
    return { ok: false, error: 'Invalid status' };
  }
  if (current === nextStatus) {
    return { ok: false, error: 'Already in this status' };
  }

  const now = new Date();
  const update = { status: nextStatus };

  if (role === 'mechanic') {
    const allowed = MECHANIC_NEXT[current];
    if (!allowed || !allowed.includes(nextStatus)) {
      return { ok: false, error: 'Mechanic cannot set this status from current state' };
    }
    if (nextStatus === 'accepted' && booking.estimated_eta == null) {
      // estimated_eta optional from body in route handler
    }
    if (nextStatus === 'mechanic_arrived') {
      update.mechanic_arrived_at = now;
    }
    if (nextStatus === 'in_progress') {
      update.service_started_at = now;
      update.actual_arrival_time = booking.mechanic_arrived_at || now;
    }
    if (nextStatus === 'completion_pending') {
      update.mechanic_marked_complete_at = now;
    }
    return { ok: true, update };
  }

  if (role === 'customer') {
    const allowed = CUSTOMER_NEXT[current];
    if (!allowed || !allowed.includes(nextStatus)) {
      return { ok: false, error: 'Customer cannot set this status from current state' };
    }
    if (nextStatus === 'arrival_confirmed') {
      update.customer_confirmed_arrival_at = now;
    }
    if (nextStatus === 'completed') {
      update.customer_confirmed_completion_at = now;
      update.completed_at = now;
    }
    return { ok: true, update };
  }

  return { ok: false, error: 'Unauthorized' };
}

module.exports = {
  STATUSES,
  BUSY_STATUSES,
  validateTransition,
  isValidStatus,
};
