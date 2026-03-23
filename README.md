# Klinik Gigi Management System

Sistem manajemen klinik gigi berbasis web untuk mengelola pasien, dokter, janji temu, rekam medis, penagihan, dan operasi klinik lainnya.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Database Setup (Supabase)](#database-setup-supabase)
- [Running the Application](#running-the-application)
- [Building for Production](#building-for-production)
- [Deployment](#deployment)
- [Module Guide](#module-guide)
  - [Patient Management](#patient-management)
  - [Doctor Management](#doctor-management)
  - [Appointment Scheduling](#appointment-scheduling)
  - [Medical Records](#medical-records)
  - [Billing & Invoices](#billing--invoices)
  - [Staff Management](#staff-management)
  - [Services & Items](#services--items)
  - [Dashboard](#dashboard)
  - [Settings](#settings)
  - [Profile](#profile)
- [User Roles & Permissions](#user-roles--permissions)
- [Database Schema](#database-schema)
- [API / Data Fetching](#api--data-fetching)
- [Form Validation](#form-validation)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Frontend Framework | React 18 + TypeScript |
| Build Tool | Vite 5 |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui (Radix UI) |
| State/Data Fetching | TanStack React Query |
| Routing | React Router DOM v6 |
| Forms | React Hook Form + Zod |
| Backend/Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth |
| Date Handling | date-fns |
| Charts | Recharts |
| Icons | Lucide React |
| Package Manager | npm (or bun) |

---

## Features

### Core Modules

1. **Patient Management** - CRUD pasien dengan data demografis lengkap, kontak darurat, Riwayat alergi dan medis
2. **Doctor Management** - Kelola dokter dengan penjadwalan dan deteksi tumpang tindih jadwal
3. **Appointment Scheduling** - Janji temu dengan tampilan hari/minggu/bulan, pengecekan ketersediaan otomatis
4. **Medical Records** - Rekam medis lengkap dengan odontogram interaktif, diagnosis ICD-10, tanda vital
5. **Billing & Invoices** - Pembuatan invoice dengan nomor otomatis, pajak, berbagai metode pembayaran
6. **Staff Management** - Kelola staf dengan sistem role-based access control (Super Admin only)
7. **Services & Items** - Katalog layanan dan inventory dengan tracking stok
8. **Dashboard** - Statistik klinik, janji temu hari ini, pasien terbaru
9. **Settings** - Pengaturan klinikk (nama, alamat, telepon, email)
10. **Profile** - Manajemen profil pengguna dengan avatar upload

### Additional Features

- **Odontogram** - Diagram gigi interaktif (dewasa & anak-anak) dengan 32+ kondisi gigi
- **Prescription Management** - Resep obat dengan informasi obat lengkap (interaksi, kontraindikasi)
- **Audit Trail** - Log audit lengkap untuk kepatuhan Permenkes No. 24/2022
- **Notifications** - Sistem notifikasi dengan channel dan prioritas
- **Reports** - Pembuatan dan penjadwalan laporan
- **Activity Logs** - Logging aktivitas pengguna

---

## Project Structure

```
bolong-gigi-manajemen-main/
├── public/
│   ├── favicon.ico
│   ├── placeholder.svg
│   └── robots.txt
├── src/
│   ├── components/
│   │   ├── ui/                    # shadcn/ui base components (40+)
│   │   ├── dashboard/             # Dashboard sub-components
│   │   │   ├── RecentPatients.tsx
│   │   │   └── TodayAppointments.tsx
│   │   ├── doctor/                # Doctor management components
│   │   │   ├── DoctorForm.tsx
│   │   │   ├── DoctorRow.tsx
│   │   │   ├── DoctorTable.tsx
│   │   │   ├── DoctorTableSkeleton.tsx
│   │   │   └── schedule/
│   │   │       ├── DoctorScheduleList.tsx
│   │   │       └── ScheduleForm.tsx
│   │   ├── patient/                # Patient management components
│   │   │   ├── MedicalRecordForm.tsx
│   │   │   ├── MedicalRecordViewer.tsx
│   │   │   ├── Odontogram.tsx
│   │   │   └── PatientForm.tsx
│   │   ├── billing/                # Billing components
│   │   │   ├── InvoiceEditor.tsx
│   │   │   ├── InvoiceForm.tsx
│   │   │   ├── InvoiceList.tsx
│   │   │   └── InvoiceViewer.tsx
│   │   ├── staff/                  # Staff management components
│   │   │   ├── ActivityLog.tsx
│   │   │   ├── RoleManagement.tsx
│   │   │   ├── StaffForm.tsx
│   │   │   └── StaffList.tsx
│   │   ├── services/               # Services catalog
│   │   │   ├── ServiceForm.tsx
│   │   │   └── ServiceList.tsx
│   │   ├── items/                  # Inventory management
│   │   │   ├── ItemForm.tsx
│   │   │   └── ItemList.tsx
│   │   ├── profile/                # Profile components
│   │   │   ├── AvatarUpload.tsx
│   │   │   └── ProfileForm.tsx
│   │   ├── appointment/
│   │   │   └── AppointmentForm.tsx
│   │   ├── AppointmentScheduler.tsx
│   │   ├── BillingManagement.tsx
│   │   ├── DashboardStats.tsx
│   │   ├── DoctorManagement.tsx
│   │   ├── Header.tsx
│   │   ├── PatientManagement.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── StaffManagement.tsx
│   │   └── UserManagement.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx          # Authentication context
│   ├── hooks/                       # React Query hooks
│   │   ├── usePatients.ts
│   │   ├── useDoctors.ts
│   │   ├── useAppointments.ts
│   │   ├── useInvoices.ts
│   │   ├── useMedicalRecords.ts
│   │   ├── useStaff.ts
│   │   └── useUserProfile.ts
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts            # Supabase client
│   │       └── types.ts             # Database types
│   ├── lib/
│   │   ├── schemas.ts               # Zod validation schemas
│   │   ├── billing-schemas.ts       # Billing validation schemas
│   │   └── utils.ts                 # Utility functions
│   ├── pages/
│   │   ├── Dashboard.tsx            # Main dashboard (tabbed interface)
│   │   ├── Landing.tsx              # Public landing page
│   │   ├── Login.tsx                # Login page
│   │   ├── NotFound.tsx             # 404 page
│   │   ├── Profile.tsx              # User profile page
│   │   ├── Register.tsx             # Registration page
│   │   └── Settings.tsx             # Clinic settings page
│   ├── App.css
│   ├── App.tsx                      # Root component with routing
│   └── main.tsx                     # Entry point
├── supabase/
│   └── config.toml                  # Supabase project config
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── components.json                   # shadcn/ui component registry
├── eslint.config.js
└── README.md
```

---

## Prerequisites

- **Node.js** >= 18.x (recommended: 20.x LTS)
- **npm** >= 9.x (or bun >= 1.x)
- **Supabase account** - [Sign up here](https://supabase.com)
- **Git** - for version control

---

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd bolong-gigi-manajemen-main
```

### 2. Install Dependencies

Using npm:

```bash
npm install
```

Or using bun (faster):

```bash
bun install
```

### 3. Install Supabase CLI (Optional, for local development)

```bash
# macOS
brew install supabase

# or using npm
npm install -g supabase
```

---

## Environment Setup

Create a `.env` file in the project root with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Where to find these credentials:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** > **API**
4. Copy the **Project URL** and **anon public** key

---

## Database Setup (Supabase)

### Option 1: Create New Supabase Project

1. Create a new project at [Supabase](https://supabase.com/dashboard)
2. Wait for the database to be provisioned
3. Go to **SQL Editor** and run the following setup:

#### Create Tables

```sql
-- Users (Staff/Doctors)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_auth_id UUID REFERENCES auth.users(id),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  avatar_url TEXT,
  role_id TEXT NOT NULL DEFAULT 'role_dentist',
  role_name TEXT NOT NULL DEFAULT 'Dentist',
  is_active BOOLEAN DEFAULT true,
  must_change_password BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Patients
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_number TEXT,
  full_name TEXT NOT NULL,
  nik TEXT NOT NULL UNIQUE,
  phone_number TEXT NOT NULL,
  email TEXT,
  address TEXT NOT NULL,
  place_of_birth TEXT,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  allergies TEXT,
  medical_history_summary TEXT,
  registration_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Services
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  price NUMERIC NOT NULL,
  duration_minutes INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Appointments
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  dentist_id UUID REFERENCES users(id),
  appointment_date_time TIMESTAMPTZ NOT NULL,
  service_id UUID REFERENCES services(id),
  service_name TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  dentist_name TEXT NOT NULL,
  status TEXT DEFAULT 'Dijadwalkan',
  duration_in_minutes INTEGER DEFAULT 30,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Medical Records
CREATE TABLE medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  doctor_id UUID REFERENCES users(id),
  visit_date TIMESTAMPTZ NOT NULL,
  chief_complaint TEXT,
  physical_examination TEXT,
  assessment TEXT,
  plan TEXT,
  diagnosis_codes TEXT[],
  procedure_codes TEXT[],
  blood_type TEXT,
  covid19_vaccinated BOOLEAN,
  history_conditions TEXT[],
  drug_allergies TEXT[],
  odontogram_data JSONB,
  vital_signs JSONB,
  medications TEXT,
  follow_up_date TIMESTAMPTZ,
  follow_up_instructions TEXT,
  is_confidential BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Doctor Schedules
CREATE TABLE doctor_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID REFERENCES users(id),
  day_of_week INTEGER,
  date DATE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_start_time TIME,
  break_end_time TIME,
  slot_duration_minutes INTEGER DEFAULT 30,
  max_appointments_per_slot INTEGER DEFAULT 1,
  is_available BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  appointment_id UUID REFERENCES appointments(id),
  patient_id UUID REFERENCES patients(id),
  patient_name TEXT NOT NULL,
  service_name TEXT NOT NULL,
  appointment_date TIMESTAMPTZ NOT NULL,
  service_charge NUMERIC DEFAULT 0,
  tax_rate NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  subtotal NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'Belum Lunas',
  invoice_template TEXT,
  notes TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Invoice Items
CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_type TEXT DEFAULT 'service',
  quantity INTEGER DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Items (Inventory)
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  price NUMERIC NOT NULL,
  unit TEXT,
  stock_quantity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Clinic Settings
CREATE TABLE clinic_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT NOT NULL,
  license_number TEXT,
  npwp TEXT,
  dashboard_access_path TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Activity Logs
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  details JSONB,
  target_entity TEXT,
  target_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

-- Audit Trails (Permenkes No. 24/2022)
CREATE TABLE audit_trails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  session_id UUID,
  timestamp TIMESTAMPTZ DEFAULT now(),
  metadata JSONB
);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trails ENABLE ROW LEVEL SECURITY;

-- Create policies (example - adjust based on your needs)
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = user_auth_id);
CREATE POLICY "Patients are viewable by authenticated users" ON patients FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Appointments are viewable by authenticated users" ON appointments FOR SELECT USING (auth.role() = 'authenticated');
```

#### Create Invoice Number Generation Function

```sql
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  sequence_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 4) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM invoices
  WHERE invoice_number LIKE 'INV%';

  new_number := 'INV' || LPAD(sequence_num::TEXT, 6, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;
```

---

## Running the Application

### Development Mode

```bash
npm run dev
```

The app will be available at `http://localhost:8080`

### Preview Production Build

```bash
npm run preview
```

---

## Building for Production

```bash
npm run build
```

Output will be in the `dist/` folder.

For development build (faster, unminified):

```bash
npm run build:dev
```

---

## Deployment

### Option 1: Static Hosting (Netlify, Vercel, Cloudflare Pages)

1. Build the project:
   ```bash
   npm run build
   ```

2. Deploy the `dist/` folder to your hosting provider

3. Set environment variables in your hosting dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Option 2: Docker

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Create `nginx.conf`:

```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api {
    proxy_pass http://supabase-api;
  }
}
```

### Option 3: Supabase Hosting

Connect your GitHub repo to Supabase for automatic deployments.

---

## Module Guide

### Patient Management

**Route:** Dashboard > Patients tab

**Features:**
- Add new patient with complete demographic data
- Edit existing patient information
- Search patients by name or NIK
- View patient details including medical history
- Delete patient (soft delete)

**Patient Data Fields:**
- Patient Number (auto-generated)
- Full Name
- NIK (16-digit Indonesian ID)
- Phone Number
- Email
- Address
- Place & Date of Birth
- Gender
- Emergency Contact (name & phone)
- Allergies
- Medical History Summary

---

### Doctor Management

**Route:** Dashboard > Doctors tab

**Features:**
- Add/edit/delete doctors
- Manage doctor schedules
- Set availability windows
- Configure slot durations and max appointments
- Break time management
- Schedule overlap detection

**Doctor Data:**
- Full Name
- Email
- Phone Number
- Avatar
- Role (Dentist)
- Active Status

**Schedule Configuration:**
- Day of week or specific date
- Start/End time
- Break time (start/end)
- Slot duration (minutes)
- Max appointments per slot

---

### Appointment Scheduling

**Route:** Dashboard > Appointments tab

**Features:**
- Create appointments for patients
- Select dentist and service
- View calendar (day/week/month)
- Automatic availability checking
- Status tracking: Dijadwalkan, Berlangsung, Selesai, Dibatalkan
- Notes per appointment

**Available Services:**
- Routine Checkup
- Teeth Cleaning
- Filling
- Extraction
- Orthodontic Consultation
- Root Canal

---

### Medical Records

**Route:** From Patient detail > Medical Records tab

**Features:**
- Create medical record for patient visit
- Odontogram (interactive tooth chart)
- Chief complaint & physical examination
- Assessment and plan
- ICD-10 diagnosis codes
- Procedure codes
- Vital signs (blood pressure, heart rate, temperature, etc.)
- Medical history conditions
- Drug allergies
- COVID-19 vaccination status
- Blood type
- Follow-up scheduling
- File attachments

**Odontogram:**
- Adult (32 teeth) and pediatric (20 teeth) modes
- Click teeth to mark conditions:
  - Caries
  - Filling
  - Extraction
  - Root Canal
  - Crown
  - Implant
  - Healthy
  - Missing
  - etc.

---

### Billing & Invoices

**Route:** Dashboard > Billing tab

**Features:**
- Create invoice from completed appointment
- Auto-generated invoice number
- Add multiple line items (services/products)
- Tax calculation (configurable tax rate)
- Multiple payment methods:
  - Cash
  - QRIS
  - Bank Transfer
  - Debit Card
  - Credit Card
- Payment status tracking (Lunas/Belum Lunas)
- Send invoice via email (placeholder)
- Invoice template customization
- Invoice viewer and print

**Invoice Fields:**
- Invoice Number (auto-generated)
- Patient Name
- Service
- Appointment Date
- Service Charge
- Tax Rate & Amount
- Additional Items
- Subtotal & Total
- Payment Method
- Payment Status
- Notes

---

### Staff Management

**Route:** Dashboard > Staff tab (Super Admin only)

**Features:**
- Add/edit/delete staff
- Role assignment
- Activity logs viewing
- Deactivate staff accounts

**Roles:**
| Role | Description |
|------|-------------|
| Super Admin | Full system access, can manage all staff |
| Admin | Administrative access |
| Receptionist | Front desk operations |
| Dentist | Dental services |
| Assistant | Dental assistant |

---

### Services & Items

**Route:** Dashboard > Services/Items tabs

**Services:**
- Service catalog with categories
- Name, description, price, duration
- Active/inactive toggle

**Items (Inventory):**
- Product/inventory catalog
- Category, description, price
- Stock quantity tracking
- Unit of measurement
- Active/inactive toggle

---

### Dashboard

**Route:** `/dashboard`

**Overview Stats:**
- Total Patients count
- Today's Appointments count
- Monthly Revenue (from paid invoices)
- Active Medical Records (current year)

**Sub-widgets:**
- Today's Appointments list
- Recent Patients list

---

### Settings

**Route:** `/settings`

**Configurable:**
- Clinic Name
- Clinic Address
- Phone Number
- Email
- License Number
- NPWP
- Language preference (Indonesian/English)

---

### Profile

**Route:** `/profile`

**Features:**
- View/edit full name
- View/edit phone number
- Avatar upload
- Password change

---

## User Roles & Permissions

| Feature | Super Admin | Admin | Receptionist | Dentist | Assistant |
|---------|-------------|-------|-------------|---------|-----------|
| Dashboard | Full | Full | Full | Full | Full |
| Patients | CRUD | CRUD | Read | Read | Read |
| Doctors | CRUD | CRUD | Read | Read | - |
| Appointments | CRUD | CRUD | CRUD | Read/Update | Read |
| Medical Records | CRUD | CRUD | Create | CRUD | Create |
| Billing | CRUD | CRUD | Create | - | - |
| Staff | CRUD | - | - | - | - |
| Services | CRUD | CRUD | Read | Read | - |
| Items | CRUD | CRUD | Read | - | - |
| Reports | Full | Full | - | - | - |
| Settings | Full | - | - | - | - |

---

## Database Schema

### Entity Relationship

```
users (staff/doctors)
  ├── doctor_schedules (1:N)
  ├── appointments (1:N)
  ├── medical_records (1:N)
  └── activity_logs (1:N)

patients
  ├── appointments (1:N)
  ├── medical_records (1:N)
  ├── invoices (1:N)
  └── payments (1:N)

appointments
  ├── invoices (1:1)
  └── invoice_items (1:N)

services
  └── appointments (1:N)

medical_records
  ├── prescription_items_enhanced (1:N)
  ├── medical_record_attachments (1:N)
  └── billing_items (1:N)
```

### Key Tables

| Table | Description |
|-------|-------------|
| `users` | Staff and doctor accounts |
| `patients` | Patient records |
| `appointments` | Appointment bookings |
| `medical_records` | Patient visit records |
| `doctor_schedules` | Doctor availability |
| `invoices` | Billing invoices |
| `invoice_items` | Invoice line items |
| `services` | Service catalog |
| `items` | Inventory/products |
| `clinic_settings` | Clinic configuration |
| `activity_logs` | User action logs |
| `audit_trails` | Compliance audit trail |
| `notifications` | System notifications |
| `prescriptions_enhanced` | Prescription records |
| `medications_enhanced` | Medication database |
| `reports` | Report templates |
| `report_instances` | Generated reports |

---

## API / Data Fetching

The app uses TanStack React Query for server state management. All data hooks are in `src/hooks/`:

```typescript
// Example: Fetching patients
import { usePatients } from '@/hooks/usePatients';

const { patients, isLoading, error, refetch } = usePatients();

// Example: Creating a patient
import { useCreatePatient } from '@/hooks/usePatients';
const createPatient = useCreatePatient();
await createPatient({ full_name: 'John Doe', ... });
```

**Available Hooks:**
- `usePatients()` - Patient CRUD operations
- `useDoctors()` - Doctor operations
- `useAppointments()` - Appointment management
- `useInvoices()` - Invoice operations
- `useMedicalRecords()` - Medical record operations
- `useStaff()` - Staff management
- `useServices()` - Service catalog
- `useItems()` - Inventory operations
- `useUserProfile()` - Current user profile
- `useAuth()` - Authentication context

---

## Form Validation

Forms use **React Hook Form** + **Zod** for validation. Validation schemas are in `src/lib/schemas.ts`:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { patientSchema } from '@/lib/schemas';

const form = useForm({
  resolver: zodResolver(patientSchema),
  defaultValues: { ... }
});
```

---

## Troubleshooting

### Error: `useAuth must be used within an AuthProvider`

This was caused by a circular dependency between `AuthContext` and `useUserProfile` hook. It has been fixed - `AuthProvider` now fetches the profile directly instead of using the hook internally.

### Error: `Supabase client not initialized`

Make sure your `.env` file has the correct `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

### Error: `vite command not found`

Run `npm install` first to install all dependencies.

### Error: `Module not found`

Try clearing the Vite cache:
```bash
rm -rf node_modules/.vite
npm run dev
```

### Database connection issues

1. Check your Supabase project is active
2. Verify your `.env` credentials
3. Check Supabase dashboard for any ongoing incidents
4. Ensure RLS policies allow your operations

### Hot reload not working

Try:
```bash
rm -rf node_modules/.vite
npm run dev
```

---

## License

This project is proprietary software for Klinik Gigi management. All rights reserved.
