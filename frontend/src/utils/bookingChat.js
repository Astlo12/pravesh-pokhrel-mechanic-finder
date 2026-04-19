/** Aligns with backend: chat blocked for rejected / cancelled only */
export function isBookingChatAllowed(status) {
  if (!status) return false;
  return !['rejected', 'cancelled'].includes(status);
}
