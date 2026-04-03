# DentiCare Pro — Mini PRD
## User Permissions, Role System, Service Tiers & Paywall
**Version:** 1.2  
**Type:** Mini / Incremental Improvement  
**Status:** Draft  
**Date:** April 2026  
**Scope:** RBAC redesign, Free/Pro tiering, paywall gates, permission matrix

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Role Definitions](#2-role-definitions)
3. [Permission Matrix](#3-permission-matrix)
4. [Service Tier Definitions (Free vs Pro)](#4-service-tier-definitions-free-vs-pro)
5. [Paywall Design & Gates](#5-paywall-design--gates)
6. [Database Schema](#6-database-schema)
7. [Frontend Implementation Guide](#7-frontend-implementation-guide)
8. [Backend Enforcement](#8-backend-enforcement)
9. [Upgrade Flow & Billing](#9-upgrade-flow--billing)
10. [Suggested Improvements](#10-suggested-improvements)
11. [Acceptance Criteria](#11-acceptance-criteria)
12. [Delivery Estimate](#12-delivery-estimate)

---

## 1. Problem Statement

The current system has a flat, inconsistently enforced role model. All clinic users see the same dashboard regardless of their function. There is no monetisation gate — every user gets full access forever. This creates:

- **Security risk:** Receptionists can access financial reports; nurses can modify billing
- **No revenue model:** Zero friction between free and paid usage prevents monetisation
- **Admin confusion:** Clinic owners can't restrict what their staff see or do
- **Superadmin sprawl:** Platform-level access mixed with clinic-level access in the same table

This PRD introduces a clean **5-role system**, a **Free/Pro tier**, and a **paywall architecture** that converts free users to paying customers without blocking core functionality.

---

## 2. Role Definitions

### 2.1 Role Hierarchy Overview

```
PLATFORM LEVEL
┌─────────────────────────────────────────────────────┐
│  SUPERADMIN                                         │
│  Platform operator only. God mode. Cannot be        │
│  assigned during clinic registration.               │
└─────────────────────────────────────────────────────┘

CLINIC LEVEL (scoped per clinic)
┌────────────┐   ┌────────────┐   ┌────────────┐   ┌─────────────┐
│   ADMIN    │   │   DOCTOR   │   │  FINANCE   │   │ FRONT DESK  │
│ (default)  │   │            │   │            │   │             │
└────────────┘   └────────────┘   └────────────┘   └─────────────┘
      ↑
      Admin = Doctor + Finance + Front Desk (union of all clinic roles)
```

---

### 2.2 SUPERADMIN

**Who:** DentiCare Pro internal platform operators (seeded via CLI, never via UI).  
**Context:** Platform-wide, not scoped to any single clinic.

**Can:**
- Access the Superadmin Control Room (`controlroom.domain.com`)
- View, edit, and delete data across ALL clinics
- Manage all clinic registrations (activate, suspend, churn)
- Assign and revoke roles for any user on the platform
- Configure platform-wide integrations (WhatsApp, OTP, BPJS)
- Toggle feature flags per clinic
- View all audit logs
- Manage service tiers and billing manually
- Create and deactivate other Superadmin accounts (owner tier only)

**Cannot:**
- Pose as a clinic-level user without explicitly impersonating (with audit log)
- Delete audit logs

**Login:** `controlroom.domain.com` — separate subdomain, TOTP mandatory.

---

### 2.3 ADMIN

**Who:** The person who registers a new clinic. Default role on registration.  
**Context:** Scoped to their own clinic(s). Can manage multiple clinics if on Pro tier.

**Think of Admin as:** Doctor + Finance + Front Desk — full clinic-level access.

**Can (everything a clinic owner needs):**
- Access the full `/dashboard` (all tabs)
- View analytics and revenue reports
- View, create, edit, and delete patient records
- View and manage all appointments
- Create and manage invoices / Tagihan (billing)
- View and manage finance settlements
- Add new users to their clinic
- Assign roles: Doctor, Finance, Front Desk
- Remove users from their clinic
- Edit clinic settings (profile, hours, location, integrations)
- Create and manage doctor schedules
- Create Surat Izin (clinical letters)
- Invite doctors (subject to tier limits)
- Export data (CSV, PDF reports)

**Cannot:**
- Access Superadmin Control Room
- See other clinics' data
- Modify platform-wide settings
- Exceed tier limits (Free: 1 clinic, 2 doctors, 1 receptionist)

**Tier interaction:**
- **Free Admin:** capped at 1 clinic, 2 doctors, 1 Front Desk user
- **Pro Admin:** unlimited clinics, unlimited users per clinic

---

### 2.4 DOCTOR

**Who:** Licensed dental professional invited by Admin.  
**Context:** Scoped to their clinic. Can only see data assigned to them.

**Can:**
- View their own appointment schedule (today, week, month)
- View patient history for patients assigned to their appointments
- View patient medical records linked to their consultations
- Create and edit medical record entries for their patients
- Create **Surat Izin** (sick letters, referral letters) for their patients
- View their own doctor profile and schedule
- Update their own availability / leave

**Cannot:**
- View other doctors' appointments or patients
- Create or edit invoices / Tagihan
- View finance reports or settlements
- Add new users or assign roles
- Edit clinic settings
- Access the Staff / Employee tab
- View analytics dashboard

**Dashboard tabs visible:** Appointments (own only) | Patients (own only) | Medical Records (own only)

---

### 2.5 FINANCE

**Who:** Bookkeeper, accountant, or billing officer invited by Admin.  
**Context:** Read-only + limited write on financial data only.

**Can:**
- View all invoices / Tagihan (all status: draft, sent, paid, overdue)
- View payment settlements and transaction history
- View revenue reports and financial analytics
- Download financial reports (CSV, PDF)
- Mark invoices as paid (record manual payment)
- View patient names and invoice amounts (not full medical records)

**Cannot:**
- View or edit patient medical records or clinical notes
- View or create appointments
- Create new invoices (can only view and mark payment)
- Add new users or assign roles
- Edit clinic settings
- Access doctor schedules
- Create Surat Izin

**Dashboard tabs visible:** Billing | Finance Reports

---

### 2.6 FRONT DESK

**Who:** Receptionist, clinic assistant at the counter. Invited by Admin.  
**Context:** Operational focus — patient intake and scheduling.

**Can:**
- Add new patients (create patient profile)
- Edit patient demographic info (not medical records)
- View patient list and search
- Create new appointments
- View and manage the appointment calendar (all doctors)
- Update appointment status (confirmed, arrived, no-show, cancelled)
- Create **Tagihan** (invoice/bill) for a patient visit
- View invoice status (not financial reports or settlements)
- Send appointment reminders manually
- Check-in patients on arrival

**Cannot:**
- View or edit medical records or clinical notes
- View financial reports, settlements, or revenue analytics
- Add new users or assign roles
- Edit clinic settings or doctor schedules
- Create Surat Izin
- Export bulk data
- Access the Doctors or Employee management tabs

**Dashboard tabs visible:** Patients (demographic only) | Appointments | Billing (create + status view only)

---

## 3. Permission Matrix

Legend: `✅` Full access · `👁` View only · `✏️` Create/edit own · `🚫` No access · `⚠️` Partial (see notes)

### 3.1 Module Access

| Module / Feature | Superadmin | Admin | Doctor | Finance | Front Desk |
|-----------------|:----------:|:-----:|:------:|:-------:|:----------:|
| **Superadmin Control Room** | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| **Analytics Dashboard** | ✅ | ✅ | 🚫 | 👁 | 🚫 |
| **All Clinics (cross-tenant)** | ✅ | 🚫 | 🚫 | 🚫 | 🚫 |
| **Clinic Settings** | ✅ | ✅ | 🚫 | 🚫 | 🚫 |
| **Clinic Profile Edit** | ✅ | ✅ | 🚫 | 🚫 | 🚫 |
| **Patient List** | ✅ | ✅ | ⚠️ Own | 👁 Name only | ✅ |
| **Patient Records (medical)** | ✅ | ✅ | ⚠️ Own | 🚫 | 🚫 |
| **Patient Create / Edit** | ✅ | ✅ | 🚫 | 🚫 | ✅ |
| **Odontogram** | ✅ | ✅ | ✏️ Own | 🚫 | 🚫 |
| **Appointments (all doctors)** | ✅ | ✅ | 🚫 | 🚫 | ✅ |
| **Appointments (own)** | ✅ | ✅ | ✅ | 🚫 | ✅ |
| **Appointment Create** | ✅ | ✅ | 🚫 | 🚫 | ✅ |
| **Doctor Schedules** | ✅ | ✅ | ⚠️ Own | 🚫 | 👁 |
| **Invoices / Tagihan (view)** | ✅ | ✅ | 🚫 | ✅ | ⚠️ Own created |
| **Invoices / Tagihan (create)** | ✅ | ✅ | 🚫 | 🚫 | ✅ |
| **Mark Invoice Paid** | ✅ | ✅ | 🚫 | ✅ | 🚫 |
| **Finance Reports / Settlements** | ✅ | ✅ | 🚫 | ✅ | 🚫 |
| **Export Financial Data** | ✅ | ✅ | 🚫 | ✅ | 🚫 |
| **Surat Izin (Create)** | ✅ | ✅ | ✅ Own | 🚫 | 🚫 |
| **Inventory / Items** | ✅ | ✅ | 👁 | 🚫 | 🚫 |
| **Services Catalog** | ✅ | ✅ | 👁 | 👁 | 👁 |
| **Staff / Employee Tab** | ✅ | ✅ | 🚫 | 🚫 | 🚫 |
| **Invite Users** | ✅ | ✅ | 🚫 | 🚫 | 🚫 |
| **Assign Roles** | ✅ | ✅ | 🚫 | 🚫 | 🚫 |
| **Deactivate Users** | ✅ | ✅ | 🚫 | 🚫 | 🚫 |
| **Audit Log** | ✅ | 👁 Own clinic | 🚫 | 🚫 | 🚫 |
| **Activity Log** | ✅ | ✅ | 🚫 | 🚫 | 🚫 |
| **Tier & Billing (own account)** | ✅ | ✅ | 🚫 | 🚫 | 🚫 |
| **WhatsApp Integration** | ✅ | ✅ | 🚫 | 🚫 | 🚫 |
| **BPJS Integration** | ✅ | ✅ | 👁 | 👁 | 🚫 |
| **Data Export (bulk)** | ✅ | ✅ | 🚫 | ✅ Finance | 🚫 |

### 3.2 Dashboard Tab Visibility

| Tab | Superadmin | Admin | Doctor | Finance | Front Desk |
|-----|:----------:|:-----:|:------:|:-------:|:----------:|
| Dashboard (Analytics) | ✅ | ✅ | 🚫 | 👁 Finance only | 🚫 |
| Patients | ✅ | ✅ | ✅ Own | 🚫 | ✅ |
| Doctors | ✅ | ✅ | 🚫 | 🚫 | 🚫 |
| Employees | ✅ | ✅ | 🚫 | 🚫 | 🚫 |
| Appointments | ✅ | ✅ | ✅ Own | 🚫 | ✅ |
| Billing / Tagihan | ✅ | ✅ | 🚫 | ✅ | ✅ Create only |
| Settings | ✅ | ✅ | 🚫 | 🚫 | 🚫 |

---

## 4. Service Tier Definitions (Free vs Pro)

### 4.1 Tier Summary

| Feature | 🆓 Free | ⭐ Pro |
|---------|:-------:|:-----:|
| **Price** | Rp 0 / month | Rp 299.000 / month (or Rp 2.990.000 / year — 2 months free) |
| **Clinics** | 1 | Unlimited |
| **Doctors per clinic** | 2 | Unlimited |
| **Front Desk users per clinic** | 1 | Unlimited |
| **Finance users per clinic** | 0 | Unlimited |
| **Admin users per clinic** | 1 (self) | Unlimited |
| **Total users per clinic** | 4 (self + 2 doctors + 1 FD) | Unlimited |
| **Patients** | Unlimited | Unlimited |
| **Appointments** | Unlimited | Unlimited |
| **Invoices** | Unlimited | Unlimited |
| **Analytics Dashboard** | Basic (7-day) | Full (all time + export) |
| **WhatsApp Reminders** | 🚫 | ✅ |
| **Patient Portal** | 🚫 | ✅ |
| **BPJS Integration** | 🚫 | ✅ |
| **AI Clinical Notes** | 🚫 | ✅ |
| **Data Export (CSV/PDF)** | 🚫 | ✅ |
| **Surat Izin Templates** | 1 template | Unlimited custom templates |
| **Storage** | 1 GB | 25 GB |
| **Priority Support** | Community only | Email + WhatsApp support |
| **Custom Subdomain** | 🚫 | ✅ (`klinik-anda.denticare.pro`) |

### 4.2 Free Tier Limits — Hard Caps

These are enforced at the API level, not just the UI:

```typescript
const FREE_TIER_LIMITS = {
  clinics:        1,    // total clinics per account
  doctors:        2,    // per clinic
  front_desk:     1,    // per clinic
  finance_users:  0,    // Finance role not available on Free
  admin_users:    1,    // only the owner (self)
  storage_gb:     1,
  analytics_days: 7,    // analytics lookback window
  surat_izin_templates: 1,
} as const;
```

### 4.3 What "Unlimited" Means on Pro

Pro has no hard caps on users or clinics. Soft limits apply for abuse prevention:
- More than 50 clinics per account → flagged for review by Superadmin
- More than 500 users per clinic → contact support for enterprise pricing
- Storage over 25 GB → prorated overage at Rp 5.000/GB/month

---

## 5. Paywall Design & Gates

### 5.1 Paywall Philosophy

> **"Let the user feel the value before hitting the wall."**

Never block a user mid-task. Show the upgrade prompt at the *moment of intent*, not as a blocker. The user should always understand *why* they're being prompted and *exactly* what they get by upgrading.

Three types of paywall interactions:

| Type | When Used | Example |
|------|-----------|---------|
| **Hard Gate** | Feature completely unavailable on Free | Trying to enable WhatsApp Reminders |
| **Limit Gate** | User has reached a Free tier numerical cap | Adding a 3rd doctor when limit is 2 |
| **Upgrade Nudge** | Feature available but with soft limitation | Analytics showing "Upgrade to see full history" |

---

### 5.2 Hard Gates — Locked Features

When a Free user clicks on a Pro-only feature, show a **Feature Lock Modal**:

```
┌──────────────────────────────────────────────┐
│  🔒  Fitur ini tersedia untuk Pro            │
│                                              │
│  WhatsApp Reminders otomatis membantu        │
│  mengurangi no-show hingga 30%.              │
│                                              │
│  ✅  Reminder otomatis H-48, H-24, H-2      │
│  ✅  Two-way confirmation dari pasien        │
│  ✅  Template pesan kustom                  │
│                                              │
│  ⭐  Upgrade ke Pro — Rp 299.000/bulan      │
│                                              │
│  [Lihat Semua Fitur Pro]  [Upgrade Sekarang] │
│                      [Mungkin Nanti]         │
└──────────────────────────────────────────────┘
```

**Hard-gated features for Free tier:**
- WhatsApp Reminders toggle
- Patient Portal activation
- BPJS Integration setup
- AI Clinical Notes
- Finance role assignment (Finance users = 0 on Free)
- Analytics beyond 7 days
- Data export (CSV/PDF)
- Custom Surat Izin templates (beyond 1)
- Adding a 2nd clinic

**UI treatment for locked items:**
- Show the menu item/tab, but with a `🔒` lock icon and dimmed state
- Clicking it opens the Feature Lock Modal
- Never hide the feature entirely — hidden features aren't desired features

---

### 5.3 Limit Gates — User/Clinic Cap Reached

When a Free user tries to exceed a numerical limit, show a **Limit Reached Modal**:

**Example: Adding a 3rd doctor**
```
┌──────────────────────────────────────────────┐
│  ⚠️  Batas dokter Free tercapai             │
│                                              │
│  Akun Free dapat menambahkan maksimal        │
│  2 dokter per klinik.                        │
│                                              │
│  Kamu sudah memiliki:  2 / 2 dokter         │
│                                              │
│  Upgrade ke Pro untuk menambahkan dokter     │
│  tanpa batas di semua klinikmu.              │
│                                              │
│  [Upgrade ke Pro]    [Kelola Dokter Yang Ada]│
└──────────────────────────────────────────────┘
```

**Limit scenarios and their triggers:**

| Scenario | Trigger Point | Modal Copy Key |
|----------|--------------|----------------|
| Add 3rd doctor | Click "+ Add Doctor" | `limit.doctors` |
| Add 2nd Front Desk | Click "+ Invite Employee" with role=FD | `limit.front_desk` |
| Add Finance user | Click "+ Invite Employee" with role=Finance | `limit.finance_free` |
| Add 2nd clinic | Click "+ Create Clinic" | `limit.clinics` |
| Export data | Click any export button | `limit.export` |

---

### 5.4 Upgrade Nudge — Soft Prompts

Non-blocking hints shown inline, within the normal flow:

**Analytics — 7-day limit:**
```
[Chart showing 7 days of data]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⭐ Upgrade untuk melihat histori lengkap + ekspor laporan
[Coba Pro Gratis 14 Hari]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Usage bar in Settings → Billing:**
```
Dokter          ██████████░░░░░░  2 / 2  [+]
Front Desk      █████░░░░░░░░░░░  1 / 1  [+]
Klinik          █████░░░░░░░░░░░  1 / 1  [+]
Penyimpanan     ██░░░░░░░░░░░░░░  0.3 / 1 GB

Akun: Free  →  [⭐ Upgrade ke Pro]
```

**Persistent top banner (shown after 7 days on Free):**
```
[⭐] Tim kamu berkembang? Upgrade ke Pro dan tambahkan dokter tanpa batas.  [Lihat Pro →]  [×]
```
Show max once per 7 days. Dismissable. Never show during active clinical workflow.

---

### 5.5 Pro Trial — 14 Days Free

Every new registration gets a **14-day Pro trial** automatically:

```
New Account → Pro Trial (14 days) → 
  If upgraded → Pro
  If not → Free tier (with limits enforced from day 15)
```

**Trial banner (shown throughout trial period):**
```
┌─────────────────────────────────────────────────────────┐
│ ⭐ Pro Trial aktif · Sisa 11 hari                       │
│ Nikmati semua fitur Pro. Upgrade sebelum trial berakhir. │
│                              [Upgrade Sekarang]  [×]     │
└─────────────────────────────────────────────────────────┘
```

**At trial expiry (day 14):**
- Email sent 3 days before: *"Pro trial kamu berakhir dalam 3 hari"*
- Email sent on day 14: *"Pro trial berakhir hari ini"*
- On day 15: all Pro features locked, Free limits enforced
- A **full-screen modal** on next login:

```
┌──────────────────────────────────────────────────────────┐
│  Trial Pro kamu telah berakhir                           │
│                                                          │
│  Klinikmu telah berjalan dengan baik selama 14 hari!    │
│  Lanjutkan perjalananmu dengan Pro.                      │
│                                                          │
│  Yang akan berubah jika tetap Free:                      │
│  ⚠️  Dokter ke-3 dst tidak bisa login                   │
│  ⚠️  Reminder WhatsApp dinonaktifkan                    │
│  ⚠️  Ekspor data tidak tersedia                         │
│  ⚠️  Analitik terbatas ke 7 hari terakhir              │
│                                                          │
│  [⭐ Upgrade ke Pro — Rp 299.000/bln]                   │
│  [Lanjutkan dengan Free]                                 │
└──────────────────────────────────────────────────────────┘
```

---

### 5.6 What Happens to Existing Data When Downgrading

If a Pro user cancels and returns to Free:

| Data | Behaviour |
|------|-----------|
| Extra doctors (beyond 2) | Accounts preserved but **login blocked**. Status: `over_limit`. Admin gets a list to choose which 2 to keep active. |
| Extra Front Desk users | Same — login blocked, choose 1 to keep |
| Extra clinics (beyond 1) | All clinic data preserved. Clinics 2+ become `suspended`. Admin can reactivate by upgrading. |
| Finance users | Login blocked (role not available on Free) |
| WhatsApp reminders | Queued reminders cancelled. Historical logs kept. |
| Exported data | Already-downloaded files kept. Future exports locked. |
| Analytics history | Historical data preserved in DB. UI limited to 7-day window. |
| Storage over 1 GB | Read-only. No new uploads until under 1 GB or upgrade. |

**No data is ever deleted on downgrade.** Data is hidden or access-limited, not purged.

---

## 6. Database Schema

### 6.1 Updated Tables

```sql
-- ─────────────────────────────────────────
-- ENUM: ROLES
-- ─────────────────────────────────────────
CREATE TYPE user_role AS ENUM (
  'superadmin',    -- platform level only
  'admin',         -- clinic owner / manager
  'doctor',        -- clinical staff
  'finance',       -- billing/accounting
  'front_desk'     -- receptionist / front office
);

-- ─────────────────────────────────────────
-- ENUM: SERVICE TIERS
-- ─────────────────────────────────────────
CREATE TYPE service_tier AS ENUM (
  'free',
  'pro_trial',
  'pro',
  'enterprise'    -- future
);

-- ─────────────────────────────────────────
-- ACCOUNTS (one per registered user — links to auth.users)
-- Owns the subscription / tier
-- ─────────────────────────────────────────
CREATE TABLE public.accounts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id       UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Tier & billing
  tier                service_tier NOT NULL DEFAULT 'pro_trial',
  trial_ends_at       TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  tier_activated_at   TIMESTAMPTZ,
  tier_expires_at     TIMESTAMPTZ,            -- null = active indefinitely (annual)
  stripe_customer_id  TEXT,                   -- or Midtrans equivalent
  stripe_sub_id       TEXT,

  -- Limits enforcement (cache — recomputed on change)
  clinics_used        SMALLINT DEFAULT 0,
  storage_used_bytes  BIGINT DEFAULT 0,

  -- Status
  is_active           BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- TIER LIMITS (config table — one row per tier)
-- Makes limits configurable without code deploy
-- ─────────────────────────────────────────
CREATE TABLE public.tier_limits (
  tier                service_tier PRIMARY KEY,
  max_clinics         SMALLINT NOT NULL DEFAULT 1,   -- -1 = unlimited
  max_doctors_per_clinic    SMALLINT NOT NULL DEFAULT 2,
  max_front_desk_per_clinic SMALLINT NOT NULL DEFAULT 1,
  max_finance_per_clinic    SMALLINT NOT NULL DEFAULT 0,
  max_admins_per_clinic     SMALLINT NOT NULL DEFAULT 1,
  max_storage_gb      SMALLINT NOT NULL DEFAULT 1,   -- -1 = unlimited
  analytics_days      SMALLINT NOT NULL DEFAULT 7,   -- -1 = unlimited
  can_export          BOOLEAN NOT NULL DEFAULT FALSE,
  can_whatsapp        BOOLEAN NOT NULL DEFAULT FALSE,
  can_bpjs            BOOLEAN NOT NULL DEFAULT FALSE,
  can_ai_notes        BOOLEAN NOT NULL DEFAULT FALSE,
  can_patient_portal  BOOLEAN NOT NULL DEFAULT FALSE,
  max_surat_izin_templates SMALLINT NOT NULL DEFAULT 1,
  can_custom_subdomain BOOLEAN NOT NULL DEFAULT FALSE
);

-- Seed the limits config
INSERT INTO public.tier_limits VALUES
  ('free',       1,  2, 1, 0, 1,  1,  7,  false, false, false, false, false, 1,  false),
  ('pro_trial', -1, -1,-1,-1,-1, 25, -1,  true,  true,  true,  true,  true, -1, false),
  ('pro',       -1, -1,-1,-1,-1, 25, -1,  true,  true,  true,  true,  true, -1, true),
  ('enterprise',-1, -1,-1,-1,-1, -1, -1,  true,  true,  true,  true,  true, -1, true);

-- ─────────────────────────────────────────
-- CLINIC_USERS (junction: user ↔ clinic ↔ role)
-- ─────────────────────────────────────────
CREATE TABLE public.clinic_users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id           UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id          UUID NOT NULL REFERENCES public.accounts(id),
  role                user_role NOT NULL,
  status              TEXT NOT NULL DEFAULT 'active'
                        CHECK (status IN ('pending','active','inactive','over_limit')),
  invited_by          UUID REFERENCES auth.users(id),
  date_started        DATE,
  permissions_override JSONB DEFAULT '{}',   -- fine-grained overrides on top of role
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (clinic_id, user_id)
);

-- ─────────────────────────────────────────
-- PERMISSION OVERRIDES (optional per-user fine-grained control)
-- ─────────────────────────────────────────
CREATE TABLE public.user_permission_overrides (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_user_id      UUID NOT NULL REFERENCES public.clinic_users(id) ON DELETE CASCADE,
  permission_key      TEXT NOT NULL,
  -- Examples:
  --   'billing.mark_paid'      → Finance can/cannot mark paid
  --   'patients.export'        → specific export permission
  --   'appointments.cancel'    → Front Desk can/cannot cancel
  is_granted          BOOLEAN NOT NULL,
  granted_by          UUID REFERENCES auth.users(id),
  reason              TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (clinic_user_id, permission_key)
);

-- ─────────────────────────────────────────
-- SUBSCRIPTION_EVENTS (audit trail for billing)
-- ─────────────────────────────────────────
CREATE TABLE public.subscription_events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          UUID NOT NULL REFERENCES public.accounts(id),
  event_type          TEXT NOT NULL,
  -- 'trial_started' | 'trial_expired' | 'upgraded' | 'downgraded' |
  -- 'renewed' | 'cancelled' | 'payment_failed' | 'payment_succeeded'
  from_tier           service_tier,
  to_tier             service_tier,
  amount_idr          INTEGER,         -- in Rupiah
  payment_method      TEXT,
  reference_id        TEXT,            -- Midtrans order ID
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- VIEW: ACTIVE TIER (convenience view for app queries)
-- ─────────────────────────────────────────
CREATE OR REPLACE VIEW public.account_active_tier AS
SELECT
  a.id AS account_id,
  a.owner_user_id,
  CASE
    WHEN a.tier = 'pro_trial' AND a.trial_ends_at < NOW() THEN 'free'::service_tier
    ELSE a.tier
  END AS effective_tier,
  a.trial_ends_at,
  a.tier_expires_at,
  tl.*
FROM public.accounts a
JOIN public.tier_limits tl ON tl.tier = (
  CASE
    WHEN a.tier = 'pro_trial' AND a.trial_ends_at < NOW() THEN 'free'::service_tier
    ELSE a.tier
  END
);
```

### 6.2 Limit Enforcement Function

```sql
-- Function called before inserting a new clinic_user
-- Returns null (allow) or an error message (block)
CREATE OR REPLACE FUNCTION check_tier_limit(
  p_account_id UUID,
  p_clinic_id  UUID,
  p_role       user_role
) RETURNS TEXT AS $$
DECLARE
  v_tier        RECORD;
  v_count       INTEGER;
BEGIN
  -- Get effective tier limits
  SELECT * INTO v_tier
  FROM public.account_active_tier
  WHERE account_id = p_account_id;

  IF p_role = 'doctor' THEN
    SELECT COUNT(*) INTO v_count
    FROM public.clinic_users
    WHERE clinic_id = p_clinic_id AND role = 'doctor' AND status = 'active';

    IF v_tier.max_doctors_per_clinic != -1 AND v_count >= v_tier.max_doctors_per_clinic THEN
      RETURN 'limit.doctors';
    END IF;

  ELSIF p_role = 'front_desk' THEN
    SELECT COUNT(*) INTO v_count
    FROM public.clinic_users
    WHERE clinic_id = p_clinic_id AND role = 'front_desk' AND status = 'active';

    IF v_tier.max_front_desk_per_clinic != -1 AND v_count >= v_tier.max_front_desk_per_clinic THEN
      RETURN 'limit.front_desk';
    END IF;

  ELSIF p_role = 'finance' THEN
    IF v_tier.max_finance_per_clinic = 0 THEN
      RETURN 'limit.finance_free';
    END IF;

  ELSIF p_role = 'admin' THEN
    SELECT COUNT(*) INTO v_count
    FROM public.clinic_users
    WHERE clinic_id = p_clinic_id AND role = 'admin' AND status = 'active';

    IF v_tier.max_admins_per_clinic != -1 AND v_count >= v_tier.max_admins_per_clinic THEN
      RETURN 'limit.admins';
    END IF;
  END IF;

  RETURN NULL; -- no limit hit, allow
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 6.3 Row Level Security

```sql
-- Users can only access data in clinics they belong to
ALTER TABLE public.clinic_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_in_own_clinic" ON public.clinic_users
  FOR SELECT USING (
    clinic_id IN (
      SELECT clinic_id FROM public.clinic_users
      WHERE user_id = auth.uid() AND status IN ('active', 'pending')
    )
  );

-- Only admin role can modify clinic_users
CREATE POLICY "admin_can_manage_users" ON public.clinic_users
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.clinic_users
      WHERE user_id = auth.uid()
        AND clinic_id = clinic_users.clinic_id
        AND role IN ('admin', 'superadmin')
        AND status = 'active'
    )
  );

-- Superadmin bypass (uses service role key in Superadmin Control Room)
-- Service role key bypasses all RLS — only used in controlroom backend
```

---

## 7. Frontend Implementation Guide

### 7.1 Permission Hook

```typescript
// hooks/usePermissions.ts

import { useClinicUser } from './useClinicUser';
import { useAccountTier } from './useAccountTier';

type Permission =
  | 'patients.view' | 'patients.create' | 'patients.edit'
  | 'appointments.view' | 'appointments.create' | 'appointments.manage'
  | 'billing.view' | 'billing.create' | 'billing.mark_paid'
  | 'finance.reports' | 'finance.export'
  | 'medical.records.view' | 'medical.records.edit'
  | 'surat_izin.create'
  | 'staff.invite' | 'staff.manage'
  | 'clinic.settings'
  | 'analytics.view' | 'analytics.full';

const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  superadmin: ['*'], // all permissions
  admin: [
    'patients.view','patients.create','patients.edit',
    'appointments.view','appointments.create','appointments.manage',
    'billing.view','billing.create','billing.mark_paid',
    'finance.reports','finance.export',
    'medical.records.view','medical.records.edit',
    'surat_izin.create',
    'staff.invite','staff.manage',
    'clinic.settings',
    'analytics.view','analytics.full',
  ],
  doctor: [
    'patients.view',            // own patients only (filtered server-side)
    'appointments.view',        // own appointments only
    'medical.records.view',     // own patients only
    'medical.records.edit',     // own patients only
    'surat_izin.create',
  ],
  finance: [
    'billing.view',
    'billing.mark_paid',
    'finance.reports',
    'finance.export',
  ],
  front_desk: [
    'patients.view',
    'patients.create',
    'patients.edit',
    'appointments.view',
    'appointments.create',
    'appointments.manage',
    'billing.view',
    'billing.create',
  ],
};

export function usePermissions() {
  const { clinicUser } = useClinicUser();     // current user's role in this clinic
  const { tier, limits } = useAccountTier();  // account's service tier

  const can = (permission: Permission): boolean => {
    const role = clinicUser?.role;
    if (!role) return false;
    if (role === 'superadmin') return true;

    const rolePerms = ROLE_PERMISSIONS[role] || [];

    // Check permission override first
    const override = clinicUser.permissions_override?.[permission];
    if (override !== undefined) return override;

    return rolePerms.includes(permission);
  };

  const tierCan = (feature: keyof typeof limits): boolean => {
    return Boolean(limits[feature]);
  };

  const isWithinLimit = (limitKey: string, currentCount: number): boolean => {
    const limit = limits[limitKey as keyof typeof limits] as number;
    if (limit === -1) return true;   // unlimited
    return currentCount < limit;
  };

  return { can, tierCan, isWithinLimit, tier, limits };
}
```

### 7.2 Permission Guard Component

```tsx
// components/PermissionGate.tsx

import { usePermissions } from '@/hooks/usePermissions';
import { UpgradeModal } from './UpgradeModal';

interface Props {
  permission?: string;
  tierFeature?: string;
  limitKey?: string;
  currentCount?: number;
  fallback?: 'hide' | 'lock' | 'disable';
  upgradeReason?: string;
  children: React.ReactNode;
}

export function PermissionGate({
  permission,
  tierFeature,
  limitKey,
  currentCount = 0,
  fallback = 'hide',
  upgradeReason,
  children,
}: Props) {
  const { can, tierCan, isWithinLimit } = usePermissions();
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Check role-based permission
  if (permission && !can(permission as any)) {
    return fallback === 'hide' ? null : (
      <div className="opacity-40 cursor-not-allowed pointer-events-none">
        {children}
      </div>
    );
  }

  // Check tier-based feature
  if (tierFeature && !tierCan(tierFeature as any)) {
    if (fallback === 'hide') return null;
    return (
      <>
        <div
          className="relative cursor-pointer"
          onClick={() => setShowUpgrade(true)}
        >
          <div className="opacity-40 pointer-events-none">{children}</div>
          <span className="absolute top-1 right-1 text-xs bg-amber-100 
                           text-amber-700 px-1.5 py-0.5 rounded-full">
            🔒 Pro
          </span>
        </div>
        {showUpgrade && (
          <UpgradeModal
            feature={upgradeReason || tierFeature}
            onClose={() => setShowUpgrade(false)}
          />
        )}
      </>
    );
  }

  // Check numerical limits
  if (limitKey && !isWithinLimit(limitKey, currentCount)) {
    return (
      <>
        <button
          className="opacity-50 cursor-not-allowed"
          onClick={() => setShowUpgrade(true)}
        >
          {children}
        </button>
        {showUpgrade && (
          <UpgradeModal
            feature={upgradeReason || limitKey}
            onClose={() => setShowUpgrade(false)}
          />
        )}
      </>
    );
  }

  return <>{children}</>;
}
```

### 7.3 Dashboard Tab Rendering (Role-Aware)

```tsx
// components/DashboardTabs.tsx

const TAB_CONFIG = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    permission: 'analytics.view',
    href: '/dashboard',
  },
  {
    id: 'patients',
    label: 'Patients',
    icon: Users,
    permission: 'patients.view',
    href: '/dashboard/patients',
  },
  {
    id: 'doctors',
    label: 'Doctors',
    icon: Stethoscope,
    permission: 'staff.manage',  // admin only
    href: '/dashboard/doctors',
  },
  {
    id: 'employees',
    label: 'Employees',
    icon: UserCog,
    permission: 'staff.manage',  // admin only
    href: '/dashboard/employees',
  },
  {
    id: 'appointments',
    label: 'Appointments',
    icon: Calendar,
    permission: 'appointments.view',
    href: '/dashboard/appointments',
  },
  {
    id: 'billing',
    label: 'Billing',
    icon: Receipt,
    permission: 'billing.view',
    href: '/dashboard/billing',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    permission: 'clinic.settings',
    href: '/dashboard/settings',
  },
];

export function DashboardTabs() {
  const { can } = usePermissions();

  const visibleTabs = TAB_CONFIG.filter(tab => can(tab.permission as any));

  return (
    <nav className="flex border-b">
      {visibleTabs.map(tab => (
        <NavLink key={tab.id} to={tab.href} /* ... */ >
          <tab.icon size={16} />
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
```

### 7.4 Usage Bar Component (Settings → Billing page)

```tsx
// components/UsageBar.tsx
function UsageMeter({ label, used, max, limitKey, role }: UsageMeterProps) {
  const { tier } = usePermissions();
  const isUnlimited = max === -1;
  const pct = isUnlimited ? 0 : Math.min((used / max) * 100, 100);
  const isCritical = pct >= 90;

  return (
    <div className="flex items-center gap-3">
      <span className="w-32 text-sm text-gray-600">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        {!isUnlimited && (
          <div
            className={`h-2 rounded-full transition-all ${
              isCritical ? 'bg-red-500' : 'bg-blue-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        )}
      </div>
      <span className="text-sm font-mono w-20 text-right">
        {isUnlimited ? (
          <span className="text-green-600">∞ Unlimited</span>
        ) : (
          `${used} / ${max}`
        )}
      </span>
      {!isUnlimited && used >= max && (
        <PermissionGate tierFeature="unlimited_users" upgradeReason={limitKey}>
          <button className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">
            + Upgrade
          </button>
        </PermissionGate>
      )}
    </div>
  );
}
```

---

## 8. Backend Enforcement

### 8.1 API Route Middleware

Role and tier checks must be enforced **at the API / Edge Function level** — never rely solely on frontend hiding.

```typescript
// supabase/functions/_shared/auth.ts

export async function requirePermission(
  req: Request,
  permission: string,
  clinicId: string
): Promise<{ userId: string; role: string }> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) throw new UnauthorizedError();

  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) throw new UnauthorizedError();

  const { data: clinicUser } = await supabase
    .from('clinic_users')
    .select('role, status, permissions_override')
    .eq('user_id', user.id)
    .eq('clinic_id', clinicId)
    .eq('status', 'active')
    .single();

  if (!clinicUser) throw new ForbiddenError('Not a member of this clinic');

  const allowed = checkPermission(clinicUser.role, permission, clinicUser.permissions_override);
  if (!allowed) throw new ForbiddenError(`Role ${clinicUser.role} cannot ${permission}`);

  return { userId: user.id, role: clinicUser.role };
}

export async function requireTierFeature(
  accountId: string,
  feature: string
): Promise<void> {
  const { data: tier } = await supabase
    .from('account_active_tier')
    .select('*')
    .eq('account_id', accountId)
    .single();

  if (!tier[feature]) {
    throw new PaywallError(feature);
  }
}

export async function requireWithinLimit(
  accountId: string,
  clinicId: string,
  role: string
): Promise<void> {
  const limitError = await supabase.rpc('check_tier_limit', {
    p_account_id: accountId,
    p_clinic_id: clinicId,
    p_role: role,
  });

  if (limitError.data) {
    throw new TierLimitError(limitError.data);
  }
}
```

### 8.2 Example: Invite User Endpoint

```typescript
// POST /clinics/:clinicId/users/invite
export async function inviteUser(req: Request) {
  const { clinicId } = req.params;
  const { email, role } = await req.json();

  // 1. Auth check — must be admin of this clinic
  const { userId } = await requirePermission(req, 'staff.invite', clinicId);

  // 2. Get account ID for this clinic
  const { data: clinic } = await supabase
    .from('clinics')
    .select('account_id')
    .eq('id', clinicId)
    .single();

  // 3. Tier limit check — done at DB level
  await requireWithinLimit(clinic.account_id, clinicId, role);

  // 4. Feature check — Finance role requires Pro
  if (role === 'finance') {
    await requireTierFeature(clinic.account_id, 'max_finance_per_clinic > 0');
  }

  // 5. Proceed with invite
  const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { clinic_id: clinicId, role, invited_by: userId }
  });

  if (error) throw error;

  return new Response(JSON.stringify({ success: true }), { status: 201 });
}
```

---

## 9. Upgrade Flow & Billing

### 9.1 Pricing Page (`/pricing`)

```
┌────────────────────┐     ┌──────────────────────────────┐
│   🆓 FREE          │     │   ⭐ PRO                      │
│   Rp 0/bulan       │     │   Rp 299.000/bulan           │
│                    │     │   Rp 2.990.000/tahun          │
│   ✅ 1 klinik      │     │   💡 Hemat 2 bulan!          │
│   ✅ 2 dokter      │     │                              │
│   ✅ 1 resepsionis │     │   ✅ Unlimited klinik        │
│   ✅ Pasien ∞      │     │   ✅ Unlimited dokter        │
│   ✅ Appointment ∞ │     │   ✅ Unlimited staff         │
│   ❌ Finance role  │     │   ✅ Finance role            │
│   ❌ WA Reminders  │     │   ✅ WA Reminders            │
│   ❌ Ekspor data   │     │   ✅ Ekspor data             │
│   ❌ BPJS          │     │   ✅ BPJS Integration        │
│   ❌ AI Notes      │     │   ✅ AI Clinical Notes       │
│   7 hari analitik  │     │   ✅ Analitik penuh          │
│   1 GB storage     │     │   ✅ 25 GB storage           │
│                    │     │                              │
│   [Mulai Gratis]   │     │   [Mulai Trial 14 Hari]     │
│                    │     │   [Bayar Tahunan & Hemat]   │
└────────────────────┘     └──────────────────────────────┘
```

### 9.2 Payment Integration

Use **Midtrans** (Indonesian payment gateway, already in Phase 2 PRD):

- **Snap** (hosted payment page) — simplest integration, handles all payment methods
- Accept: Transfer Bank, QRIS, GoPay, OVO, Dana, ShopeePay, Kartu Kredit/Debit
- Webhooks update `accounts.tier` and log to `subscription_events`

```typescript
// Upgrade flow
const upgradeSteps = [
  "User clicks [Upgrade ke Pro]",
  "POST /api/billing/create-transaction → Midtrans Snap token",
  "Open Midtrans Snap popup (no redirect, stays in app)",
  "On payment success → Midtrans webhook → update accounts.tier = 'pro'",
  "Supabase realtime subscription → frontend updates tier state live",
  "All over_limit users automatically reactivated",
  "Success modal: 'Selamat! Kamu sekarang Pro 🎉'"
];
```

### 9.3 Billing Page (`/settings/billing`)

Tab within Settings, visible to Admin only:

- Current plan + next renewal date
- Usage meters (clinics, doctors, FD, storage)
- Invoice history (last 12 months)
- Change plan / Cancel subscription
- Payment method management

---

## 10. Suggested Improvements

### 💡 Role Change Audit
Every role change (assign, revoke, promote) is logged in `activity_logs` with before/after state. Admin can view a "Role History" timeline per user. Prevents disputes about who changed what.

### 💡 Temporary Role Elevation
Admin can grant a Front Desk user temporary `billing.mark_paid` access for a set period (e.g., while the Finance staff is on leave). Stored as a permission override with an `expires_at` timestamp. Automatically reverts.

### 💡 Role Preview Before Inviting
When Admin selects a role in the invite modal, show a live permission summary:  
*"This person will be able to: view appointments, add patients, create invoices. They will NOT be able to: view financial reports, access medical records."*  
Prevents misconfigured invites.

### 💡 Free Tier Referral Unlock
Free users who successfully refer another clinic that upgrades to Pro get a **one-time unlock**: +1 doctor slot or +1 month Pro. Implemented via `referral_code` field on `accounts` table. Viral growth mechanism at zero cost.

### 💡 Doctor Data Scoping (Server-Side)
Doctor's `patients.view` permission already exists, but the scoping logic must be enforced at the Supabase RLS level — not just in the frontend. Add an RLS policy on `appointments` and `medical_records`:
```sql
-- Doctors can only see appointments where they are the assigned doctor
CREATE POLICY "doctor_own_appointments" ON public.appointments
  FOR SELECT USING (
    doctor_id IN (
      SELECT id FROM public.doctors WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.clinic_users
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );
```

### 💡 Finance Read-Only API Key
Finance users sometimes need to export data to an external accounting tool (Xero, Accurate). Generate a read-only API key scoped to billing endpoints only — no clinic settings, no patient records. Useful for mid-size clinics with a dedicated accountant.

### 💡 Trial Extension (Superadmin Feature)
Superadmin can manually extend a clinic's Pro trial by N days from the Control Room. Useful for: onboarding issues, demo clinics, partner clinics in pilot. Logged to audit trail.

---

## 11. Acceptance Criteria

### Role System
- [ ] New registration → account created with `role: admin`, `tier: pro_trial`
- [ ] Admin can see all dashboard tabs
- [ ] Doctor can only see Appointments and Patients (own only)
- [ ] Finance can only see Billing and Finance Reports tabs
- [ ] Front Desk can see Patients, Appointments, Billing (create only, no reports)
- [ ] Doctor cannot access `/dashboard/billing` — returns 403 if URL typed directly
- [ ] Finance cannot access `/dashboard/appointments` — returns 403
- [ ] Front Desk cannot access `/dashboard/doctors` — returns 403
- [ ] Superadmin cannot log in via `/login` of the main app (separate auth system)
- [ ] RLS policies block cross-clinic data access at DB level (verified via SQL audit)

### Tier Limits — Free
- [ ] Adding a 3rd doctor on Free shows Limit Reached modal, not an error
- [ ] Adding a 2nd Front Desk on Free shows Limit Reached modal
- [ ] Adding any Finance user on Free shows Feature Lock modal
- [ ] Creating a 2nd clinic on Free shows Feature Lock modal
- [ ] Analytics on Free only shows last 7 days of data
- [ ] Export button on Free shows Feature Lock modal
- [ ] WhatsApp Integration toggle on Free shows Feature Lock modal

### Pro Trial
- [ ] New account gets `pro_trial` tier for 14 days
- [ ] Trial banner visible with countdown
- [ ] Trial expiry email sent 3 days before and on expiry day
- [ ] On day 15: full-screen modal shown on login
- [ ] After trial: over-limit users get `status: over_limit`, cannot log in
- [ ] All data preserved on downgrade — nothing deleted

### Paywall & Upgrade
- [ ] Locked features show 🔒 icon, not hidden
- [ ] Clicking locked feature opens UpgradeModal with feature-specific copy
- [ ] Midtrans payment completes without page redirect (Snap popup)
- [ ] After payment: tier updates within 60 seconds via webhook
- [ ] Over-limit users automatically reactivated after upgrade
- [ ] Billing page shows accurate usage meters

### Backend Enforcement
- [ ] `check_tier_limit()` DB function returns correct limit keys
- [ ] POST `/clinics/:id/users/invite` returns 402 when limit exceeded
- [ ] POST `/clinics/:id/users/invite` with `role=finance` on Free returns 402
- [ ] All permission checks in Edge Functions cannot be bypassed by modifying request headers

---

## 12. Delivery Estimate

| Module | Complexity | Days |
|--------|-----------|------|
| Role enum + `clinic_users` restructure | Low | 1 |
| `accounts` + `tier_limits` + `subscription_events` tables | Low | 1 |
| `account_active_tier` view + `check_tier_limit()` function | Medium | 2 |
| RLS policies (role + tier) | Medium | 2 |
| `usePermissions` hook + `PermissionGate` component | Medium | 2 |
| Dashboard tab role-aware rendering | Low | 1 |
| Permission guard on all existing routes | Medium | 2 |
| Hard Gate / Limit Gate / Nudge modals | Medium | 2–3 |
| Pro trial logic + expiry flow + emails | Medium | 2 |
| Downgrade + over_limit user handling | Medium | 2 |
| Midtrans Snap integration + webhook | Medium | 3 |
| Billing / Pricing page UI | Medium | 2 |
| Usage meters (Settings → Billing tab) | Low | 1 |
| Backend Edge Function permission middleware | Medium | 2 |
| Doctor-scoped RLS for appointments/records | Medium | 2 |
| **Total** | | **~27–29 days** |

---

*Document Owner: Product Team, DentiCare Pro*  
*Classification: Internal*  
*Related PRDs: Mini Improvement PRD v1.1 (Onboarding) · Superadmin PRD v1.1 · Phase 2 PRD v2.0*  
*Next Review: May 2026*
