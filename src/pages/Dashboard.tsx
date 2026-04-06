
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import DashboardStats from '@/components/DashboardStats'
import PatientManagement from '@/components/PatientManagement'
import DoctorManagement from '@/components/DoctorManagement'
import AppointmentScheduler from '@/components/AppointmentScheduler'
import { BillingManagement } from '@/components/BillingManagement'
import { StaffManagement } from '@/components/StaffManagement'
import { EmployeeManagement } from '@/components/EmployeeManagement'
import { TodayAppointments } from '@/components/dashboard/TodayAppointments'
import { RecentPulse } from '@/components/dashboard/RecentPatients'
import Analytics from '@/pages/Analytics'
import BranchManagement from '@/pages/BranchManagement'
import BpjsClaimManagement from '@/pages/BpjsClaimManagement'
import { SuratIzinSettings } from '@/pages/settings/SuratIzinSettings'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Activity } from 'lucide-react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { useUserProfile } from '@/hooks/useUserProfile'
import React from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { useRoleDisplay } from '@/hooks/useRoleDisplay'
import { PermissionDenied } from '@/components/PermissionDenied'
import { TrialBanner } from '@/components/TrialBanner'
import { useAccountTier } from '@/hooks/useAccountTier'
import type { Permission } from '@/hooks/usePermissions'

const tabComponents: Record<string, React.ElementType> = {
  patients: PatientManagement,
  doctors: DoctorManagement,
  employees: EmployeeManagement,
  appointments: AppointmentScheduler,
  billing: BillingManagement,
  staff: StaffManagement,
  analytics: Analytics,
  branches: BranchManagement,
  bpjs: BpjsClaimManagement,
  surat_izin: SuratIzinSettings,
}

const DashboardSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map(i => (
        <Card key={i} className="bg-surface-container-lowest border-none shadow-long">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="w-10 h-10 rounded-xl" />
            </div>
            <Skeleton className="h-8 w-20 mb-2" />
            <Skeleton className="h-3 w-36" />
          </CardContent>
        </Card>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Skeleton className="h-80 rounded-3xl" />
      </div>
      <Skeleton className="h-80 rounded-3xl" />
    </div>
  </div>
)

const DashboardLoadingScreen = () => (
  <div className="flex min-h-screen bg-surface">
    <Sidebar />
    <div className="flex-1 flex flex-col min-w-0">
      <Header />
      <main className="flex-1 px-4 md:px-8 py-8 pb-24 lg:pb-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Skeleton className="h-10 w-72 mb-2" />
            <Skeleton className="h-4 w-52" />
          </div>
          <Skeleton className="h-10 w-40 rounded-xl" />
        </div>
        <DashboardSkeleton />
      </main>
    </div>
  </div>
)

const Dashboard = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const activeTab = searchParams.get('tab') || 'dashboard'
  const { userProfile, isLoading: isLoadingProfile } = useUserProfile()
  const { can, isAdmin, role } = usePermissions()
  const { isTrial, trialDaysRemaining } = useAccountTier()
  const roleDisplay = useRoleDisplay(role);

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Selamat Pagi'
    if (hour < 15) return 'Selamat Siang'
    if (hour < 18) return 'Selamat Sore'
    return 'Selamat Malam'
  }

  const ActiveComponent = tabComponents[activeTab]

  // Permission check for tab access
  const permissionMap: Record<string, Permission> = {
    patients: 'patients.view',
    doctors: 'staff.manage',
    employees: 'staff.manage',
    appointments: 'appointments.view',
    billing: 'billing.view',
    staff: 'staff.manage',
    analytics: 'analytics.view',
    branches: 'staff.manage',
    bpjs: 'analytics.view',
    surat_izin: 'surat_izin.create',
  };
  const requiredPermission = permissionMap[activeTab];

  if (isLoadingProfile) {
    return <DashboardLoadingScreen />
  }

  if (ActiveComponent && requiredPermission && !can(requiredPermission)) {
    return <PermissionDenied />
  }

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Skip to main content — WCAG */}
      <a href="#dashboard-main" className="skip-to-content">
        Langsung ke konten dasbor
      </a>

      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        {isTrial && isAdmin && (
          <TrialBanner
            trialDaysRemaining={trialDaysRemaining || 0}
            onUpgrade={() => navigate('/settings/billing')}
          />
        )}

        <main
          id="dashboard-main"
          className="flex-1 px-4 md:px-8 py-8 pb-24 lg:pb-8"
          role="main"
          aria-label="Konten dasbor"
        >
          {ActiveComponent ? (
            /* ── Tab content (patients, doctors, etc.) ── */
            <div>
              <div className="flex items-center justify-between mb-6 gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-primary tracking-tight font-headline">
                    {getGreeting()}, {roleDisplay?.label || 'Staf'}
                  </h1>
                  <p className="text-on-surface-variant text-sm mt-0.5">
                    {format(new Date(), 'EEEE, dd MMMM yyyy', { locale: localeId })}
                  </p>
                </div>
              </div>
              <ActiveComponent />
            </div>
          ) : (
            /* ── Default dashboard view ── */
            <div className="space-y-10">
              {/* ── Welcome header ── */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-fade-in">
                <div>
                  <h1 className="text-3xl md:text-4xl font-extrabold text-primary tracking-tight font-headline leading-tight">
                    Open wide for your data.
                  </h1>
                  <p className="text-muted-foreground mt-2 font-medium">
                    Keeping smiles bright and schedules tight today.
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* Clinic status badge */}
                  <div className="flex items-center gap-2 bg-surface-container-lowest px-4 py-2 rounded-xl shadow-long">
                    <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                      Clinic Status:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" aria-hidden="true" />
                      <span className="text-xs font-black text-primary">
                        Berjalan lancar
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="medical"
                    size="sm"
                    className="gap-2 flex-shrink-0 shadow-md shadow-primary/20"
                    asChild
                  >
                    <Link to="/dashboard?tab=appointments">
                      <Plus className="w-4 h-4" aria-hidden="true" />
                      <span>Janji Baru</span>
                    </Link>
                  </Button>
                </div>
              </div>

              {/* ── Stats row (4 cards) ── */}
              <section aria-labelledby="stats-section-title">
                <h2 id="stats-section-title" className="sr-only">Statistik Klinik</h2>
                <DashboardStats />
              </section>

              {/* ── Bento grid: appointments table + activity feed ── */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* The Daily Drill — appointments table */}
                <section
                  className="lg:col-span-2"
                  aria-labelledby="daily-drill-title"
                >
                  <TodayAppointments />
                </section>

                {/* Recent Pulse + Curator's Pro Tip */}
                <section
                  className="space-y-6"
                  aria-labelledby="recent-pulse-title"
                >
                  <RecentPulse />

                  {/* Curator's Pro Tip */}
                  <div
                    className="bg-primary rounded-3xl p-6 text-white relative overflow-hidden group"
                    role="complementary"
                    aria-label="Pro Tip dari Kurator"
                  >
                    <div className="relative z-10">
                      <p className="text-xs font-black uppercase tracking-[0.15em] text-primary-fixed mb-2">
                        Curator's Pro Tip
                      </p>
                      <p className="text-sm text-primary-fixed/90 leading-relaxed">
                        Check-up rutin mengurangi churn pasien sebesar 24%. Sudahkah kamu menjadwalkan pengingat{' '}
                        <em>"Smile Back"</em> minggu ini?
                      </p>
                    </div>
                    {/* Background icon */}
                    <div
                      className="absolute -right-6 -bottom-6 opacity-10 group-hover:rotate-12 transition-transform duration-700"
                      aria-hidden="true"
                    >
                      <Activity className="w-28 h-28" />
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default Dashboard
