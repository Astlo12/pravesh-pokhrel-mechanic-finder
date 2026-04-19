import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, CircleMarker, useMap, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useChatUnread } from '../context/ChatUnreadContext';
import { getBooking, updateBookingStatus } from '../services/api';
import RateMechanicModal, { StarDisplay } from './RateMechanicModal';
import {
  labelForStatus,
  MAP_LIVE_STATUSES,
  ETA_LIVE_STATUSES,
  customerCanCancel,
  customerCanConfirmArrival,
  customerCanConfirmCompletion,
} from '../utils/bookingFlow';
import { isBookingChatAllowed } from '../utils/bookingChat';
import './css/BookingTracking.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const ACCENT = '#dc143c';
const CUSTOMER_DOT = '#212529';

const customerIcon = L.divIcon({
  className: 'bookingtrack-marker',
  html: `<div style="background:${CUSTOMER_DOT};width:20px;height:20px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.2);"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const mechanicIcon = L.divIcon({
  className: 'bookingtrack-marker',
  html: `<div style="background:${ACCENT};width:24px;height:24px;border-radius:50%;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.2);display:flex;align-items:center;justify-content:center;color:#fff;font-size:10px;"><i class="fas fa-wrench"></i></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const FLOW_KEYS = [
  'pending',
  'accepted',
  'mechanic_arrived',
  'arrival_confirmed',
  'in_progress',
  'completion_pending',
  'completed',
];

const STEP_LABELS = {
  pending: 'Request',
  accepted: 'En route',
  mechanic_arrived: 'Arrived',
  arrival_confirmed: 'Meet-up',
  in_progress: 'Service',
  completion_pending: 'Sign-off',
  completed: 'Closed',
};

function MapFitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!points || points.length < 1) return;
    const latLngs = points.filter((p) => p && Number.isFinite(p[0]) && Number.isFinite(p[1]));
    if (latLngs.length === 0) return;
    if (latLngs.length === 1) {
      map.setView(latLngs[0], 14);
      return;
    }
    const b = L.latLngBounds(latLngs);
    if (b.isValid()) map.fitBounds(b, { padding: [48, 48], maxZoom: 15 });
  }, [points, map]);
  return null;
}

function getMechanicIdString(booking) {
  if (!booking?.mechanic_id) return null;
  const m = booking.mechanic_id;
  if (typeof m === 'object' && m !== null) {
    if (m._id) return String(m._id);
    return String(m);
  }
  return String(m);
}

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatServiceType(serviceType) {
  if (!serviceType) return 'Service';
  return serviceType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatDateTime(value) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return String(value);
  }
}

