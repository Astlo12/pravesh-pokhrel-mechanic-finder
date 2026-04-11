# Mechanic-side features (from `totalfeatures.txt`)

Track implementation against the spec. Update this file as you ship each slice.

## Verification gate (search & bookings)

- Only **`is_verified: true`** mechanics appear in **`/mechanics`** (nearby + emergency) and in customer discovery queries.
- New mechanic registrations default to **`is_verified: false`** until an admin verifies them.
- **Existing** mechanic documents in MongoDB with no `is_verified` field will **not** match `is_verified: true` and stay hidden until an admin sets verification to `true`.

## Phase 1 — Workspace & job management ✅

| Spec reference | Feature | Status |
|----------------|---------|--------|
| §11 | Manage availability (`is_available`) | ✅ Mechanic Dashboard toggles |
| §11 | Set online / offline (`is_online`) | ✅ Mechanic Dashboard toggles |
| §11 | Update live location while traveling | ✅ `useMechanicLocationTracking` + copy |
| §11 | Display working time | ✅ Dashboard + profile |
| §11 | Display availability / verification / stats | ✅ Dashboard |
| §7 | Accept / reject booking requests | ✅ Job board + **`/mechanic/workspace/bookings`** |
| §7 | Service request handling (in progress → complete) | ✅ Job board + **All bookings** page |
| §10 | Real-time service status (ETA on active jobs) | ✅ Socket `booking:eta-update` |

## Phase 2 — Profile & trust ✅

| Spec reference | Feature | Status |
|----------------|---------|--------|
| §1 | Certifications, specializations, brands | ✅ **`/mechanic/workspace/edit-profile`** (full editor → `PUT /mechanics/:id/profile`) |
| §2 | Verification badges | ✅ Dashboard banner + public profile + quicknav |
| §9 | Reviews visible to mechanic | ✅ **`/mechanic/workspace/reviews`** |

**Routes:** `/mechanic/workspace/edit-profile`, `/mechanic/workspace/reviews`, `/mechanic/workspace/bookings` (wrapped in **`MechanicRoute`** + **`PrivateRoute`**).

## Phase 3 — Communication & history ✅

| Spec reference | Feature | Status |
|----------------|---------|--------|
| §12 | In-app chat / notifications | ✅ **Activity** tab on **`/mechanic/workspace/messages`** (booking timeline); **Messages** tab = placeholder for future chat |
| §10 | Service history / records export | ✅ **`/mechanic/workspace/history`** + **Export CSV** |

## Phase 4 — Advanced ✅ (lightweight)

| Spec reference | Feature | Status |
|----------------|---------|--------|
| §13 Matchmaking | Mechanic-facing insights | ✅ **Insights** card on dashboard (monthly completed, lifetime, totals, customers served) |
| §17 Engagement | Rewards / gamification | ✅ **Achievements** badges (verified, first job, volume milestones, top rated) |

---

## Navigation

- **Navbar:** mechanics get **Bookings** + **Profile** (edit) + dropdown: Workspace, All bookings, Edit profile, Public profile, Reviews, Service history, Messages.
- **Dashboard:** quick-nav tiles to all workspace pages.

---

**How to extend:** add real-time chat backend + wire **Messages** tab; optional PDF export for history.
