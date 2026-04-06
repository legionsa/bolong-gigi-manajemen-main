// src/App.tsx (Updated)
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import { BillingSettings } from '@/pages/settings/BillingSettings';
import { SuratIzinSettings } from '@/pages/settings/SuratIzinSettings';
import { NotaKwitansiSettings } from '@/pages/settings/NotaKwitansiSettings';
import Onboarding from './pages/Onboarding';
import ProtectedRoute from './components/ProtectedRoute';
import PortalLogin from './pages/portal/PortalLogin';
import PortalRegister from './pages/portal/PortalRegister';
import PortalDashboard from './pages/portal/PortalDashboard';
import PortalProfile from './pages/portal/PortalProfile';
import OnlineBooking from './pages/booking/OnlineBooking';
import ControlRoomDashboard from './pages/controlroom/ControlRoomDashboard';
import ClinicRegistry from './pages/controlroom/ClinicRegistry';
import UserManagement from './pages/controlroom/UserManagement';
import WhatsAppHub from './pages/controlroom/WhatsAppHub';
import OtpSettings from './pages/controlroom/OtpSettings';
import IncidentManagement from './pages/controlroom/IncidentManagement';
import AnnouncementsManager from './pages/controlroom/AnnouncementsManager';
import AuditLogExplorer from './pages/controlroom/AuditLogExplorer';
import IntegrationVault from './pages/controlroom/IntegrationVault';
import TotpEnrollment from './pages/controlroom/TotpEnrollment';
import SecuritySettings from './pages/controlroom/SecuritySettings';
import DatabaseExplorer from './pages/controlroom/DatabaseExplorer';
import StorageMonitor from './pages/controlroom/StorageMonitor';
import CostMonitor from './pages/controlroom/CostMonitor';
import ComplianceChecklist from './pages/controlroom/ComplianceChecklist';
import DataRetention from './pages/controlroom/DataRetention';
import TelehealthRoom from './pages/TelehealthRoom';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: Infinity,
      staleTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 2,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <TooltipProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/settings/billing" element={<ProtectedRoute><BillingSettings /></ProtectedRoute>} />
            <Route path="/surat-izin" element={<ProtectedRoute><SuratIzinSettings /></ProtectedRoute>} />
            <Route path="/settings/nota" element={<ProtectedRoute><NotaKwitansiSettings /></ProtectedRoute>} />
            {/* Patient Portal Routes */}
            <Route path="/portal/login" element={<PortalLogin />} />
            <Route path="/portal/register" element={<PortalRegister />} />
            <Route path="/portal/dashboard" element={<PortalDashboard />} />
            <Route path="/portal/profile" element={<PortalProfile />} />
            {/* Control Room */}
            <Route path="/controlroom" element={<ControlRoomDashboard />} />
            <Route path="/controlroom/clinics" element={<ClinicRegistry />} />
            <Route path="/controlroom/users" element={<UserManagement />} />
            <Route path="/controlroom/whatsapp" element={<WhatsAppHub />} />
            <Route path="/controlroom/otp-settings" element={<OtpSettings />} />
            <Route path="/controlroom/incidents" element={<IncidentManagement />} />
            <Route path="/controlroom/announcements" element={<AnnouncementsManager />} />
            <Route path="/controlroom/audit-log" element={<AuditLogExplorer />} />
            <Route path="/controlroom/integrations" element={<IntegrationVault />} />
            <Route path="/controlroom/totp-enrollment" element={<TotpEnrollment />} />
            <Route path="/controlroom/security-settings" element={<SecuritySettings />} />
            <Route path="/controlroom/database" element={<DatabaseExplorer />} />
            <Route path="/controlroom/storage" element={<StorageMonitor />} />
            <Route path="/controlroom/costs" element={<CostMonitor />} />
            <Route path="/controlroom/compliance" element={<ComplianceChecklist />} />
            <Route path="/controlroom/data-retention" element={<DataRetention />} />
            {/* Online Booking */}
            <Route path="/booking" element={<OnlineBooking />} />
            {/* Telehealth */}
            <Route path="/telehealth/:sessionId" element={<ProtectedRoute><TelehealthRoom /></ProtectedRoute>} />
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
          </TooltipProvider>
          <Toaster />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
