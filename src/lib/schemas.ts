
import { z } from 'zod';

export const patientSchema = z.object({
  patient_number: z.string().min(3, "No. Pasien minimal 3 karakter"),
  full_name: z.string().min(3, 'Nama lengkap minimal 3 karakter'),
  nik: z.string().length(16, 'NIK harus 16 digit'),
  phone_number: z.string().min(10, 'Nomor telepon tidak valid'),
  email: z.string().email('Email tidak valid').optional().or(z.literal('')),
  address: z.string().min(10, 'Alamat minimal 10 karakter'),
  place_of_birth: z.string().min(3, 'Tempat lahir minimal 3 karakter'),
  date_of_birth: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Tanggal lahir tidak valid" }),
  gender: z.enum(['Laki-laki', 'Perempuan'], { required_error: 'Jenis kelamin harus dipilih' }),
});

export const medicalRecordSchema = z.object({
  patient_id: z.string().uuid(),
  doctor_id: z.string().uuid({ message: 'Dokter harus dipilih' }),
  visit_date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Tanggal kunjungan tidak valid" }),
  chief_complaint: z.string().min(3, 'Keluhan utama minimal 3 karakter'),
  physical_examination: z.string().optional(),
  assessment: z.string().min(3, 'Diagnosa minimal 3 karakter'),
  plan: z.string().min(3, 'Rencana perawatan minimal 3 karakter'),
  diagnosis_codes: z.array(z.string()).optional(),
  
  blood_type: z.string().optional(),
  odontogram_data: z.record(z.string()).optional(),
  history_conditions: z.array(z.string()).optional(),
  covid19_vaccinated: z.boolean().optional(),
  drug_allergies: z.array(z.string()).optional(),
});

export const appointmentSchema = z.object({
  patient_id: z.string().uuid('Pasien harus dipilih'),
  dentist_id: z.string().uuid('Dokter harus dipilih'),
  appointment_date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Tanggal tidak valid" }),
  appointment_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Waktu tidak valid'),
  service_name: z.string().min(1, 'Layanan harus dipilih'),
  notes: z.string().optional(),
});

export const clinicSettingsSchema = z.object({
  clinic_name: z.string().min(3, 'Nama klinik minimal 3 karakter'),
  address: z.string().min(10, 'Alamat minimal 10 karakter'),
  phone_number: z.string().min(10, 'Nomor telepon tidak valid'),
  email: z.string().email('Email tidak valid'),
  language: z.enum(['id', 'en']).default('id').optional(), // Added language field
});

export type ClinicSettingsData = z.infer<typeof clinicSettingsSchema>;
