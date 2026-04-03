# DentiCare Pro — Mini Improvement PRD
## Clinic Self-Registration, Onboarding Flow & Employee Management
**Version:** 1.1  
**Type:** Mini / Incremental Improvement  
**Status:** Draft  
**Date:** March 2026  
**Scope:** Registration flow, clinic onboarding wizard, database restructure, dashboard Employee tab

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Goals](#2-goals)
3. [User Journey Overview](#3-user-journey-overview)
4. [Feature: Self-Registration as Clinic Admin](#4-feature-self-registration-as-clinic-admin)
5. [Feature: Clinic Onboarding Wizard](#5-feature-clinic-onboarding-wizard)
6. [Feature: Employee Tab in Dashboard](#6-feature-employee-tab-in-dashboard)
7. [Database Restructure](#7-database-restructure)
8. [Suggested Improvements](#8-suggested-improvements)
9. [UI/UX Notes](#9-uiux-notes)
10. [Acceptance Criteria](#10-acceptance-criteria)
11. [Delivery Estimate](#11-delivery-estimate)

---

## 1. Problem Statement

Currently, new users register without a clear role or clinic context. After registration, they land on the dashboard with no clinic data, no staff, and no guidance — a blank, confusing state. The system has no structured onboarding, forcing the team to manually set up each new clinic via the database or Superadmin panel.

This creates:
- High drop-off rate immediately after registration
- Manual intervention required by the ops team for every new clinic
- No way for clinics to self-serve their setup
- Doctors and Employees managed in separate, disconnected ways
- Clinic profile data (location, operational hours, STR number) stored inconsistently or not at all

---

## 2. Goals

| Goal | Metric |
|------|--------|
| Full self-serve clinic setup with zero ops intervention | 100% of new clinics fully onboarded without manual DB work |
| Reduce time-to-first-use after registration | From >1 day → <15 minutes |
| Capture complete clinic profile at onboarding | All required fields populated before dashboard access |
| Employees managed alongside Doctors in one unified tab | Employee tab live in `/dashboard` |
| Clean, normalized database schema for clinic & staff data | No orphaned records, no null clinic_id on users |

---

## 3. User Journey Overview

```
/register
  → Fill name, email, password
  → Email verification
  → Account created with role: "clinic_admin"
        ↓
/onboarding  (blocked from /dashboard until complete)
  Step 1: Clinic Identity       → Clinic name, type, logo
  Step 2: Location & Address    → Map pin + address fields
  Step 3: Head of Clinic        → Title, name, STR number
  Step 4: Operational Schedule  → Days open, hours
  Step 5: Contact Info          → Email, phone, WhatsApp
  Step 6: Review & Launch       → Summary + confirm
        ↓
/dashboard  (unlocked — fully set up clinic, ready to use)
  Tabs: Dashboard | Patients | Doctors | Employees ← NEW | Appointments | Billing
```

---

## 4. Feature: Self-Registration as Clinic Admin

### 4.1 Registration Page (`/register`)

**Current behaviour:** User registers, gets a generic role or no role.  
**New behaviour:** Every registrant automatically becomes a `clinic_admin` and a new clinic tenant is provisioned for them.

**Registration form fields:**

| Field | Type | Validation |
|-------|------|-----------|
| Full Name | Text | Required, min 3 chars |
| Email | Email | Required, unique, valid format |
| Password | Password | Min 8 chars, 1 uppercase, 1 number, 1 symbol |
| Confirm Password | Password | Must match |
| Phone Number | Tel | Required, Indonesian format (+62 / 08xx) |
| Agree to Terms & Privacy Policy | Checkbox | Required |

**After successful registration:**
1. Supabase Auth creates the user account
2. A new row is inserted into `clinics` table with `status: 'onboarding'`
3. A new row in `clinic_users` links this user as `clinic_admin` of the new clinic
4. Email verification link sent → user must verify before proceeding
5. After email verification → redirect to `/onboarding`

**Middleware guard:**
- If `clinic.status = 'onboarding'` → always redirect to `/onboarding`, block `/dashboard`
- If `clinic.status = 'active'` → `/onboarding` redirects to `/dashboard`

---

## 5. Feature: Clinic Onboarding Wizard

Route: `/onboarding`  
Progress: Persistent top progress bar showing step X of 6.  
Behaviour: Steps 1–5 save as drafts (user can close browser and return). Step 6 finalises.  
Skip: No steps can be skipped except logo upload (Step 1).

---

### Step 1: Clinic Identity

**Fields:**

| Field | Type | Notes |
|-------|------|-------|
| Clinic Name | Text | Required. E.g. "Klinik Gigi Sehat Abadi" |
| Clinic Type | Single Select | General Dental, Specialist Dental, Polyclinic, Dental Hospital |
| Clinic Logo | Image upload | Optional. Max 2MB, JPG/PNG. Shown in receipts & portal |

**UI hint:** Show a live preview of how the clinic name appears on a sample invoice header.

---

### Step 2: Location & Address

This is the most complex step. It uses a **free map API** (Leaflet.js + OpenStreetMap) with no API key required.

**Sub-fields:**

| Field | Type | Notes |
|-------|------|-------|
| Map Pin | Interactive map | User drags pin to exact location. Latitude + longitude saved. |
| Search Location | Text + autocomplete | Uses Nominatim (free OSM geocoder) — user types address, map flies to it |
| Province | Dropdown | All 38 Indonesian provinces |
| City / Regency | Dropdown | Filtered by province, populated from static JSON |
| District (Kecamatan) | Text | Free text |
| Sub-district (Kelurahan) | Text | Free text |
| Full Address | Textarea | Street name, building name, floor, unit |
| Postal Code | Text | 5-digit Indonesian postal code |

**Map implementation (no API key, zero cost):**

```typescript
// Use Leaflet.js (free, open source)
// Tile layer: OpenStreetMap (free, no key)
// Geocoding: Nominatim API (free, OSM-powered, rate-limited to 1 req/sec — sufficient for onboarding)

// Install
npm install leaflet react-leaflet

// Tile URL
"https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"

// Geocoding (search by address → coordinates)
GET https://nominatim.openstreetmap.org/search?q={query}&format=json&countrycodes=id&limit=5

// Reverse geocoding (pin drop → address autofill)
GET https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json
```

**UX flow:**
1. Map loads centred on Indonesia (lat: -2.5, lon: 118.0, zoom: 5)
2. User types in search box → Nominatim returns candidates → user selects one → map flies to location
3. A draggable red pin appears — user fine-tunes position by dragging
4. On pin drop, reverse geocoding autofills the address fields below
5. User can also manually edit address fields if autofill is inaccurate
6. Coordinates (`lat`, `lng`) stored regardless

**Important note for production:** Add `User-Agent` header to Nominatim requests identifying your app — required by OSM's usage policy. If usage grows heavy (>1 req/sec sustained), switch to **Photon** (self-hostable, free) or add a low-cost geocoding tier.

---

### Step 3: Head of Clinic

The Head of Clinic is the responsible licensed professional. This is legally required in Indonesian dental clinic registration (Permenkes).

**Fields:**

| Field | Type | Notes |
|-------|------|-------|
| Title | Dropdown | `dr.` (General Physician), `drg.` (Dokter Gigi / Dentist), `Dr.` (Doctorate), `Prof. Dr.`, `drg. Sp.` (Specialist Dentist), `drg. Sp.KG`, `drg. Sp.BM`, `drg. Sp.Perio`, `drg. Sp.Ort`, `drg. Sp.PM`, `drg. Sp.Pros`, `drg. Sp.RKG` |
| Full Name | Text | Required. The name as it appears on their license |
| STR Number | Text | Required. Nomor Surat Tanda Registrasi — format: `12.34.5.67.890123` |
| STR Expiry Date | Date picker | Required. Alert shown if STR expires within 90 days |
| SIP Number | Text | Optional. Nomor Surat Izin Praktek |
| SIP Expiry Date | Date picker | Optional |

**STR validation:**
- Format check: numeric, 14 digits (configurable)
- No real-time KKI API validation in MVP — but field is required
- Show a note: *"Your STR number will be verified by our team within 24 hours."*

**Suggestion:** The person filling in Step 3 may or may not be the Head of Clinic themselves. Add a checkbox: **"I am the Head of Clinic"** — if checked, autofill from the registered user's name.

---

### Step 4: Operational Schedule

**Fields:**

| Field | Type | Notes |
|-------|------|-------|
| Operating Days | Multi-checkbox | Monday through Sunday, individually toggleable |
| Opening Time | Time picker | Per day (or use "same for all days" toggle) |
| Closing Time | Time picker | Per day |
| Lunch Break | Toggle + time range | Optional. E.g. 12:00–13:00 |
| Appointment Slot Duration | Dropdown | 15 / 20 / 30 / 45 / 60 minutes |
| Emergency / Walk-In | Toggle | "Accept walk-in patients outside scheduled hours" |

**"Same schedule for all selected days" toggle:** Applies one time range to all checked days — the most common case. Individual days can then be overridden.

**Example UI output:**
```
Mon  ✅  08:00 – 17:00   Break: 12:00 – 13:00
Tue  ✅  08:00 – 17:00   Break: 12:00 – 13:00
Wed  ✅  08:00 – 17:00   Break: 12:00 – 13:00
Thu  ✅  08:00 – 17:00   Break: 12:00 – 13:00
Fri  ✅  08:00 – 16:00   Break: 12:00 – 13:00
Sat  ✅  08:00 – 13:00   No break
Sun  ☐  Closed
```

This data feeds directly into the appointment availability engine — no manual schedule setup needed after onboarding.

---

### Step 5: Contact Information

| Field | Type | Notes |
|-------|------|-------|
| Clinic Email | Email | Pre-filled from registration. Editable (can be a separate clinic email) |
| Clinic Phone | Tel | Required. Indonesian format |
| WhatsApp Number | Tel | Required. Used for automated reminders (Phase 2 F1). Show: *"This number will receive patient replies"* |
| Website | URL | Optional |
| Instagram Handle | Text | Optional. @handle |
| Google Maps URL | URL | Optional. For patient-facing clinic page |

**WhatsApp ≠ Phone:** Add a checkbox **"Same as phone number"** to auto-copy. Many clinics have separate WA numbers.

---

### Step 6: Review & Launch

A clean summary of all entered information across steps 1–5 in a read-only card layout, with an **Edit** button on each section to jump back.

At the bottom:
```
☐ I confirm that the information above is accurate.
☐ I agree to the Data Processing Agreement (required for patient data handling under UU PDP).

          [← Back]    [🚀 Launch My Clinic Dashboard]
```

On submit:
1. `clinics.status` updated from `'onboarding'` → `'active'`
2. `clinics.onboarded_at` set to now
3. All onboarding data written to `clinics` and related tables
4. Redirect to `/dashboard` with a **welcome modal**: *"🎉 Klinik Anda siap! Here's what to do first: Add your first doctor → Set up your first appointment"*
5. Superadmin Control Room notified of new active clinic

---

## 6. Feature: Employee Tab in Dashboard

### 6.1 Tab Order (Updated)

```
Dashboard | Patients | Doctors | Employees ← NEW | Appointments | Billing
```

Placed immediately after Doctors tab — conceptually grouped as "People Management."

### 6.2 What the Employee Tab Covers

The **Doctors tab** remains focused on clinical staff who see patients (dentists, specialists).  
The **Employees tab** covers all non-doctor clinic staff.

| Role (in Employees tab) | Display Name (ID) | Can Be Added Here |
|------------------------|-------------------|-------------------|
| `receptionist` | Resepsionis | ✅ |
| `nurse` | Perawat | ✅ |
| `assistant` | Asisten Dokter | ✅ |
| `pharmacist` | Apoteker | ✅ |
| `admin` | Admin Klinik | ✅ |
| `dentist` | Dokter Gigi | ❌ (use Doctors tab) |

### 6.3 Employee List View

**Columns:** Photo | Name | Role | Email | Phone | Status | Last Login | Actions

**Actions per row:**
- ✏️ Edit profile
- 🔒 Deactivate / Reactivate
- 🔑 Reset password (sends email)
- 👁 View activity log

**Filters:** Role | Status (Active / Inactive) | Date Added

### 6.4 Add Employee Modal / Slide-over

**Fields:**

| Field | Type | Notes |
|-------|------|-------|
| Full Name | Text | Required |
| Role | Dropdown | Resepsionis, Perawat, Asisten Dokter, Apoteker, Admin Klinik |
| Email | Email | Required. Invite email sent with temp password |
| Phone Number | Tel | Optional |
| WhatsApp | Tel | Optional |
| Date Started | Date | Optional. For HR records |
| Access Level note | Info text | *"This role can: [list permissions]"* — shown dynamically |

**After adding:**
1. Supabase Auth `inviteUserByEmail()` creates account
2. Employee receives email: *"You've been invited to DentiCare Pro by [Clinic Name]. Set your password: [link]"*
3. Employee appears in list with status `Pending` until they accept
4. On first login → simple welcome screen (no full onboarding wizard, just profile completion)

### 6.5 Employee Profile Page

Clicking an employee opens a slide-over or dedicated page with tabs:

- **Profile** — personal info, role, contact
- **Permissions** — fine-grained toggles within their role (e.g. Receptionist: can/cannot view billing)
- **Schedule** — working days and hours (separate from doctor schedules)
- **Activity** — recent actions (appointments booked, records accessed)

---

## 7. Database Restructure

### 7.1 Current Pain Points

- `users` table mixes clinic staff, doctors, and potentially superadmins
- No clean `clinics` table with full profile data
- Operational hours stored as ad hoc or not at all
- No separation between doctors (clinical) and employees (operational)
- Location data not captured

### 7.2 New / Restructured Tables

```sql
-- ─────────────────────────────────────────
-- CLINICS (core tenant table — one row per clinic)
-- ─────────────────────────────────────────
CREATE TABLE public.clinics (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity (Step 1)
  name                TEXT NOT NULL,
  type                TEXT NOT NULL CHECK (type IN (
                        'general_dental','specialist_dental',
                        'polyclinic','dental_hospital')),
  logo_url            TEXT,

  -- Location (Step 2)
  latitude            DECIMAL(10, 8),
  longitude           DECIMAL(11, 8),
  province            TEXT,
  city                TEXT,
  district            TEXT,
  sub_district        TEXT,
  full_address        TEXT,
  postal_code         CHAR(5),
  google_maps_url     TEXT,

  -- Head of Clinic (Step 3)
  head_title          TEXT,          -- 'drg.' | 'dr.' | etc.
  head_name           TEXT,
  str_number          TEXT,
  str_expiry_date     DATE,
  sip_number          TEXT,
  sip_expiry_date     DATE,

  -- Contact (Step 5)
  email               TEXT,
  phone               TEXT,
  whatsapp            TEXT,
  website             TEXT,
  instagram_handle    TEXT,

  -- Status & lifecycle
  status              TEXT NOT NULL DEFAULT 'onboarding'
                        CHECK (status IN ('onboarding','active','suspended','churned')),
  onboarded_at        TIMESTAMPTZ,
  trial_ends_at       TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),

  -- Metadata
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- CLINIC_OPERATING_HOURS (Step 4 — replaces ad hoc storage)
-- One row per day per clinic
-- ─────────────────────────────────────────
CREATE TABLE public.clinic_operating_hours (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id           UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  day_of_week         SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
                      -- 0 = Sunday, 1 = Monday, ... 6 = Saturday
  is_open             BOOLEAN NOT NULL DEFAULT TRUE,
  open_time           TIME,                      -- e.g. 08:00
  close_time          TIME,                      -- e.g. 17:00
  break_start         TIME,                      -- e.g. 12:00 (nullable)
  break_end           TIME,                      -- e.g. 13:00 (nullable)
  slot_duration_mins  SMALLINT DEFAULT 30,
  accept_walk_in      BOOLEAN DEFAULT FALSE,
  UNIQUE (clinic_id, day_of_week)
);

-- ─────────────────────────────────────────
-- CLINIC_USERS (junction: user ↔ clinic ↔ role)
-- One user can belong to multiple clinics (multi-branch)
-- Replaces role column on users table
-- ─────────────────────────────────────────
CREATE TABLE public.clinic_users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id           UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role                TEXT NOT NULL CHECK (role IN (
                        'clinic_admin',
                        'receptionist',
                        'dentist',
                        'specialist_dentist',
                        'nurse',
                        'assistant',
                        'pharmacist',
                        'admin')),
  status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('pending','active','inactive')),
  invited_by          UUID REFERENCES auth.users(id),
  date_started        DATE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (clinic_id, user_id)           -- one role per user per clinic
);

-- ─────────────────────────────────────────
-- USERS (public profile — supplements auth.users)
-- Slimmed down: no role column here anymore
-- ─────────────────────────────────────────
CREATE TABLE public.user_profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           TEXT NOT NULL,
  phone               TEXT,
  whatsapp            TEXT,
  avatar_url          TEXT,
  date_of_birth       DATE,
  gender              TEXT CHECK (gender IN ('male','female','other')),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- DOCTORS (clinical profile — extends clinic_users where role = 'dentist')
-- Separate from employees — has clinical-specific fields
-- ─────────────────────────────────────────
CREATE TABLE public.doctors (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id           UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id             UUID REFERENCES auth.users(id),  -- nullable if doctor not a system user
  title               TEXT NOT NULL,   -- 'drg.' | 'drg. Sp.' | etc.
  full_name           TEXT NOT NULL,
  specialization      TEXT,            -- e.g. 'Orthodontics', 'Periodontics'
  str_number          TEXT,
  str_expiry_date     DATE,
  sip_number          TEXT,
  sip_expiry_date     DATE,
  consultation_fee    DECIMAL(12,2),
  is_head_of_clinic   BOOLEAN DEFAULT FALSE,
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- EMPLOYEE_PERMISSIONS (optional fine-grained overrides)
-- Overrides on top of the base role permissions
-- ─────────────────────────────────────────
CREATE TABLE public.employee_permissions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_user_id      UUID NOT NULL REFERENCES public.clinic_users(id) ON DELETE CASCADE,
  permission_key      TEXT NOT NULL,   -- e.g. 'billing.view', 'patients.export'
  is_granted          BOOLEAN NOT NULL DEFAULT TRUE,
  set_by              UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (clinic_user_id, permission_key)
);

-- ─────────────────────────────────────────
-- ONBOARDING_PROGRESS (track wizard state for resume support)
-- ─────────────────────────────────────────
CREATE TABLE public.onboarding_progress (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id           UUID UNIQUE NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  current_step        SMALLINT NOT NULL DEFAULT 1,  -- 1–6
  step_data           JSONB NOT NULL DEFAULT '{}',  -- draft state per step
  completed_steps     SMALLINT[] DEFAULT '{}',
  last_saved_at       TIMESTAMPTZ DEFAULT NOW()
);
```

### 7.3 Key Indexes

```sql
-- Fast clinic lookup by user
CREATE INDEX idx_clinic_users_user_id ON public.clinic_users(user_id);
CREATE INDEX idx_clinic_users_clinic_id ON public.clinic_users(clinic_id);

-- Geospatial search (future — find clinics near a location)
CREATE INDEX idx_clinics_location ON public.clinics(latitude, longitude);

-- STR expiry monitoring (for alerts)
CREATE INDEX idx_doctors_str_expiry ON public.doctors(str_expiry_date);
CREATE INDEX idx_clinics_str_expiry ON public.clinics(str_expiry_date);

-- Operating hours lookup
CREATE INDEX idx_operating_hours_clinic ON public.clinic_operating_hours(clinic_id, day_of_week);

-- Active clinic users
CREATE INDEX idx_clinic_users_status ON public.clinic_users(clinic_id, status);
```

### 7.4 Row Level Security Policies

```sql
-- Clinic users can only see their own clinic's data
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic_isolation" ON public.clinics
  FOR ALL USING (
    id IN (
      SELECT clinic_id FROM public.clinic_users
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Users can only see clinic_users in their own clinic
ALTER TABLE public.clinic_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_clinic_only" ON public.clinic_users
  FOR ALL USING (
    clinic_id IN (
      SELECT clinic_id FROM public.clinic_users
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Only clinic_admin can insert/update/delete employees
CREATE POLICY "admin_manage_users" ON public.clinic_users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clinic_users
      WHERE user_id = auth.uid()
        AND clinic_id = clinic_users.clinic_id
        AND role = 'clinic_admin'
        AND status = 'active'
    )
  );
```

### 7.5 Migration Plan (from current schema)

```sql
-- Step 1: Create new tables above (non-destructive)

-- Step 2: Migrate existing clinic data into public.clinics
INSERT INTO public.clinics (id, name, email, status, created_at)
SELECT id, name, email, 'active', created_at FROM old_clinics_table;

-- Step 3: Migrate users into user_profiles + clinic_users
INSERT INTO public.user_profiles (id, full_name, phone, avatar_url)
SELECT id, full_name, phone, avatar_url FROM public.users;

INSERT INTO public.clinic_users (clinic_id, user_id, role, status)
SELECT clinic_id, id, role, 
  CASE WHEN is_active THEN 'active' ELSE 'inactive' END
FROM public.users WHERE clinic_id IS NOT NULL;

-- Step 4: Migrate doctors data
INSERT INTO public.doctors (clinic_id, user_id, title, full_name, str_number, ...)
SELECT clinic_id, id, title, full_name, str_number, ...
FROM public.users WHERE role IN ('dentist', 'specialist_dentist');

-- Step 5: Validate counts, then drop old columns
-- Step 6: Update all application queries to use new schema
-- Run in staging first, validate, then production
```

---

## 8. Suggested Improvements

Beyond what was requested, here are high-value additions that fit naturally into this feature set:

### 💡 Suggestion 1: STR Expiry Alert System
**What:** Auto-check STR expiry dates for Head of Clinic and all doctors. Send email + in-app notification 90, 60, and 30 days before expiry.  
**Why:** Expired STR means the clinic is technically operating illegally — a huge liability. Proactively protecting clinics builds trust.  
**Effort:** Low — a Supabase `pg_cron` job running daily.

### 💡 Suggestion 2: Onboarding Completion Score
**What:** A persistent "Clinic Health Score" widget on the dashboard showing completeness (e.g. 78%) — with specific items still missing like "Add your first doctor," "Upload your clinic logo," "Connect WhatsApp."  
**Why:** Drives feature adoption post-onboarding. Clinics that complete setup churn far less.  
**Effort:** Low — compute from existing data, display as a card.

### 💡 Suggestion 3: Clinic Public Profile Page
**What:** A public-facing, shareable URL at `/clinic/[clinic-slug]` showing: clinic name, location map, operating hours, services, and a "Book an Appointment" button (if patient portal enabled).  
**Why:** Clinics can share this link on Instagram bio, WhatsApp status, or Google My Business — free marketing for them, new patient acquisition vector for you.  
**Effort:** Medium — read-only view of already-collected data.

### 💡 Suggestion 4: "Invite as Doctor" from Employee Tab
**What:** From the Doctors tab, if a doctor doesn't have a system account yet, allow the admin to invite them via email directly.  
**Why:** Currently, adding a doctor and creating their user account are separate steps — friction.  
**Effort:** Low — reuse the invite flow from the Employee tab.

### 💡 Suggestion 5: Working Hours → Auto-Blocks in Scheduler
**What:** Operational hours entered in Step 4 of onboarding automatically block time slots outside those hours in the appointment scheduler — no duplicate setup required.  
**Why:** Today, admins set operating hours in settings AND separately configure slot availability. Redundant and error-prone.  
**Effort:** Low — the `clinic_operating_hours` table feeds directly into the availability check query.

### 💡 Suggestion 6: Duplicate Clinic Detection
**What:** Before finalising Step 6 (Review & Launch), run a fuzzy match check — if a clinic with a very similar name already exists in the same city, show a warning: *"A clinic named 'Klinik Gigi Sehat' in Jakarta already exists. Is this a duplicate registration?"*  
**Why:** Prevents test accounts and accidental duplicate signups polluting the database.  
**Effort:** Low — `pg_trgm` extension for fuzzy text matching.

### 💡 Suggestion 7: Employee Schedule (Shift Management)
**What:** On each employee's profile, allow setting their weekly shift schedule — separate from the clinic's operating hours and doctor's appointment slots.  
**Why:** Clinics need to know which receptionist is on duty for a given day, especially for multi-shift setups.  
**Effort:** Medium — reuse the `clinic_operating_hours` pattern with a `clinic_user_id` FK.

### 💡 Suggestion 8: Role-Based Dashboard Sidebar
**What:** After login, the dashboard sidebar adapts based on the user's role:  
- `clinic_admin` → all tabs visible  
- `receptionist` → Patients, Appointments, Billing only  
- `dentist` → Patients, Appointments, their own schedule only  
- `nurse` / `assistant` → limited Patients view  
**Why:** Currently, all staff see all tabs — a nurse shouldn't see billing data.  
**Effort:** Low — role is now cleanly in `clinic_users.role`, easy to conditionally render tabs.

---

## 9. UI/UX Notes

### Onboarding Progress Bar
```
●━━━━━━━━━●━━━━━━━━━○━━━━━━━━━○━━━━━━━━━○━━━━━━━━━○
1.Identity  2.Location  3.Head     4.Hours    5.Contact  6.Review
```
- Completed steps show a checkmark ✅
- Current step is highlighted
- Future steps are greyed out but visible (gives a sense of how far)

### Map Component Behaviour
- Default view: Indonesia-centred on load
- After province selection: map zooms to that province
- Draggable pin with bounce animation on drop
- "Use my current location" button (browser geolocation API, no cost) — autofills coordinates and triggers reverse geocode
- Mobile-friendly: map works with touch drag

### Step Save Behaviour
- Every step auto-saves on "Next" click to `onboarding_progress.step_data`
- If user closes tab and returns: wizard resumes at last incomplete step
- Toast notification: *"Progress saved. You can continue later."*

### Empty States After Onboarding
- Employee tab empty state: illustration + "No employees yet. Invite your receptionist to get started." → `[+ Invite Employee]` button
- Doctors tab empty state: "Add your first doctor to start scheduling appointments." → `[+ Add Doctor]`

---

## 10. Acceptance Criteria

### Registration
- [ ] Every new registration automatically creates a `clinic` row with `status: 'onboarding'`
- [ ] Every new registrant gets `role: 'clinic_admin'` in `clinic_users`
- [ ] Unauthenticated users cannot access `/onboarding` or `/dashboard`
- [ ] Users with `clinic.status = 'onboarding'` are redirected to `/onboarding` from all protected routes

### Onboarding Wizard
- [ ] All 6 steps render correctly on mobile (375px) and desktop
- [ ] Step 2 map loads using Leaflet + OpenStreetMap with no API key
- [ ] Nominatim geocoder returns results within 2 seconds for Indonesian address queries
- [ ] Dragging the map pin triggers reverse geocoding and populates address fields
- [ ] STR number field validated for format before proceeding from Step 3
- [ ] Operating hours from Step 4 are saved to `clinic_operating_hours` table
- [ ] Onboarding progress persists through browser refresh
- [ ] On Step 6 submit: `clinic.status` → `'active'`, redirect to `/dashboard` with welcome modal
- [ ] Superadmin Control Room reflects new active clinic within 60 seconds

### Employee Tab
- [ ] Employee tab appears immediately after Doctors tab in dashboard nav
- [ ] Non-doctor roles (Receptionist, Perawat, Assistant, Apoteker, Admin) are addable from Employee tab
- [ ] Dentist role is NOT selectable in Employee tab add modal
- [ ] Invite email sent via Supabase `inviteUserByEmail()` on employee add
- [ ] Invited employee appears as `status: pending` until account accepted
- [ ] Deactivate / Reactivate employee updates `clinic_users.status` and blocks login immediately
- [ ] Only `clinic_admin` role can add, edit, or deactivate employees

### Database
- [ ] No `clinic_id` nulls in `clinic_users` after migration
- [ ] RLS policies prevent any user accessing another clinic's data
- [ ] `clinic_operating_hours` has exactly one row per day per clinic after onboarding
- [ ] `onboarding_progress` row is deleted on clinic activation (cleanup)

---

## 11. Delivery Estimate

| Module | Complexity | Estimated Dev Time |
|--------|-----------|-------------------|
| Registration → auto clinic_admin + clinic row | Low | 1–2 days |
| Onboarding middleware guard | Low | 0.5 days |
| Step 1: Clinic Identity | Low | 1 day |
| Step 2: Location + Leaflet Map + Nominatim | Medium | 3–4 days |
| Step 3: Head of Clinic + STR fields | Low | 1 day |
| Step 4: Operating Schedule UI | Medium | 2 days |
| Step 5: Contact Info | Low | 0.5 days |
| Step 6: Review & Launch | Low | 1 day |
| Resume/draft persistence | Medium | 1–2 days |
| Employee Tab (list + add + deactivate) | Medium | 3 days |
| Employee invite flow | Low | 1 day |
| Database migration + RLS policies | Medium | 2–3 days |
| **Total** | | **~17–22 working days** |

---

*Document Owner: Product Team, DentiCare Pro*  
*Classification: Internal*  
*Related PRDs: DentiCare Phase 2 PRD v2.0 · Superadmin Control Room PRD v1.1*  
*Next Review: April 2026*
