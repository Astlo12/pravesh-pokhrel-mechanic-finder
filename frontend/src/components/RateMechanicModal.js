import React, { useState } from 'react';
import { createReview } from '../services/api';
import './css/RateMechanicModal.css';

/**
 * Modal for customer to rate mechanic after booking is completed.
 */
const RateMechanicModal = ({ bookingId, mechanicName, onClose, onSuccess }) => {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  const display = hover || rating;

  const submit = async () => {
    if (rating < 1) {
      alert('Please select a star rating (1–5).');
      return;
    }
    setSaving(true);
    try {
      await createReview({
        booking_id: bookingId,
        rating,
        comment: comment.trim() || undefined,
      });
      onSuccess?.({ rating, comment: comment.trim() || null });
      onClose();
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.error || 'Could not submit your rating');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="rate-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rate-modal-title"
      onClick={onClose}
    >
      <div className="rate-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="rate-modal-close" onClick={onClose} aria-label="Close">
          <i className="fas fa-times" />
        </button>
        <h2 id="rate-modal-title" className="rate-modal-title">
          Rate your experience
        </h2>
        <p className="rate-modal-sub">
          How was your service with <strong>{mechanicName || 'your mechanic'}</strong>?
        </p>

        <div className="rate-modal-stars" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={`rate-modal-star ${star <= display ? 'rate-modal-star--on' : ''}`}
              onMouseEnter={() => setHover(star)}
              onClick={() => setRating(star)}
              aria-label={`${star} stars`}
            >
              <i className="fas fa-star" />
            </button>
          ))}
        </div>
        {display > 0 && <p className="rate-modal-pick">{display} of 5</p>}

        <label className="rate-modal-label" htmlFor="rate-modal-comment">
          Comment (optional)
        </label>
        <textarea
          id="rate-modal-comment"
          className="rate-modal-textarea"
          rows={3}
          placeholder="Share a few words about the visit…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
        />

        <div className="rate-modal-actions">
          <button type="button" className="rate-modal-btn rate-modal-btn--ghost" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            type="button"
            className="rate-modal-btn rate-modal-btn--primary"
            onClick={submit}
            disabled={saving || rating < 1}
          >
            {saving ? (
              <>
                <i className="fas fa-spinner fa-spin" /> Submitting…
              </>
            ) : (
              <>
                <i className="fas fa-paper-plane" /> Submit rating
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/** Inline read-only stars for “You rated” rows */
export function StarDisplay({ rating, size = 'md' }) {
  const r = Math.round(Number(rating) || 0);
  return (
    <span className={`star-display star-display--${size}`} aria-label={`${r} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <i key={s} className={`fas fa-star ${s <= r ? 'star-display--filled' : ''}`} />
      ))}
    </span>
  );
}

export default RateMechanicModal;