const BookingTracking = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const socket = useSocket();
  const { countForBooking } = useChatUnread();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [liveEta, setLiveEta] = useState(null);
  const [liveDistanceKm, setLiveDistanceKm] = useState(null);
  const [mechanicLive, setMechanicLive] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [rateModalOpen, setRateModalOpen] = useState(false);

  const isCustomer = user?.user_type === 'customer';
  const isMechanic = user?.user_type === 'mechanic';

  const mapLive = useMemo(() => {
    if (!booking?.status) return false;
    return MAP_LIVE_STATUSES.includes(booking.status);
  }, [booking]);

  const fetchBooking = useCallback(async () => {
    if (!bookingId) return;
    try {
      const res = await getBooking(bookingId);
      setBooking(res.data);
      setError('');
      if (res.data.status !== 'accepted') {
        setLiveEta(null);
      }
      const mlat = res.data.mechanic_current_latitude;
      const mlng = res.data.mechanic_current_longitude;
      if (mlat != null && mlng != null) {
        setMechanicLive({ latitude: mlat, longitude: mlng });
      }
      if (res.data.status === 'accepted' && res.data.estimated_eta != null) {
        setLiveEta(res.data.estimated_eta);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Could not load booking');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  const requestEtaUpdate = useCallback(() => {
    if (!socket || !booking || !mapLive) return;
    const mId = getMechanicIdString(booking);
    const custLat = userLocation?.latitude ?? booking.customer_latitude ?? booking.latitude;
    const custLng = userLocation?.longitude ?? booking.customer_longitude ?? booking.longitude;
    if (!mId || custLat == null || custLng == null) return;
    socket.emit('booking:join', { bookingId: booking.id || bookingId });
    socket.emit('booking:calculate-eta', {
      bookingId: booking.id || bookingId,
      mechanicId: mId,
      customerLat: custLat,
      customerLng: custLng,
    });
  }, [socket, booking, mapLive, userLocation, bookingId]);

  useEffect(() => {
    if (!socket || !booking || !mapLive) return;

    const onEta = (data) => {
      const id = data.bookingId;
      const currentId = booking.id || bookingId;
      if (String(id) !== String(currentId)) return;
      if (data.eta != null) setLiveEta(data.eta);
      if (data.distance != null && data.distance !== '') {
        const km = typeof data.distance === 'number' ? data.distance : parseFloat(data.distance);
        if (Number.isFinite(km)) setLiveDistanceKm(km);
      }
      if (data.mechanicLatitude != null && data.mechanicLongitude != null) {
        setMechanicLive({
          latitude: data.mechanicLatitude,
          longitude: data.mechanicLongitude,
        });
      }
    };

    socket.on('booking:eta-update', onEta);
    return () => socket.off('booking:eta-update', onEta);
  }, [socket, booking, bookingId, mapLive]);

  useEffect(() => {
    if (!mapLive || !booking || !socket) return;
    requestEtaUpdate();
    const intervalMs = ETA_LIVE_STATUSES.includes(booking.status) ? 35000 : 45000;
    const t = setInterval(requestEtaUpdate, intervalMs);
    return () => clearInterval(t);
  }, [mapLive, booking?.status, requestEtaUpdate, socket, booking]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const customerPoint = useMemo(() => {
    const lat = userLocation?.latitude ?? booking?.customer_latitude ?? booking?.latitude;
    const lng = userLocation?.longitude ?? booking?.customer_longitude ?? booking?.longitude;
    if (lat == null || lng == null) return null;
    return { latitude: lat, longitude: lng };
  }, [userLocation, booking]);

  const computedDistance = useMemo(() => {
    if (liveDistanceKm != null && Number.isFinite(liveDistanceKm)) return liveDistanceKm;
    if (!customerPoint || !mechanicLive) return null;
    return calculateDistanceKm(
      customerPoint.latitude,
      customerPoint.longitude,
      mechanicLive.latitude,
      mechanicLive.longitude
    );
  }, [liveDistanceKm, customerPoint, mechanicLive]);

  const mapPoints = useMemo(() => {
    const pts = [];
    if (customerPoint) pts.push([customerPoint.latitude, customerPoint.longitude]);
    if (mechanicLive) pts.push([mechanicLive.latitude, mechanicLive.longitude]);
    return pts;
  }, [customerPoint, mechanicLive]);

  const flowIndex = useMemo(() => {
    const s = booking?.status;
    if (!s || ['cancelled', 'rejected'].includes(s)) return -1;
    return FLOW_KEYS.indexOf(s);
  }, [booking?.status]);

  const timelineSteps = useMemo(() => {
    const s = booking?.status;
    if (s === 'cancelled' || s === 'rejected') {
      return [{ key: 'end', label: s === 'cancelled' ? 'Cancelled' : 'Declined', done: true, current: false }];
    }
    return FLOW_KEYS.map((key, i) => {
      const done = flowIndex >= 0 && i < flowIndex;
      const current = flowIndex === i;
      return {
        key,
        label: STEP_LABELS[key] || key,
        done,
        current,
      };
    });
  }, [booking?.status, flowIndex]);

  const handleStatus = async (next) => {
    const id = booking?.id || bookingId;
    if (!id) return;
    setActionBusy(true);
    try {
      await updateBookingStatus(id, { status: next });
      await fetchBooking();
      if (next === 'completed' && isCustomer) {
        setRateModalOpen(true);
      }
    } catch (e) {
      console.error(e);
      alert(e.response?.data?.error || 'Could not update booking');
    } finally {
      setActionBusy(false);
    }
  };

  const handleCancel = () => {
    if (!window.confirm('Cancel this booking?')) return;
    handleStatus('cancelled');
  };

  if (loading) {
    return (
      <div className="bt-root bt-root--state">
        <div className="bt-state-box">
          <i className="fas fa-spinner fa-spin" />
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="bt-root bt-root--state">
        <div className="bt-state-box bt-state-box--err">
          <i className="fas fa-exclamation-circle" />
          <p>{error || 'Booking not found'}</p>
          <button type="button" className="bt-btn bt-btn--ghost" onClick={() => navigate('/dashboard')}>
            <i className="fas fa-arrow-left" /> Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!isCustomer && !isMechanic) {
    return (
      <div className="bt-root bt-root--state">
        <div className="bt-state-box bt-state-box--err">
          <p>Sign in as the customer or mechanic for this booking.</p>
          <button type="button" className="bt-btn bt-btn--primary" onClick={() => navigate('/login')}>
            Log in
          </button>
        </div>
      </div>
    );
  }

  const mechanicName = booking.mechanic_name || booking.business_name || 'Mechanic';
  const customerName = booking.customer_name || 'Customer';
  const mechanicInitials = mechanicName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const customerInitials = customerName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const etaMinutes =
    booking.status === 'accepted' ? (liveEta != null ? liveEta : booking.estimated_eta) : null;
  const etaDisplay = etaMinutes != null ? `${etaMinutes}` : '—';
  const distDisplay =
    computedDistance != null && Number.isFinite(computedDistance)
      ? `${computedDistance.toFixed(1)}`
      : '—';

  const refId = (booking.id || bookingId || '').toString().slice(0, 8).toUpperCase() || '—';
  const trackBookingChatId = String(booking.id || bookingId || '');
  const chatUnreadHere = countForBooking(trackBookingChatId);
  const isTerminal = ['completed', 'cancelled', 'rejected'].includes(booking.status);
  const showLive = mapLive && !isTerminal;

  const roleTag = isCustomer ? 'Customer' : 'Mechanic';
  const vehicleLine = [booking.vehicle_brand, booking.vehicle_type].filter(Boolean).join(' · ');

  return (
    <div className="bt-root">
      {isCustomer && rateModalOpen && booking && (
        <RateMechanicModal
          bookingId={booking.id || bookingId}
          mechanicName={mechanicName}
          onClose={() => setRateModalOpen(false)}
          onSuccess={() => {
            setRateModalOpen(false);
            fetchBooking();
          }}
        />
      )}

      <div className="bt-container">
        <div className="bt-top">
          <button type="button" className="bt-back" onClick={() => navigate(-1)}>
            <i className="fas fa-arrow-left" />
            Back
          </button>
          <div className="bt-top-meta">
            <span className="bt-ref">REF {refId}</span>
            <span className={`bt-signal ${showLive ? 'bt-signal--live' : ''}`}>
              {showLive && <span className="bt-signal-dot" />}
              {showLive ? 'Live' : isTerminal ? 'Closed' : 'Active'}
            </span>
          </div>
        </div>

        <header className="bt-hero">
          <div className="bt-hero-row">
            <div>
              <h1 className="bt-hero-title">Service booking</h1>
              <p className="bt-hero-line">
                <strong>{formatServiceType(booking.service_type)}</strong>
                {vehicleLine ? ` · ${vehicleLine}` : ''}
              </p>
              <p className="bt-hero-line" style={{ marginTop: '0.35rem', fontSize: '0.8rem' }}>
                {roleTag}
              </p>
            </div>
            <span className="bt-badge">{labelForStatus(booking.status)}</span>
          </div>

          {/* Minimal actions — no tutorial copy */}
          {isCustomer && customerCanConfirmArrival(booking.status) && (
            <div className="bt-strip">
              <button
                type="button"
                className="bt-btn bt-btn--primary"
                disabled={actionBusy}
                onClick={() => handleStatus('arrival_confirmed')}
              >
                <i className="fas fa-check" /> Confirm meet-up
              </button>
            </div>
          )}

          {isCustomer && customerCanConfirmCompletion(booking.status) && (
            <div className="bt-strip">
              <button
                type="button"
                className="bt-btn bt-btn--primary"
                disabled={actionBusy}
                onClick={() => handleStatus('completed')}
              >
                <i className="fas fa-check-double" /> Confirm completed
              </button>
            </div>
          )}

          {isCustomer && customerCanCancel(booking.status) && (
            <div className="bt-strip bt-strip--solo">
              <button type="button" className="bt-btn bt-btn--danger" disabled={actionBusy} onClick={handleCancel}>
                <i className="fas fa-times" /> Cancel
              </button>
            </div>
          )}

          {isMechanic && booking.status === 'accepted' && (
            <div className="bt-strip">
              <button
                type="button"
                className="bt-btn bt-btn--primary"
                disabled={actionBusy}
                onClick={() => handleStatus('mechanic_arrived')}
              >
                <i className="fas fa-map-marker-alt" /> Mark arrived
              </button>
            </div>
          )}

          {isMechanic && booking.status === 'mechanic_arrived' && (
            <div className="bt-strip bt-strip--solo">
              <span className="bt-wait">Awaiting customer</span>
            </div>
          )}

          {isMechanic && booking.status === 'arrival_confirmed' && (
            <div className="bt-strip">
              <button
                type="button"
                className="bt-btn bt-btn--primary"
                disabled={actionBusy}
                onClick={() => handleStatus('in_progress')}
              >
                <i className="fas fa-play" /> Start service
              </button>
            </div>
          )}

          {isMechanic && booking.status === 'in_progress' && (
            <div className="bt-strip">
              <button
                type="button"
                className="bt-btn bt-btn--dark"
                disabled={actionBusy}
                onClick={() => handleStatus('completion_pending')}
              >
                <i className="fas fa-flag-checkered" /> Mark complete
              </button>
            </div>
          )}

          {isMechanic && booking.status === 'completion_pending' && (
            <div className="bt-strip bt-strip--solo">
              <span className="bt-wait">Awaiting customer</span>
            </div>
          )}

          {isCustomer && booking.status === 'completed' && (
            <div className={`bt-rate ${booking.my_review ? 'bt-rate--done' : 'bt-rate--cta'}`}>
              {booking.my_review ? (
                <>
                  <div>
                    <h3>Your rating</h3>
                    <div className="bt-rate-stars">
                      <StarDisplay rating={booking.my_review.rating} size="lg" />
                      <span>{Number(booking.my_review.rating).toFixed(1)} / 5</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h3>Rate this visit</h3>
                  </div>
                  <button type="button" className="bt-btn bt-btn--rate" onClick={() => setRateModalOpen(true)}>
                    <i className="fas fa-star" /> Add rating
                  </button>
                </>
              )}
            </div>
          )}

          <div className="bt-kpis">
            <div className="bt-kpi">
              <span className="bt-kpi-lbl">ETA</span>
              <span className="bt-kpi-val">
                {booking.status === 'accepted' && etaDisplay !== '—' ? (
                  <>
                    {etaDisplay}
                    <span className="bt-kpi-unit">min</span>
                  </>
                ) : (
                  <span className="bt-kpi-muted">—</span>
                )}
              </span>
            </div>
            <div className="bt-kpi">
              <span className="bt-kpi-lbl">Distance</span>
              <span className="bt-kpi-val">
                {distDisplay !== '—' ? (
                  <>
                    {distDisplay}
                    <span className="bt-kpi-unit">km</span>
                  </>
                ) : (
                  <span className="bt-kpi-muted">—</span>
                )}
              </span>
            </div>
            <div className="bt-kpi">
              <span className="bt-kpi-lbl">Reference</span>
              <span className="bt-kpi-val" style={{ fontSize: '1rem' }}>
                {refId}
              </span>
            </div>
          </div>
        </header>

        <div className="bt-split">
          <main>
            <div className="bt-map-card">
              <div className="bt-map-head">
                <h2>Map</h2>
              </div>
              <div className="bt-map-body">
                {customerPoint && mechanicLive ? (
                  <MapContainer
                    center={[customerPoint.latitude, customerPoint.longitude]}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom
                  >
                    <TileLayer
                      attribution='&copy; OpenStreetMap'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapFitBounds points={mapPoints} />
                    <Polyline
                      positions={mapPoints}
                      pathOptions={{
                        color: ACCENT,
                        weight: 4,
                        opacity: 0.88,
                        dashArray: '10 8',
                        lineCap: 'round',
                      }}
                    />
                    <Marker position={[customerPoint.latitude, customerPoint.longitude]} icon={customerIcon}>
                      <Popup>
                        <strong>{isCustomer ? 'You' : 'Customer'}</strong>
                      </Popup>
                    </Marker>
                    <Marker position={[mechanicLive.latitude, mechanicLive.longitude]} icon={mechanicIcon}>
                      <Popup>
                        <strong>{isCustomer ? mechanicName : 'You'}</strong>
                      </Popup>
                    </Marker>
                    {mapLive && (
                      <CircleMarker
                        center={[mechanicLive.latitude, mechanicLive.longitude]}
                        radius={14}
                        pathOptions={{
                          color: ACCENT,
                          fillColor: ACCENT,
                          fillOpacity: 0.12,
                          weight: 2,
                        }}
                      />
                    )}
                  </MapContainer>
                ) : (
                  <div className="bt-map-empty">
                    <i className="fas fa-map-marker-alt" />
                    <span>Enable location or check saved address</span>
                  </div>
                )}
              </div>
              <p className="bt-map-foot">
                {mapLive ? 'Positions update while this booking is active.' : 'Snapshot for this booking.'}
              </p>
            </div>
          </main>

          <aside className="bt-stack">
            <div className="bt-card">
              <div className="bt-card-h">{isCustomer ? 'Mechanic' : 'Customer'}</div>
              <div className="bt-card-b">
                <div className="bt-person">
                  <div className="bt-av">
                    {isCustomer ? (
                      booking.mechanic_profile_picture ? (
                        <img src={booking.mechanic_profile_picture} alt="" />
                      ) : (
                        mechanicInitials
                      )
                    ) : booking.customer_profile_picture ? (
                      <img src={booking.customer_profile_picture} alt="" />
                    ) : (
                      customerInitials
                    )}
                  </div>
                  <div>
                    <h3>{isCustomer ? mechanicName : customerName}</h3>
                    <p className="bt-person-meta">
                      {isCustomer ? (
                        booking.business_name && booking.business_name !== mechanicName ? (
                          booking.business_name
                        ) : null
                      ) : null}
                    </p>
                    {isCustomer && booking.rating != null && (
                      <div className="bt-shop-rating">
                        <i className="fas fa-star" />
                        {parseFloat(booking.rating).toFixed(1)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="bt-contact-stack">
                  <p className="bt-person-phone-line">
                    {isCustomer ? (
                      booking.mechanic_phone ? (
                        <a href={`tel:${booking.mechanic_phone}`}>{booking.mechanic_phone}</a>
                      ) : (
                        <span className="bt-phone-muted">No phone number on file</span>
                      )
                    ) : booking.customer_phone ? (
                      <a href={`tel:${booking.customer_phone}`}>{booking.customer_phone}</a>
                    ) : (
                      <span className="bt-phone-muted">No phone number on file</span>
                    )}
                  </p>
                  {isBookingChatAllowed(booking.status) && (isCustomer || isMechanic) && (
                    <button
                      type="button"
                      className="bt-msg-btn"
                      onClick={() => {
                        const id = booking.id || bookingId;
                        if (isCustomer) navigate(`/chat/${id}`);
                        else navigate(`/mechanic/workspace/messages?booking=${id}`);
                      }}
                    >
                      <span className="bt-msg-btn-inner">
                        <i className="fas fa-comment-dots" aria-hidden />
                        Messages
                        {chatUnreadHere > 0 && (
                          <span className="bt-msg-badge">{chatUnreadHere > 99 ? '99+' : chatUnreadHere}</span>
                        )}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="bt-card">
              <div className="bt-card-h">Details</div>
              <div className="bt-card-b">
                <div className="bt-dl">
                  <div className="bt-dl-item">
                    <span className="bt-dl-lbl">Service</span>
                    <p className="bt-dl-val">{formatServiceType(booking.service_type)}</p>
                  </div>
                  {(booking.vehicle_brand || booking.vehicle_type) && (
                    <div className="bt-dl-item">
                      <span className="bt-dl-lbl">Vehicle</span>
                      <p className="bt-dl-val">{[booking.vehicle_brand, booking.vehicle_type].filter(Boolean).join(' · ')}</p>
                    </div>
                  )}
                  {booking.address && (
                    <div className="bt-dl-item">
                      <span className="bt-dl-lbl">Location</span>
                      <p className="bt-dl-val">{booking.address}</p>
                    </div>
                  )}
                  {formatDateTime(booking.scheduled_date) && (
                    <div className="bt-dl-item">
                      <span className="bt-dl-lbl">Scheduled</span>
                      <p className="bt-dl-val">{formatDateTime(booking.scheduled_date)}</p>
                    </div>
                  )}
                  <div className="bt-dl-item">
                    <span className="bt-dl-lbl">Booked</span>
                    <p className="bt-dl-val">{formatDateTime(booking.created_at) || '—'}</p>
                  </div>
                  {booking.mechanic_arrived_at && (
                    <div className="bt-dl-item">
                      <span className="bt-dl-lbl">Arrived</span>
                      <p className="bt-dl-val">{formatDateTime(booking.mechanic_arrived_at)}</p>
                    </div>
                  )}
                  {booking.service_started_at && (
                    <div className="bt-dl-item">
                      <span className="bt-dl-lbl">Started</span>
                      <p className="bt-dl-val">{formatDateTime(booking.service_started_at)}</p>
                    </div>
                  )}
                  {booking.mechanic_marked_complete_at && (
                    <div className="bt-dl-item">
                      <span className="bt-dl-lbl">Work finished</span>
                      <p className="bt-dl-val">{formatDateTime(booking.mechanic_marked_complete_at)}</p>
                    </div>
                  )}
                  {booking.completed_at && (
                    <div className="bt-dl-item">
                      <span className="bt-dl-lbl">Closed</span>
                      <p className="bt-dl-val">{formatDateTime(booking.completed_at)}</p>
                    </div>
                  )}
                  {booking.issue_description && (
                    <div className="bt-dl-item">
                      <span className="bt-dl-lbl">Notes</span>
                      <p className="bt-dl-val">{booking.issue_description}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bt-card">
              <div className="bt-card-h">Progress</div>
              <div className="bt-card-b">
                <ul className="bt-steps">
                  {timelineSteps.map((step) => (
                    <li
                      key={step.key}
                      className={`${step.done ? 'bt-step-done' : ''} ${step.current ? 'bt-step-current' : ''}`}
                    >
                      {step.label}
                    </li>
                  ))}
                </ul>
                <div className="bt-foot-actions" style={{ marginTop: '1rem' }}>
                  <Link to={isCustomer ? '/my-bookings' : '/mechanic/workspace/bookings'} className="bt-btn bt-btn--ghost">
                    <i className="fas fa-list" /> {isCustomer ? 'All bookings' : 'All jobs'}
                  </Link>
                  {booking.status === 'completed' && isCustomer && (
                    <Link to="/service-history" className="bt-btn bt-btn--ghost">
                      <i className="fas fa-history" /> History
                    </Link>
                  )}
                  <button type="button" className="bt-btn bt-btn--primary" onClick={() => navigate('/dashboard')}>
                    <i className="fas fa-home" /> Dashboard
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default BookingTracking;
