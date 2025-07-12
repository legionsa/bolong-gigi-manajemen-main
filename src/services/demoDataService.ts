
import { v4 as uuidv4 } from 'uuid';

// DEMO DATA
const DEMO_PATIENTS = [
  { id: 'patient-1', nik: '3173012345678901', full_name: 'Budi Santoso', phone_number: '081234567890', email: 'budi.santoso@email.com', address: 'Jl. Sudirman No. 123, Jakarta Pusat', date_of_birth: '1985-05-20', gender: 'Laki-laki' },
  { id: 'patient-2', nik: '3271987654321098', full_name: 'Siti Rahayu', phone_number: '085678901234', email: 'siti.rahayu@email.com', address: 'Jl. Gatot Subroto No. 456, Jakarta Selatan', date_of_birth: '1990-11-15', gender: 'Perempuan' },
];

const DEMO_USERS = [
  { id: 'dentist-1', full_name: 'Dr. Sari Wijaya', role_name: 'Dentist' },
  { id: 'dentist-2', full_name: 'Dr. Ahmad Pratama', role_name: 'Dentist' },
  { id: 'dentist-3', full_name: 'Dr. Budi Setiawan', role_name: 'Dentist' },
];

const DEMO_APPOINTMENTS = [
  { id: 'appt-1', patient_id: 'patient-1', dentist_id: 'dentist-1', appointment_date_time: '2025-06-15T09:00:00', service_name: 'Pemeriksaan Rutin', status: 'confirmed', patient_name: 'Budi Santoso', dentist_name: 'Dr. Sari Wijaya', duration_in_minutes: 30, notes: 'Pemeriksaan tahunan' },
  { id: 'appt-2', patient_id: 'patient-2', dentist_id: 'dentist-2', appointment_date_time: '2025-06-15T10:30:00', service_name: 'Pembersihan Karang Gigi', status: 'in-progress', patient_name: 'Siti Rahayu', dentist_name: 'Dr. Ahmad Pratama', duration_in_minutes: 45, notes: '' },
];

const DEMO_CLINIC_SETTINGS = {
    id: 'clinic-1',
    clinic_name: 'Klinik Gigi DentalCare Pro (Demo)',
    address: 'Jl. Raya Demo No. 1, Jakarta',
    phone_number: '021-555-1234',
    email: 'contact.demo@dentalcarepro.com',
};


// HELPER FUNCTIONS
const getDemoData = (key, initialData) => {
    try {
        const data = localStorage.getItem(key);
        if (data) {
            return JSON.parse(data);
        }
        localStorage.setItem(key, JSON.stringify(initialData));
        return initialData;
    } catch (error) {
        console.error(`Error with demo data for ${key}:`, error);
        return initialData;
    }
};

const setDemoData = (key, data) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error(`Error setting demo data for ${key}:`, error);
    }
};

// PATIENTS
export const getDemoPatients = () => getDemoData('demo_patients', DEMO_PATIENTS);
export const addDemoPatient = (patient) => {
    const patients = getDemoPatients();
    const newPatient = { ...patient, id: uuidv4() };
    const updatedPatients = [...patients, newPatient];
    setDemoData('demo_patients', updatedPatients);
    return newPatient;
};

// USERS (DENTISTS)
export const getDemoUsers = () => getDemoData('demo_users', DEMO_USERS);

// APPOINTMENTS
export const getDemoAppointments = () => getDemoData('demo_appointments', DEMO_APPOINTMENTS);
export const addDemoAppointment = (appointment) => {
    const appointments = getDemoAppointments();
    const patients = getDemoPatients();
    const users = getDemoUsers();
    
    const patient = patients.find(p => p.id === appointment.patient_id);
    const dentist = users.find(d => d.id === appointment.dentist_id);

    const newAppointment = { 
        ...appointment, 
        id: uuidv4(),
        status: 'confirmed',
        appointment_date_time: `${appointment.appointment_date}T${appointment.appointment_time}:00`,
        patient_name: patient?.full_name || 'N/A',
        dentist_name: dentist?.full_name || 'N/A',
        duration_in_minutes: 30, // default
    };
    const updatedAppointments = [...appointments, newAppointment];
    setDemoData('demo_appointments', updatedAppointments);
    return newAppointment;
};

// CLINIC SETTINGS
export const getDemoClinicSettings = () => getDemoData('demo_clinic_settings', [DEMO_CLINIC_SETTINGS]);
export const updateDemoClinicSettings = (settings) => {
    setDemoData('demo_clinic_settings', [settings]);
    return settings;
};
