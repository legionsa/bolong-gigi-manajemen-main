// DentiCare Pro - Superadmin Control Room
// Standalone deployment for subdomain hosting

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import ControlRoomDashboard from './pages/controlroom/ControlRoomDashboard'
import ClinicRegistry from './pages/controlroom/ClinicRegistry'
import UserManagement from './pages/controlroom/UserManagement'
import WhatsAppHub from './pages/controlroom/WhatsAppHub'
import OtpSettings from './pages/controlroom/OtpSettings'
import IncidentManagement from './pages/controlroom/IncidentManagement'
import AnnouncementsManager from './pages/controlroom/AnnouncementsManager'
import AuditLogExplorer from './pages/controlroom/AuditLogExplorer'
import IntegrationVault from './pages/controlroom/IntegrationVault'

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
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ControlRoomDashboard />} />
          <Route path="/clinics" element={<ClinicRegistry />} />
          <Route path="/users" element={<UserManagement />} />
          <Route path="/whatsapp" element={<WhatsAppHub />} />
          <Route path="/otp-settings" element={<OtpSettings />} />
          <Route path="/incidents" element={<IncidentManagement />} />
          <Route path="/announcements" element={<AnnouncementsManager />} />
          <Route path="/audit-log" element={<AuditLogExplorer />} />
          <Route path="/integrations" element={<IntegrationVault />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App