# DentiCare Pro — Superadmin Control Room
## Product Requirements Document · Phase 2.1
**Version:** 1.0  
**Status:** Draft for Review  
**Date:** March 2026  
**Subdomain:** `controlroom.yourdomain.com`  
**Audience:** Engineering, Security, DevOps, Product

---

## Table of Contents

1. [Overview & Vision](#1-overview--vision)
2. [Guiding Principles](#2-guiding-principles)
3. [Architecture & Deployment](#3-architecture--deployment)
4. [Authentication & Security](#4-authentication--security)
5. [Feature Modules](#5-feature-modules)
   - [SA-1: Command Dashboard](#sa-1-command-dashboard)
   - [SA-2: Clinic Registry](#sa-2-clinic-registry)
   - [SA-3: User & Role Management](#sa-3-user--role-management)
   - [SA-4: WhatsApp Integration Hub](#sa-4-whatsapp-integration-hub)
   - [SA-5: OTP & Communication Settings](#sa-5-otp--communication-settings)
   - [SA-6: Platform Configuration](#sa-6-platform-configuration)
   - [SA-7: Database Operations](#sa-7-database-operations)
   - [SA-8: Audit & Compliance Center](#sa-8-audit--compliance-center)
   - [SA-9: System Health Monitor](#sa-9-system-health-monitor)
6. [Data Model](#6-data-model)
7. [Roles & Access Tiers](#7-roles--access-tiers)
8. [UI/UX Direction](#8-uiux-direction)
9. [Delivery Roadmap](#9-delivery-roadmap)
10. [Risks & Mitigations](#10-risks--mitigations)
11. [Open Questions](#11-open-questions)

---

## 1. Overview & Vision

### 1.1 What Is the Control Room?

The **DentiCare Control Room** is a hardened, isolated Superadmin portal deployed separately from the main clinic-facing application. It is the single pane of glass for platform operators to manage every registered dental clinic, configure system-wide integrations, control user access across all tenants, and monitor platform health in real time.

This is **not** a feature inside the main app. It lives on its own subdomain (`controlroom.yourdomain.com`), has its own authentication pipeline, and connects to the Supabase backend via a privileged service-role key that no clinic user ever touches.

### 1.2 The Problem It Solves

| Problem | Without Control Room | With Control Room |
|---------|---------------------|-------------------|
| New clinic onboarding | Manual SQL inserts, Slack messages | Self-contained onboarding wizard |
| WhatsApp API keys per clinic | Hardcoded in .env or Supabase Vault ad hoc | Central key vault with per-clinic assignment |
| Deactivating a compromised user | Direct Supabase dashboard access by dev | One-click deactivate with audit trail |
| OTP provider switch | Code deployment required | Toggle in settings panel, zero downtime |
| Platform-wide announcements | Email chains | Broadcast message system in Control Room |
| Incident investigation | Raw SQL queries by a developer | Searchable audit log UI |

### 1.3 Superadmin Persona

> **"Arya"** — Platform Operations Lead, DentiCare Pro  
> Arya is responsible for onboarding new clinic partners, ensuring all integrations are live, and being the first responder when a clinic reports an issue. Arya is not a developer — they need a powerful UI, not a database console.

Secondary persona: **"Budi"** — CTO — needs read-only access to system health, cost dashboards, and audit logs without the ability to accidentally modify data.

---

## 2. Guiding Principles

1. **Zero Trust by Default.** Every action requires authentication. Sensitive operations require step-up MFA re-verification.
2. **Air-Gapped from Clinics.** No session or cookie from the main app carries over to the Control Room. Completely separate auth context.
3. **Immutable Audit Trail.** Every write action — including reads of sensitive data — is logged to an append-only table. Logs cannot be deleted from the UI.
4. **Least Privilege UI.** Superadmin tiers see only what they need. Even within the Control Room, there are access levels.
5. **Visible, Not Silent.** Destructive actions (deactivate clinic, revoke API key) always show a confirmation dialog with the downstream impact summary before executing.
6. **Operator-First Design.** The UI must be fast for keyboard-driven workflows. Every critical action reachable in ≤ 3 clicks.

---

## 3. Architecture & Deployment

### 3.1 Deployment Strategy

```
Main App:          app.yourdomain.com          → Vercel Project A
Control Room:      controlroom.yourdomain.com  → Vercel Project B (separate)
Supabase Backend:  Shared project, separate RLS policies + service role key
```

The Control Room is a **completely separate Vercel project**. This means:
- Independent build pipeline and deployment secrets
- Different environment variables (uses `SUPABASE_SERVICE_ROLE_KEY`, never the anon key)
- Can be password-protected at the Vercel level as a first layer of defense
- IP allowlist configurable in Vercel project settings

### 3.2 Vercel Subdomain Setup

**Step-by-step (document in internal runbook):**

1. In Vercel, create a new project: `denticare-controlroom`
2. Under **Settings → Domains**, add `controlroom.yourdomain.com`
3. In your DNS provider, add a CNAME record:
   ```
   controlroom  CNAME  cname.vercel-dns.com
   ```
4. In Vercel **Settings → Deployment Protection**, enable:
   - Password Protection (first-factor gate before the login page even loads)
   - Vercel Firewall IP rules: whitelist operator office IPs if possible
5. Set environment variables in this project only:
   ```env
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_SERVICE_ROLE_KEY=...    # NEVER the anon key
   VITE_TOTP_ISSUER=DentiCare-ControlRoom
   VITE_SESSION_TIMEOUT_MINUTES=30
   VITE_ALLOWED_SUPERADMIN_EMAILS=arya@company.com,budi@company.com
   ```

### 3.3 Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Framework | React 18 + TypeScript + Vite | Consistent with main app |
| Styling | Tailwind CSS + shadcn/ui | Component consistency |
| Auth | Supabase Auth + `otplib` (TOTP) | In-house TOTP without third-party dependency |
| State | TanStack React Query | Caching + optimistic updates |
| Charts | Recharts | System health graphs |
| Table | TanStack Table v8 | Virtual scrolling for large datasets |
| Notifications | Sonner | Toast alerts for system events |
| Encryption | `crypto-js` / Web Crypto API | Client-side sensitive data display |
| QR TOTP | `qrcode.react` | Authenticator app enrollment |

---

## 4. Authentication & Security

### 4.1 Login Flow — Multi-Layer Defense

```
Layer 1: Vercel Deployment Protection (password gate before page loads)
    ↓
Layer 2: IP Allowlist Check (Vercel Firewall rules)
    ↓
Layer 3: Email + Password (Supabase Auth, superadmin-only email allowlist)
    ↓
Layer 4: TOTP Authenticator Code (Google Authenticator / Authy / 1Password)
    ↓
Layer 5: Session — 30-min auto-expiry, re-auth on sensitive actions
```

### 4.2 TOTP Implementation

**Enrollment (first login only):**
1. After email/password success, system checks if user has TOTP enrolled
2. If not enrolled: generate TOTP secret, display QR code for scanning
3. User scans with Google Authenticator / Authy / 1Password
4. User enters 6-digit code to confirm enrollment
5. Show 8 one-time recovery codes — user must download/copy before proceeding
6. Secret stored encrypted in `superadmin_users.totp_secret` (AES-256)

**Every Login:**
1. Email + password → success
2. Prompt for 6-digit TOTP code
3. Validate with 30-second window ± 1 step (90-second grace for clock drift)
4. On 5 consecutive failures → account locked, alert sent to other superadmins

**Step-Up Authentication (for destructive actions):**
- The following actions require re-entering a fresh TOTP code even in an active session:
  - Deactivate a clinic
  - Revoke an API key
  - Delete a user
  - Export raw database records
  - Modify OTP provider credentials

### 4.3 Session Management

```typescript
// Session rules
SESSION_DURATION = 30 minutes (idle timeout)
ABSOLUTE_TIMEOUT = 8 hours (even if active)
INACTIVITY_WARNING = 5 minutes before expiry (countdown banner)
CONCURRENT_SESSIONS = 1 (new login invalidates previous session)
```

- All sessions recorded in `superadmin_sessions` table with IP, user agent, geo
- Manual session revocation available from the Users panel (useful for incident response)

### 4.4 Brute Force & Anomaly Protection

- **Rate limiting:** 5 failed logins → 15-minute lockout. Implemented via Supabase Edge Function middleware.
- **Geo anomaly alert:** Login from new country/region sends email alert to other superadmins.
- **Device fingerprint:** First login from new device triggers additional email OTP confirmation.
- **Audit every login:** Success and failure, with IP, timestamp, and user agent.

### 4.5 Superadmin User Bootstrap

Superadmin accounts are **never created via the UI** by design. They are seeded by a privileged CLI script run by the CTO:

```bash
# Run once, locally, with production service role key
npx ts-node scripts/create-superadmin.ts \
  --email arya@company.com \
  --name "Arya Kusuma" \
  --tier operator
```

This writes directly to `superadmin_users` — completely separate from the clinic `users` table in Supabase.

---

## 5. Feature Modules

### SA-1: Command Dashboard

**Purpose:** First screen after login. Real-time operational overview of the entire platform.

**Widgets (configurable layout, drag-to-reorder):**

| Widget | Data | Refresh |
|--------|------|---------|
| Active Clinics | Count of active / suspended / trial clinics | 60s |
| Active Users (24h) | Unique logins across all clinics today | 30s |
| API Health | Status of WhatsApp, BPJS, Midtrans, AI services | 15s |
| Appointment Volume | Today vs 7-day avg sparkline | 5 min |
| Error Rate | 4xx/5xx rate from Edge Function logs | 30s |
| Storage Used | Supabase Storage total across all clinics | 5 min |
| Recent Alerts | Latest 5 system alerts with severity | 15s |
| Pending Actions | Items needing operator attention (e.g., BPJS claim errors) | 1 min |

**Quick Actions Bar (always visible at top):**
- 🔍 Global search (search any clinic, user, or invoice ID)
- 🏥 + Onboard new clinic
- 🔔 View all alerts
- 📢 Send platform broadcast

**Status Ring:** A persistent colored ring around the dashboard header showing platform health: green (all systems normal), amber (degraded), red (outage).

---

### SA-2: Clinic Registry

**Purpose:** Full lifecycle management of all dental clinics registered on the platform.

#### SA-2.1 Clinic List View

Columns: Clinic Name | City | Plan | Status | Registered Date | Active Users | Monthly Appointments | Actions

Filters: Status (Active / Trial / Suspended / Churned) | Plan Tier | City/Province | Registration Month

**Clinic Status States:**

```
Trial (14 days) → Active → Suspended → Churned
                          ↑             ↓
                          └─────────────┘ (can reactivate)
```

#### SA-2.2 Clinic Detail Page

Each clinic has a dedicated detail page with tabs:

**Overview Tab:**
- Clinic profile: name, address, phone, email, license number, BPJS Faskes ID
- Subscription: plan, billing cycle, next renewal, payment status
- Key stats: total patients, total appointments, total invoices billed

**Users Tab:**
- All staff accounts at this clinic (role, name, email, last login, status)
- Inline actions: Deactivate / Reactivate / Reset Password / Force Logout
- Add user to this clinic with role assignment
- Role options: Super Admin (clinic level), Admin, Receptionist, Dentist, Assistant, Perawat (Nurse), Apoteker (Pharmacist)

> **Roles supported per clinic:**
> 
> | Role | Display Name | Description |
> |------|-------------|-------------|
> | `clinic_superadmin` | Kepala Klinik | Full clinic access, can manage all staff |
> | `admin` | Admin | Operations, billing, reports |
> | `receptionist` | Resepsionis | Scheduling, check-in, basic billing |
> | `dentist` | Dokter Gigi | Clinical records, odontogram, prescriptions |
> | `assistant` | Asisten Dokter | Assist dentist, limited chart access |
> | `nurse` | Perawat | Vitals, pre-procedure notes |
> | `pharmacist` | Apoteker | Medication dispensing records |

**Integrations Tab:**
- WhatsApp: assigned phone number ID, API key status (masked), last message sent
- BPJS: Faskes code, P-Care credential status, last claim submitted
- Midtrans: merchant ID, key status, last transaction
- Per-integration enable/disable toggle

**Feature Flags Tab:**
- Toggle Phase 2 features on/off per clinic (AI Notes, Telehealth, BPJS, Patient Portal)
- Useful for staged rollout and beta testing with specific clinics

**Billing Tab:**
- Invoice history, payment status, overdue notices
- Manual credit / discount entry with reason field

**Audit Tab:**
- Last 50 audit log events for this clinic

#### SA-2.3 Clinic Onboarding Wizard

A guided 4-step modal for new clinic registration:

```
Step 1: Clinic Profile       → Name, address, SIK number, BPJS Faskes ID
Step 2: Plan & Billing       → Select tier (Starter / Growth / Enterprise), billing cycle
Step 3: Admin User Setup     → First clinic admin: name, email, temp password
Step 4: Integration Priming  → Pre-fill WhatsApp, BPJS credentials if available
```

After completion: Supabase tenant row created, welcome email sent to clinic admin, clinic appears in registry with Trial status.

---

### SA-3: User & Role Management

**Purpose:** Cross-clinic user administration — for cases where users work at multiple clinics or need platform-level access changes.

#### SA-3.1 Global User Search

- Search by name, email, NIK (staff), phone
- Results show: name, clinic, role, status, last login, created date
- Filter: status (active / deactivated / pending), role, clinic

#### SA-3.2 User Detail

- Full profile view (read-only for non-sensitive fields)
- Activity summary: logins (30d), appointments handled, records modified
- Session management: view active sessions, revoke specific session
- **Deactivate User:** requires TOTP step-up + reason selection + optional note
- **Reactivate User:** one-click with audit log entry
- **Force Password Reset:** sends password reset email, flags session for re-auth
- **Role Change:** reassign role within or across clinics (with confirmation modal showing impact)

#### SA-3.3 Bulk Operations

- Select multiple users → bulk deactivate / bulk role update / bulk force logout
- Available only to Superadmin Tier: Operator and above
- Bulk actions require typing `CONFIRM` in a text field before execution

#### SA-3.4 Cross-Clinic Role Assignment

A user can be assigned roles at multiple clinics (e.g., a floating specialist dentist). This panel manages multi-clinic user-role relationships:

```
User: dr. Sari Dewi
  → Klinik Sehat Abadi (dentist) — Active
  → Klinik Bunda Medika (dentist) — Active
  → [+ Add clinic assignment]
```

---

### SA-4: WhatsApp Integration Hub

**Purpose:** Manage WhatsApp Business API credentials for every clinic and monitor message delivery health.

#### SA-4.1 Provider Configuration

Supported providers (selectable platform-wide or per-clinic):
- **Meta Cloud API** (direct) — recommended for production
- **360dialog** — managed BSP
- **Wati** — BSP with dashboard
- **Zenziva** (SMS fallback)

Platform-wide default provider is set here. Clinics can override with their own credentials if on Enterprise plan.

#### SA-4.2 Credential Vault

For each clinic:

```
Phone Number ID:    [masked]     [👁 Reveal — requires TOTP]  [✏ Edit]
Access Token:       [••••••••]   [👁 Reveal — requires TOTP]  [✏ Edit]
Webhook Secret:     [••••••••]   [👁 Reveal — requires TOTP]  [✏ Edit]
Status:             ✅ Verified  [🔄 Re-verify]
Last Message:       2 min ago
Message Volume:     1,247 / month
```

- All credentials stored in **Supabase Vault** (encrypted at rest using `pgsodium`)
- Never stored in plain text in any table column
- Reveal action logged to audit trail with timestamp and superadmin identity

#### SA-4.3 Message Health Monitor

| Metric | Value | Trend |
|--------|-------|-------|
| Delivery Rate (24h) | 97.3% | ↑ 0.4% |
| Failed Messages (24h) | 34 | ↓ 12 |
| Avg Delivery Time | 3.2s | — |
| Opt-Outs (7d) | 8 | ↑ 2 |
| Template Approval Status | 12/14 approved | — |

**Failed Message Queue:** Table of failed sends with clinic, patient (masked), error code, and retry button.

#### SA-4.4 Message Template Manager

- View all registered templates across clinics
- Sync template approval status from Meta API
- Create new templates with variable placeholders
- Assign templates to clinics (shared library model)
- Preview rendered template with sample data

#### SA-4.5 Sandbox / Test Mode Toggle

- Per-clinic toggle: **Live Mode** vs **Sandbox Mode** (messages print to log, not sent)
- Useful when onboarding a new clinic without spamming their patients

---

### SA-5: OTP & Communication Settings

**Purpose:** Configure OTP providers, communication channels, and delivery rules platform-wide.

#### SA-5.1 OTP Provider Configuration

The platform uses OTP for: patient portal login, staff password reset, two-factor actions.

**Primary OTP Provider (selectable):**
- Twilio Verify
- Zenziva SMS
- WhatsApp OTP (via Cloud API)
- Email OTP (Resend / SendGrid)

Each provider configuration:
```
Provider:         Twilio Verify
Account SID:      [masked]              [👁 Reveal]
Auth Token:       [••••••••]            [👁 Reveal]
Verify Service SID: [masked]            [👁 Reveal]
Status:           ✅ Connected
Test:             [Send Test OTP to +62...]
Fallback:         Email OTP (auto-switch if SMS fails 3x)
```

#### SA-5.2 OTP Rules Configuration

```yaml
otp_settings:
  code_length: 6              # 4 or 6
  expiry_seconds: 300         # 5 minutes
  max_attempts: 5             # before lockout
  lockout_duration_minutes: 15
  resend_cooldown_seconds: 60
  channels_priority:
    - whatsapp
    - sms
    - email
  patient_portal_otp: true    # OTP login for patients
  staff_otp_login: false      # Staff uses password, not OTP
```

All fields editable in the UI; changes take effect immediately and are audit-logged.

#### SA-5.3 Email Provider Configuration

```
Provider:         Resend
API Key:          [••••••••]     [👁 Reveal]
From Address:     noreply@yourdomain.com
From Name:        DentiCare Pro
Reply-To:         support@yourdomain.com
Status:           ✅ Connected
Daily Volume:     4,320 / 10,000 (plan limit)
Test:             [Send Test Email]
```

#### SA-5.4 Communication Rate Limits

Global guardrails to prevent spam and cost overruns:

```
Max SMS per clinic per day:       500
Max WhatsApp messages per day:    2,000
Max emails per clinic per day:    1,000
Burst limit (per minute):         50 messages
Alert threshold (% of limit):     80%
```

---

### SA-6: Platform Configuration

**Purpose:** System-wide settings that apply to all clinics unless overridden at clinic level.

#### SA-6.1 Feature Flags

Global feature toggles with per-clinic override capability:

| Feature | Global Default | Override Allowed |
|---------|---------------|-----------------|
| AI Note Generation | Off | Yes (Enterprise only) |
| Telehealth | Off | Yes (Growth+) |
| BPJS Integration | Off | Yes |
| Patient Portal | On | Yes |
| Online Booking | On | Yes |
| WhatsApp Reminders | On | Yes |
| Multi-Branch | Off | Yes (Enterprise only) |
| Inventory Procurement | Off | Yes (Growth+) |

Any change to a global flag shows: **"This will affect N active clinics. Confirm?"**

#### SA-6.2 Plan Tier Manager

Define what each subscription plan includes:

```
Starter Plan:
  - Max users: 5
  - Max patients: 1,000
  - Storage: 5GB
  - Features: Core scheduling, billing, basic reports
  - WhatsApp reminders: included
  
Growth Plan:
  - Max users: 20
  - Max patients: 10,000
  - Storage: 25GB
  - Features: + BPJS, Patient Portal, Online Booking, Analytics
  
Enterprise Plan:
  - Unlimited users, patients, storage
  - All features
  - Custom integrations
  - SLA 99.5%
```

#### SA-6.3 Maintenance Mode

```
☐ Enable Maintenance Mode
  Message (shown to clinic users):
  [We're upgrading DentiCare Pro. Back online at 02:00 WIB. Sorry for the inconvenience.]
  
  Whitelist IPs (still allowed access):
  [203.0.113.5, 198.51.100.10]
  
  Estimated Duration: [30] minutes
```

When enabled: main app shows maintenance page. Control Room remains accessible.

#### SA-6.4 Platform Announcement Banner

Send a dismissible banner to all clinic users (or selected clinics):

```
Message:     [New Feature: BPJS Integration now available! Click to learn more.]
Type:        ● Info  ○ Warning  ○ Critical
Link:        [https://help.denticare.pro/bpjs-setup]
Target:      ● All Clinics  ○ Select Clinics: [_____]
Schedule:    ○ Now  ● Scheduled: [2026-04-01 09:00 WIB]
Expires:     [2026-04-07]
```

---

### SA-7: Database Operations

**Purpose:** Controlled, audited database visibility and operations — without raw SQL console access in production.

> ⚠️ This module is read-heavy by design. Write operations are only available for defined, pre-approved actions. Raw SQL execution is not available in the UI.

#### SA-7.1 Tenant Data Explorer

Browse any clinic's data in a structured view:

```
Clinic: Klinik Sehat Abadi  [▼]
Table:  patients             [▼]

Showing 1–25 of 1,247 records
[Export CSV]  [View Schema]

ID | Name (masked) | Created At | Last Visit | Status
-- | ------------- | ---------- | ---------- | ------
```

- PII fields (name, phone, NIK) are **masked by default**: `Bud* ***ono`, `+62812 *** 4567`
- Unmasking requires TOTP step-up and is logged
- No delete or edit in this view — read-only explorer
- Export to CSV is available but logged, and PII is always masked in exports unless export is approved by second superadmin (dual-approval flow)

#### SA-7.2 Storage Monitor

```
Total Platform Storage: 47.3 GB / 500 GB
  ├── patient-documents:    22.1 GB  (47%)
  ├── consent-forms:         8.4 GB  (18%)
  ├── xray-images:          14.2 GB  (30%)
  └── avatars:               2.6 GB   (5%)

Per-Clinic Storage Table:
  Clinic Name | Storage Used | Plan Limit | % Used | Actions
  Klinik A    | 12.3 GB      | 25 GB      | 49%    | [View Files]
```

#### SA-7.3 Data Retention & Deletion

Implements Permenkes 24/2022 retention rules:

- Patient records: minimum 5 years from last visit
- Invoices: minimum 10 years (tax compliance)
- Audit logs: minimum 7 years
- Communication logs: 2 years

**Deletion Requests:** When a clinic requests data deletion (GDPR/UU PDP equivalent):
1. Request appears in deletion queue with clinic ID, data category, and legal basis
2. Superadmin reviews: checks retention rule compliance
3. If approved: soft delete + schedule hard delete after retention period
4. If denied: denial reason sent to clinic

#### SA-7.4 Backup Status

```
Last Full Backup:        2026-03-23 02:00 WIB ✅ (Supabase auto-backup)
Last Point-in-Time:      2026-03-23 14:30 WIB ✅
Backup Retention:        7 days (upgrade to 30 days available)
Recovery Test (last):    2026-03-01 ✅ Successful

[Trigger Manual Backup]  [View Backup History]  [Download Backup]
```

---

### SA-8: Audit & Compliance Center

**Purpose:** Immutable, searchable log of every significant action across the platform. Non-negotiable for Permenkes 24/2022 compliance.

#### SA-8.1 Audit Log Viewer

Columns: Timestamp | Superadmin / User | Clinic | Action | Entity | Before → After | IP Address | Status

Filters:
- Date range
- Action category: Auth, Clinic, User, Integration, Config, Data Export, Deletion
- Severity: Info / Warning / Critical
- Actor: specific superadmin or clinic user
- Clinic

**Example entries:**
```
2026-03-23 14:22:01 | arya@company.com     | Klinik Sehat     | USER_DEACTIVATED     | user:dr.budi   | active→inactive | 103.x.x.x | ✅
2026-03-23 14:18:44 | arya@company.com     | [Platform]       | API_KEY_VIEWED       | clinic:12 WA   | —               | 103.x.x.x | ✅
2026-03-23 13:05:12 | receptionist@klinik  | Klinik Maju      | PATIENT_RECORD_READ  | patient:4521   | —               | 182.x.x.x | ✅
2026-03-23 11:44:30 | [System]             | [Platform]       | BACKUP_COMPLETED     | supabase       | —               | internal  | ✅
```

#### SA-8.2 Compliance Reports

Pre-built reports for regulatory needs:

- **Permenkes 24/2022 Compliance Report** — activity log summary for a clinic, exportable as PDF
- **Data Access Report** — who accessed which patient records, in a date range
- **Authentication Report** — all login events, failures, and anomalies
- **Integration Activity Report** — API calls by integration type (WhatsApp, BPJS, etc.)
- **User Lifecycle Report** — account creation, role changes, deactivations

#### SA-8.3 Compliance Checklist

Live checklist showing platform-wide compliance posture:

```
✅ All clinics have activity logging enabled
✅ Audit logs retained > 5 years
⚠️  3 clinics have users with no MFA enrolled
❌  BPJS credentials expired for: Klinik Maju Sehat
✅ Data retention policies configured
✅ Backup tested within last 30 days
```

---

### SA-9: System Health Monitor

**Purpose:** Real-time and historical visibility into platform performance and third-party service availability.

#### SA-9.1 Service Status Board

```
Supabase Database      ● Operational          Latency: 12ms   Uptime 30d: 99.94%
Supabase Auth          ● Operational          —               Uptime 30d: 99.99%
Supabase Storage       ● Operational          —               Uptime 30d: 99.98%
Supabase Edge Functions ● Operational         Avg: 45ms       Uptime 30d: 99.87%
WhatsApp Cloud API     ● Operational          —               Last checked: 30s ago
BPJS P-Care API        ⚠ Degraded            Response: 8.2s  Incident started: 2h ago
Midtrans               ● Operational          —               Last checked: 30s ago
OpenAI API             ● Operational          —               Last checked: 60s ago
Resend (Email)         ● Operational          —               Last checked: 60s ago
Vercel Edge Network    ● Operational          —               —
```

#### SA-9.2 Performance Metrics (Charts — Recharts)

- API response time P50/P95/P99 — 24h rolling
- Database query time distribution
- Edge Function invocation count and error rate
- Storage read/write throughput

#### SA-9.3 Incident Manager

When a service goes degraded or down:
1. Auto-created incident card with timestamp and affected service
2. Superadmin can add status update notes
3. Incident resolution closes the card with RCA note
4. All incidents visible to clinic admins as read-only status page (at `status.yourdomain.com`)

#### SA-9.4 Cost Monitor

Connect to Supabase billing and Vercel usage APIs:

```
This Month (March 2026)
  Supabase:       $142 / $200 budget  (71%)
  Vercel:         $48  / $100 budget  (48%)
  OpenAI API:     $67  / $150 budget  (45%)
  Twilio:         $23  / $50 budget   (46%)
  WhatsApp API:   $31  / $80 budget   (39%)
  ─────────────────────────────────
  Total:          $311 / $580 budget  (54%)
  
Projected EOM:  ~$380
```

---

## 6. Data Model

### New Tables (Superadmin-only, separate schema)

```sql
-- schema: controlroom (isolated from public schema)

-- Superadmin accounts (seeded via CLI, not UI)
CREATE TABLE controlroom.superadmin_users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE NOT NULL,
  display_name    TEXT NOT NULL,
  tier            TEXT NOT NULL CHECK (tier IN ('viewer', 'operator', 'owner')),
  totp_secret     TEXT,              -- AES-256 encrypted
  totp_enrolled   BOOLEAN DEFAULT FALSE,
  recovery_codes  TEXT[],            -- bcrypt-hashed
  is_active       BOOLEAN DEFAULT TRUE,
  last_login_at   TIMESTAMPTZ,
  last_login_ip   INET,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  created_by      UUID REFERENCES controlroom.superadmin_users(id)
);

-- Login sessions with full context
CREATE TABLE controlroom.superadmin_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  superadmin_id   UUID REFERENCES controlroom.superadmin_users(id),
  session_token   TEXT UNIQUE NOT NULL,   -- hashed
  ip_address      INET,
  user_agent      TEXT,
  country_code    CHAR(2),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NOT NULL,
  revoked_at      TIMESTAMPTZ,
  revoke_reason   TEXT
);

-- Append-only audit log (no DELETE, no UPDATE)
CREATE TABLE controlroom.audit_log (
  id              BIGSERIAL PRIMARY KEY,
  actor_type      TEXT NOT NULL,    -- 'superadmin' | 'system' | 'clinic_user'
  actor_id        UUID,
  actor_email     TEXT,
  clinic_id       UUID,             -- null for platform-level actions
  action          TEXT NOT NULL,    -- e.g. USER_DEACTIVATED, API_KEY_VIEWED
  entity_type     TEXT,             -- e.g. 'user', 'clinic', 'api_key'
  entity_id       TEXT,
  before_state    JSONB,
  after_state     JSONB,
  ip_address      INET,
  user_agent      TEXT,
  severity        TEXT DEFAULT 'info',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Disable delete and update on audit_log via RLS
ALTER TABLE controlroom.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "no_delete" ON controlroom.audit_log FOR DELETE USING (false);
CREATE POLICY "no_update" ON controlroom.audit_log FOR UPDATE USING (false);

-- Integration credential vault references
CREATE TABLE controlroom.integration_credentials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       UUID NOT NULL,     -- references public.clinics
  integration     TEXT NOT NULL,     -- 'whatsapp' | 'bpjs' | 'midtrans' | 'otp_sms'
  key_name        TEXT NOT NULL,     -- e.g. 'access_token', 'account_sid'
  vault_key_id    TEXT NOT NULL,     -- reference to Supabase Vault secret
  status          TEXT DEFAULT 'active',
  last_verified   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (clinic_id, integration, key_name)
);

-- Platform-wide feature flag overrides per clinic
CREATE TABLE controlroom.feature_flags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id       UUID,              -- null = global default
  flag_name       TEXT NOT NULL,
  is_enabled      BOOLEAN NOT NULL,
  set_by          UUID REFERENCES controlroom.superadmin_users(id),
  reason          TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (clinic_id, flag_name)
);

-- Incident tracking
CREATE TABLE controlroom.incidents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service         TEXT NOT NULL,
  status          TEXT NOT NULL,     -- 'investigating' | 'identified' | 'monitoring' | 'resolved'
  title           TEXT NOT NULL,
  updates         JSONB[] DEFAULT '{}',
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ,
  created_by      UUID REFERENCES controlroom.superadmin_users(id)
);
```

---

## 7. Roles & Access Tiers

The Control Room has its own internal tier system, completely separate from clinic roles.

| Tier | Name | What They Can Do |
|------|------|-----------------|
| `viewer` | Observer | Read-only: dashboards, audit logs, clinic list. No write actions. |
| `operator` | Operator | Full access except: cannot modify other superadmin accounts, cannot change tier system, cannot delete audit logs. |
| `owner` | Platform Owner | Full access. Can create/deactivate superadmin accounts. Can modify tier assignments. |

**Tier Assignment Rules:**
- `owner` tier can only be assigned by another `owner`
- Maximum 2 `owner` accounts active simultaneously (enforced at DB level)
- `viewer` accounts can be created by `operator` and above
- All tier changes are dual-approved: initiated by one superadmin, confirmed by another

---

## 8. UI/UX Direction

### 8.1 Design Concept: "Mission Control"

The Control Room should feel like a secure operations center — not a consumer SaaS dashboard. Design language:

- **Dark theme mandatory** — operators work long hours; dark reduces strain and signals "this is a serious tool"
- **Font:** `Share Tech Mono` for data/IDs + `Sora` for UI labels — technical but readable
- **Color palette:**
  - Background: near-black `#05080F`
  - Cards: dark navy `#0A1120`
  - Accent: amber `#F59E0B` — status indicators, active states
  - Cyan `#06B6D4` — links, highlights
  - Green `#10B981` — healthy status
  - Red `#EF4444` — errors, critical alerts
- **Subtle scanline/noise texture** on background — reinforces the "terminal/ops center" feel
- **No rounded corners on data tables** — sharp, precise
- **Monospaced font for all IDs, keys, timestamps** — clarity and copy-ability
- **Dense information layout** — operators need data density, not whitespace

### 8.2 Navigation Structure

```
┌─ SIDEBAR ──────────────────────────┐
│  🦷 DentiCare ControlRoom          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━   │
│  ⬡ Command Dashboard               │
│  ─────────────────────────────     │
│  REGISTRY                          │
│    🏥 Clinics                      │
│    👥 Users                        │
│  ─────────────────────────────     │
│  INTEGRATIONS                      │
│    💬 WhatsApp Hub                 │
│    📱 OTP Settings                 │
│    ✉️  Email Provider              │
│  ─────────────────────────────     │
│  PLATFORM                          │
│    ⚙️  Configuration               │
│    🗄️  Database Ops               │
│    🔍 Audit Log                    │
│  ─────────────────────────────     │
│  MONITOR                           │
│    📡 System Health                │
│    💰 Cost Monitor                 │
│  ─────────────────────────────     │
│  [Avatar] Arya K. · Operator       │
│  [🔴 Logout]                       │
└────────────────────────────────────┘
```

### 8.3 Global Search (⌘K)

Keyboard-triggered command palette that searches across:
- Clinics (by name, city, ID)
- Users (by name, email)
- Invoice IDs
- Audit log actions

Results appear instantly with keyboard navigation.

### 8.4 Destructive Action Pattern

All destructive actions follow this flow:
1. Click action button → Impact summary modal appears
2. Modal shows: "This will affect X users. Last active: Y days ago."
3. If step-up auth required: TOTP entry field appears inside modal
4. Confirm button is red and disabled until all fields are completed
5. After action: green toast with undo option (30-second window for soft actions)

---

## 9. Delivery Roadmap

### Phase 2.1-A: Foundation & Security (Weeks 1–4)

- Separate Vercel project scaffold with subdomain setup
- Superadmin auth: email/password + TOTP enrollment flow
- Session management with idle timeout
- CLI script for superadmin user seeding
- `controlroom` DB schema with audit log table
- Login audit trail

### Phase 2.1-B: Core Registry (Weeks 5–8)

- Clinic list view with filters and status management
- Clinic detail page (Overview + Users tabs)
- User deactivate/reactivate with step-up auth
- Clinic onboarding wizard (4 steps)
- Cross-clinic role assignment

### Phase 2.1-C: Integrations (Weeks 9–12)

- WhatsApp credential vault (Supabase Vault integration)
- OTP provider configuration UI
- Email provider settings
- Message health monitor
- Feature flag management per clinic

### Phase 2.1-D: Operations & Monitoring (Weeks 13–16)

- Audit log viewer with filters
- System health monitor with service status board
- Database explorer (read-only, masked PII)
- Backup status view
- Cost monitor
- Compliance checklist
- Platform announcement broadcast

---

## 10. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Superadmin credential compromise | Low | Critical | TOTP mandatory, IP allowlist, anomaly detection, account lockout |
| Service-role key exposure in frontend bundle | Medium | Critical | Key lives only in Vercel env vars, never in client-side code; all privileged calls via Edge Functions |
| Audit log tampering by rogue operator | Low | High | `no_delete` / `no_update` RLS policies; audit log replicated to separate read-only replica |
| TOTP recovery code loss | Medium | High | 8 recovery codes generated at enrollment, re-enrollment only by a second `owner` superadmin |
| Accidental mass-deactivation | Low | High | Bulk action confirmation (`type CONFIRM`), 30-second undo window, daily deactivation limit of 50 users |
| Control Room UI accessed by clinic user via URL guessing | Low | High | Completely separate auth system, email allowlist, TOTP barrier, Vercel password protection |

---

## 11. Open Questions

| # | Question | Owner | Target |
|---|---------|-------|--------|
| Q1 | Should the Control Room have a mobile-responsive layout, or is desktop-only acceptable for operators? | Product | Week 1 |
| Q2 | For the Supabase Vault integration for credentials: use `pgsodium` directly, or wrap in an Edge Function for additional key rotation support? | CTO | Week 2 |
| Q3 | Should `viewer` tier superadmins be notified of all critical actions in real-time (push/email), or only on login? | Product | Week 3 |
| Q4 | Dual-approval for sensitive exports: synchronous (both online at same time) or asynchronous (second approver gets email link)? | Security + Ops | Week 2 |
| Q5 | Cost monitor: integrate directly via Supabase Management API + Vercel API, or just manual budget alerts via thresholds? | CTO | Week 4 |
| Q6 | Should clinics be able to see their own status (active/suspended) and the reason? Or is this internal-only? | Product + Legal | Week 3 |

---

## Appendix A: Superadmin Bootstrap Runbook

```bash
# Prerequisites: Node 18+, SUPABASE_SERVICE_ROLE_KEY set in env

# 1. Clone the control room repo
git clone git@github.com:your-org/denticare-controlroom.git
cd denticare-controlroom

# 2. Install deps
npm install

# 3. Run the bootstrap script (interactive)
npx ts-node scripts/bootstrap-superadmin.ts

# Prompts:
#   Email: arya@company.com
#   Display name: Arya Kusuma
#   Tier: owner
#   Confirm: yes

# 4. First login:
#   → Go to controlroom.yourdomain.com
#   → Enter Vercel deployment password (Layer 1)
#   → Login with email + password
#   → Scan TOTP QR code with Google Authenticator
#   → Download recovery codes
#   → You're in.
```

---

## Appendix B: Security Checklist (Pre-Launch)

```
Auth
  ☐ TOTP enrollment enforced for all superadmin accounts
  ☐ Email allowlist configured (not open registration)
  ☐ Vercel Deployment Protection password set
  ☐ IP allowlist configured in Vercel Firewall
  ☐ Session timeout set to 30 minutes
  ☐ Concurrent session limit = 1

Database
  ☐ Service-role key in Vercel env vars only (not committed to repo)
  ☐ `controlroom` schema isolated from `public` schema
  ☐ Audit log RLS: no DELETE, no UPDATE enforced
  ☐ All credentials in Supabase Vault, not plain columns

Operations
  ☐ At least 2 superadmin accounts enrolled (avoid single point of failure)
  ☐ Recovery codes printed/stored offline by each superadmin
  ☐ Incident response runbook documented
  ☐ Login anomaly alert email configured
  ☐ Monthly audit log review scheduled
```

---

*Document Owner: Platform Operations, DentiCare Pro*  
*Classification: Internal — Confidential*  
*Next Review: June 2026*
