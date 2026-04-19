import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  getMechanicProfileId,
  getMechanicProfile,
  updateMechanicProfile,
} from '../../services/api';
import './css/MechanicWorkspace.css';

const SERVICE_OPTIONS = [
  'On-site repair',
  'Battery jumpstart',
  'Tire puncture repair',
  'Full service',
  'Towing assistance',
  'Oil change',
  'Brake service',
  'Diagnostic',
  'Emergency roadside',
  'Workshop service',
];

const BIKE_BRANDS = [
  'Honda',
  'Yamaha',
  'Suzuki',
  'Bajaj',
  'TVS',
  'Hero',
  'Royal Enfield',
  'KTM',
  'Kawasaki',
  'Harley-Davidson',
];

const CAR_BRANDS = [
  'Toyota',
  'Honda',
  'Ford',
  'Hyundai',
  'Suzuki',
  'Mahindra',
  'Tata',
  'BMW',
  'Mercedes-Benz',
  'Audi',
];

const emptyCert = () => ({ name: '', issuing_authority: '' });
const emptyWork = () => ({
  company: '',
  position: '',
  start_date: '',
  end_date: '',
  description: '',
});
const emptyCap = () => ({ type: 'bike', brand: '' });

const MechanicProfileEdit = () => {
  const [mechanicId, setMechanicId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [business_name, setBusinessName] = useState('');
  const [license_number, setLicenseNumber] = useState('');
  const [years_experience, setYearsExperience] = useState('');
  const [service_radius, setServiceRadius] = useState('');
  const [working_start, setWorkingStart] = useState('');
  const [working_end, setWorkingEnd] = useState('');
  const [certifications, setCertifications] = useState([emptyCert()]);
  const [services_offered, setServicesOffered] = useState([]);
  const [vehicle_capabilities, setVehicleCapabilities] = useState([emptyCap()]);
  const [work_history, setWorkHistory] = useState([emptyWork()]);

  const load = useCallback(async () => {
    try {
      const idRes = await getMechanicProfileId();
      const id = idRes.data.mechanicId;
      setMechanicId(id);
      const { data: m } = await getMechanicProfile(id);
      setBusinessName(m.business_name || '');
      setLicenseNumber(m.license_number || '');
      setYearsExperience(m.years_experience != null ? String(m.years_experience) : '');
      setServiceRadius(m.service_radius != null ? String(m.service_radius) : '');
      if (m.working_time) {
        if (typeof m.working_time === 'string') {
          setWorkingStart('');
          setWorkingEnd('');
        } else {
          setWorkingStart(m.working_time.start || '');
          setWorkingEnd(m.working_time.end || '');
        }
      }
      const certs = Array.isArray(m.certifications) && m.certifications.length
        ? m.certifications.map((c) =>
            typeof c === 'string' ? { name: c, issuing_authority: '' } : { ...emptyCert(), ...c }
          )
        : [emptyCert()];
      setCertifications(certs);
      setServicesOffered(Array.isArray(m.services_offered) ? [...m.services_offered] : []);
      const caps = Array.isArray(m.vehicle_capabilities) && m.vehicle_capabilities.length
        ? m.vehicle_capabilities.map((c) => ({
            type: c.type || 'bike',
            brand: c.brand || c.brand_name || '',
          }))
        : [emptyCap()];
      setVehicleCapabilities(caps);
      const wh = Array.isArray(m.work_history) && m.work_history.length
        ? m.work_history.map((w) => ({ ...emptyWork(), ...w }))
        : [emptyWork()];
      setWorkHistory(wh);
    } catch (e) {
      console.error(e);
      setError('Could not load your profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleService = (s) => {
    setServicesOffered((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!mechanicId) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const working_time =
        working_start && working_end
          ? { start: working_start, end: working_end }
          : working_start || working_end
            ? { start: working_start || '—', end: working_end || '—' }
            : undefined;

      const certsPayload = certifications
        .filter((c) => c.name && c.name.trim())
        .map((c) => ({
          name: c.name.trim(),
          issuing_authority: (c.issuing_authority || '').trim() || undefined,
        }));

      const capsPayload = vehicle_capabilities
        .filter((c) => c.brand && c.brand.trim())
        .map((c) => ({
          type: c.type,
          brand: c.brand.trim(),
        }));

      const workPayload = work_history
        .filter((w) => w.company || w.position || w.description)
        .map((w) => ({
          company: w.company || '',
          position: w.position || '',
          start_date: w.start_date || null,
          end_date: w.end_date || null,
          description: w.description || '',
        }));

      const yExp =
        years_experience === '' ? undefined : parseInt(years_experience, 10);
      const rad =
        service_radius === '' ? undefined : parseFloat(service_radius);

      await updateMechanicProfile(mechanicId, {
        business_name: business_name.trim() || undefined,
        license_number: license_number.trim() || undefined,
        years_experience: Number.isFinite(yExp) ? yExp : undefined,
        service_radius: Number.isFinite(rad) ? rad : undefined,
        working_time,
        certifications: certsPayload,
        services_offered: services_offered,
        vehicle_capabilities: capsPayload,
        work_history: workPayload,
      });
      setSuccess('Profile saved successfully.');
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mechws-page mechws-loading">
        <i className="fas fa-spinner fa-spin" /> Loading profile editor…
      </div>
    );
  }

  return (
    <div className="mechws-page mechws-page-wide">
      <Link to="/dashboard" className="mechws-back">
        <i className="fas fa-arrow-left" /> Back to dashboard
      </Link>
      <header className="mechws-header">
        <h1>Edit professional profile</h1>
        <p>
          Certifications, brands you work on, services, and hours help customers trust you. Keep details accurate for
          admin verification.
        </p>
      </header>

      {success && (
        <div className="mechws-alert mechws-alert--ok">
          <i className="fas fa-check-circle" /> {success}
        </div>
      )}
      {error && (
        <div className="mechws-alert mechws-alert--err">
          <i className="fas fa-exclamation-circle" /> {error}
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="mechws-card">
          <div className="mechws-card-header">
            <i className="fas fa-store" /> Business &amp; license
          </div>
          <div className="mechws-card-body">
            <div className="mechws-form-grid">
              <div className="mechws-field mechws-field-full">
                <label>Workshop / business name</label>
                <input value={business_name} onChange={(e) => setBusinessName(e.target.value)} placeholder="Shown to customers" />
              </div>
              <div className="mechws-field">
                <label>License / registration no.</label>
                <input value={license_number} onChange={(e) => setLicenseNumber(e.target.value)} />
              </div>
              <div className="mechws-field">
                <label>Years of experience</label>
                <input
                  type="number"
                  min="0"
                  value={years_experience}
                  onChange={(e) => setYearsExperience(e.target.value)}
                />
              </div>
              <div className="mechws-field">
                <label>Service radius (km)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={service_radius}
                  onChange={(e) => setServiceRadius(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mechws-card">
          <div className="mechws-card-header">
            <i className="fas fa-clock" /> Working hours
          </div>
          <div className="mechws-card-body">
            <div className="mechws-form-grid">
              <div className="mechws-field">
                <label>Opens / start</label>
                <input
                  value={working_start}
                  onChange={(e) => setWorkingStart(e.target.value)}
                  placeholder="e.g. 8:00 AM"
                />
              </div>
              <div className="mechws-field">
                <label>Closes / end</label>
                <input
                  value={working_end}
                  onChange={(e) => setWorkingEnd(e.target.value)}
                  placeholder="e.g. 6:00 PM"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mechws-card">
          <div className="mechws-card-header">
            <i className="fas fa-certificate" /> Certifications
          </div>
          <div className="mechws-card-body">
            <div className="mechws-list-editor">
              {certifications.map((c, i) => (
                <div key={i} className="mechws-list-row">
                  <div className="mechws-field">
                    <label>Title</label>
                    <input
                      value={c.name}
                      onChange={(e) => {
                        const next = [...certifications];
                        next[i] = { ...next[i], name: e.target.value };
                        setCertifications(next);
                      }}
                      placeholder="e.g. ASE Master"
                    />
                  </div>
                  <div className="mechws-field">
                    <label>Issuing authority (optional)</label>
                    <input
                      value={c.issuing_authority}
                      onChange={(e) => {
                        const next = [...certifications];
                        next[i] = { ...next[i], issuing_authority: e.target.value };
                        setCertifications(next);
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    className="mechws-btn-remove"
                    onClick={() => setCertifications(certifications.filter((_, j) => j !== i))}
                    aria-label="Remove"
                  >
                    <i className="fas fa-trash" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="mechws-btn-add"
                onClick={() => setCertifications([...certifications, emptyCert()])}
              >
                <i className="fas fa-plus" /> Add certification
              </button>
            </div>
          </div>
        </div>

        <div className="mechws-card">
          <div className="mechws-card-header">
            <i className="fas fa-tools" /> Services offered
          </div>
          <div className="mechws-card-body">
            <div className="mechws-chip-grid">
              {SERVICE_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`mechws-chip ${services_offered.includes(s) ? 'mechws-chip--on' : ''}`}
                  onClick={() => toggleService(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mechws-card">
          <div className="mechws-card-header">
            <i className="fas fa-cog" /> Vehicle types &amp; brands
          </div>
          <div className="mechws-card-body">
            <p style={{ fontSize: '0.85rem', color: '#6c757d', marginTop: 0 }}>
              Add each vehicle type and brand you are comfortable repairing (used for customer matching).
            </p>
            <div className="mechws-list-editor">
              {vehicle_capabilities.map((row, i) => (
                <div key={i} className="mechws-list-row">
                  <div className="mechws-field">
                    <label>Type</label>
                    <select
                      value={row.type}
                      onChange={(e) => {
                        const next = [...vehicle_capabilities];
                        next[i] = { ...next[i], type: e.target.value, brand: '' };
                        setVehicleCapabilities(next);
                      }}
                    >
                      <option value="bike">Bike</option>
                      <option value="car">Car</option>
                    </select>
                  </div>
                  <div className="mechws-field">
                    <label>Brand</label>
                    <select
                      value={row.brand}
                      onChange={(e) => {
                        const next = [...vehicle_capabilities];
                        next[i] = { ...next[i], brand: e.target.value };
                        setVehicleCapabilities(next);
                      }}
                    >
                      <option value="">Select brand</option>
                      {(row.type === 'car' ? CAR_BRANDS : BIKE_BRANDS).map((b) => (
                        <option key={b} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    className="mechws-btn-remove"
                    onClick={() => setVehicleCapabilities(vehicle_capabilities.filter((_, j) => j !== i))}
                  >
                    <i className="fas fa-trash" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="mechws-btn-add"
                onClick={() => setVehicleCapabilities([...vehicle_capabilities, emptyCap()])}
              >
                <i className="fas fa-plus" /> Add capability
              </button>
            </div>
          </div>
        </div>

        <div className="mechws-card">
          <div className="mechws-card-header">
            <i className="fas fa-history" /> Work history
          </div>
          <div className="mechws-card-body">
            <div className="mechws-list-editor">
              {work_history.map((w, i) => (
                <div
                  key={i}
                  style={{
                    border: '1px solid #e9ecef',
                    borderRadius: 10,
                    padding: '0.75rem',
                    marginBottom: '0.65rem',
                  }}
                >
                  <div className="mechws-form-grid">
                    <div className="mechws-field">
                      <label>Company / workshop</label>
                      <input
                        value={w.company}
                        onChange={(e) => {
                          const next = [...work_history];
                          next[i] = { ...next[i], company: e.target.value };
                          setWorkHistory(next);
                        }}
                      />
                    </div>
                    <div className="mechws-field">
                      <label>Role</label>
                      <input
                        value={w.position}
                        onChange={(e) => {
                          const next = [...work_history];
                          next[i] = { ...next[i], position: e.target.value };
                          setWorkHistory(next);
                        }}
                      />
                    </div>
                    <div className="mechws-field">
                      <label>Start (year or date)</label>
                      <input
                        value={w.start_date}
                        onChange={(e) => {
                          const next = [...work_history];
                          next[i] = { ...next[i], start_date: e.target.value };
                          setWorkHistory(next);
                        }}
                      />
                    </div>
                    <div className="mechws-field">
                      <label>End (year or date)</label>
                      <input
                        value={w.end_date}
                        onChange={(e) => {
                          const next = [...work_history];
                          next[i] = { ...next[i], end_date: e.target.value };
                          setWorkHistory(next);
                        }}
                      />
                    </div>
                    <div className="mechws-field mechws-field-full">
                      <label>Description</label>
                      <textarea
                        value={w.description}
                        onChange={(e) => {
                          const next = [...work_history];
                          next[i] = { ...next[i], description: e.target.value };
                          setWorkHistory(next);
                        }}
                        rows={2}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="mechws-btn-remove"
                    style={{ marginTop: 8 }}
                    onClick={() => setWorkHistory(work_history.filter((_, j) => j !== i))}
                  >
                    Remove entry
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="mechws-btn-add"
                onClick={() => setWorkHistory([...work_history, emptyWork()])}
              >
                <i className="fas fa-plus" /> Add work history
              </button>
            </div>
          </div>
        </div>

        <div className="mechws-actions">
          <button type="submit" className="mechws-btn-primary" disabled={saving}>
            {saving ? (
              <>
                <i className="fas fa-spinner fa-spin" /> Saving…
              </>
            ) : (
              <>
                <i className="fas fa-save" /> Save profile
              </>
            )}
          </button>
          <Link to="/dashboard" className="mechws-btn-secondary" style={{ display: 'inline-flex', alignItems: 'center' }}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
};

export default MechanicProfileEdit;
