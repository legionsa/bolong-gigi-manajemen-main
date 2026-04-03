import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Calendar,
  Receipt,
  UserCog,
  ExternalLink,
  LogOut,
  Smile,
  Plus,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useClinicSettings } from '@/hooks/useClinicSettings'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useRef, useCallback } from 'react'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  superAdminOnly?: boolean
}

const navItems: NavItem[] = [
  { label: 'Overview',    href: '/dashboard',                  icon: LayoutDashboard },
  { label: 'Pasien',      href: '/dashboard?tab=patients',     icon: Users },
  { label: 'Dokter',      href: '/dashboard?tab=doctors',      icon: Stethoscope },
  { label: 'Jadwal',      href: '/dashboard?tab=appointments', icon: Calendar },
  { label: 'Tagihan',     href: '/dashboard?tab=billing',      icon: Receipt },
  { label: 'Staff',       href: '/dashboard?tab=staff',        icon: UserCog, superAdminOnly: true },
]

// ── Mobile bottom bar item ──────────────────────────────────
const BottomNavItem = ({
  item,
  isActive,
  onClick,
}: {
  item: NavItem
  isActive: boolean
  onClick: () => void
}) => (
  <button
    onClick={onClick}
    className={cn(
      'flex flex-col items-center justify-center gap-1 flex-1 h-16 min-w-[56px] transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset rounded-none',
      isActive ? 'text-primary' : 'text-muted-foreground hover:text-on-surface'
    )}
    aria-current={isActive ? 'page' : undefined}
    aria-label={item.label}
  >
    {/* Pill indicator for active state on mobile */}
    <div className="relative flex items-center justify-center">
      {isActive && (
        <span
          className="absolute inset-x-[-8px] inset-y-[-4px] bg-primary-fixed rounded-full"
          aria-hidden="true"
        />
      )}
      <item.icon className="w-5 h-5 relative z-10" aria-hidden="true" />
    </div>
    <span className="text-[9px] font-semibold">{item.label}</span>
  </button>
)

// ── Sidebar content (shared between full + collapsed) ───────
const SidebarContent = ({
  collapsed = false,
  clinicName,
  user,
  userRole,
  isSuperAdmin,
  isActiveFn,
  onLogout,
  onNavClick,
}: {
  collapsed?: boolean
  clinicName: string
  user: ReturnType<typeof useAuth>['user']
  userRole: string
  isSuperAdmin: boolean
  isActiveFn: (href: string) => boolean
  onLogout: () => void
  onNavClick: (href: string) => void
}) => {
  const navRef = useRef<HTMLElement>(null)

  // Arrow-key navigation between nav items
  const handleNavKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLElement>, index: number, items: NavItem[]) => {
      const navEls = navRef.current?.querySelectorAll<HTMLElement>('[data-navitem]')
      if (!navEls) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        navEls[index + 1]?.focus()
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        navEls[index - 1]?.focus()
      }
    },
    []
  )

  const visibleItems = navItems.filter(item => !item.superAdminOnly || isSuperAdmin)

  return (
    <div className="flex flex-col h-full">
      {/* ── Logo ── */}
      <div className={cn('flex items-center gap-3 px-4 py-5', collapsed && 'justify-center px-2')}>
        <div className="w-10 h-10 rounded-xl medical-gradient flex items-center justify-center shadow-md flex-shrink-0">
          <Smile className="w-5 h-5 text-white" aria-hidden="true" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <span className="font-black text-xl tracking-tight text-primary font-headline leading-none block truncate">
              {clinicName}
            </span>
            <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-bold opacity-70">
              Clinical Curator
            </span>
          </div>
        )}
      </div>

      {/* ── User info ── */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-3 mb-2',
          collapsed ? 'flex-col px-2 py-3' : ''
        )}
      >
        <Avatar className={cn('flex-shrink-0', collapsed ? 'w-10 h-10' : 'w-9 h-9')}>
          <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.email} />
          <AvatarFallback className="bg-secondary-fixed text-on-secondary-fixed text-sm font-semibold">
            {user?.email?.charAt(0)?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-on-surface truncate">
              {user?.user_metadata?.full_name || user?.email}
            </span>
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">
              {userRole}
            </span>
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav
        ref={navRef}
        className="flex-1 py-2 overflow-y-auto px-2 space-y-0.5"
        aria-label="Navigasi utama dasbor"
      >
        {visibleItems.map((item, index) => {
          const active = isActiveFn(item.href)
          const Icon = item.icon

          if (collapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    to={item.href}
                    data-navitem
                    tabIndex={0}
                    onKeyDown={e => handleNavKeyDown(e, index, visibleItems)}
                    className={cn(
                      'flex items-center justify-center w-12 h-11 rounded-full mx-auto transition-all duration-200',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                      active
                        ? 'bg-primary-fixed text-primary'
                        : 'text-muted-foreground hover:bg-surface-container hover:text-on-surface'
                    )}
                    aria-current={active ? 'page' : undefined}
                    aria-label={item.label}
                  >
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {item.label}
                </TooltipContent>
              </Tooltip>
            )
          }

          return (
            <Link
              key={item.href}
              to={item.href}
              data-navitem
              tabIndex={0}
              onKeyDown={e => handleNavKeyDown(e, index, visibleItems)}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-semibold transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                active
                  ? 'bg-primary-fixed text-primary scale-[0.97]'
                  : 'text-muted-foreground hover:bg-surface-container hover:text-on-surface'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              <span>{item.label}</span>
              {active && (
                <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" aria-hidden="true" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── Bottom actions ── */}
      <div className="py-4 px-2 space-y-1">
        {/* New Appointment CTA — the reference design's primary CTA */}
        {!collapsed && (
          <Button
            variant="medical"
            size="sm"
            className="w-full gap-2 rounded-xl py-5 font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all mb-3"
            asChild
          >
            <Link to="/dashboard?tab=appointments">
              <Plus className="w-4 h-4" aria-hidden="true" />
              Janji Baru
            </Link>
          </Button>
        )}

        <a
          href="/portal/login"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            'text-muted-foreground hover:bg-surface-container hover:text-on-surface'
          )}
          aria-label="Buka Patient Portal di tab baru"
        >
          <ExternalLink className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          {!collapsed && <span>Patient Portal</span>}
        </a>

        <button
          onClick={onLogout}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 w-full text-left',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            'text-muted-foreground hover:bg-surface-container hover:text-on-surface'
          )}
          aria-label="Keluar dari akun"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          {!collapsed && <span>Keluar</span>}
        </button>
      </div>
    </div>
  )
}

// ── Main export ─────────────────────────────────────────────
export const Sidebar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { settings } = useClinicSettings()

  const clinicName = settings?.clinic_name || 'DentiCare Pro'
  const userRole   = user?.user_metadata?.role_name || 'Staf'
  const isSuperAdmin = userRole === 'Super Admin'

  const handleLogout = async () => {
    try { await logout() } catch (e) { console.error('Logout failed:', e) }
  }

  const isActive = (href: string) => {
    const params = new URLSearchParams(window.location.search)
    const currentTab = params.get('tab')
    if (href.includes('tab=')) {
      const tabValue = href.split('tab=')[1]
      return currentTab === tabValue ||
        (currentTab === null && tabValue === 'dashboard' && href.includes('/dashboard'))
    }
    return location.pathname === href && !currentTab
  }

  const handleNavClick = (href: string) => navigate(href)

  const sharedProps = {
    clinicName,
    user,
    userRole,
    isSuperAdmin,
    isActiveFn: isActive,
    onLogout: handleLogout,
    onNavClick: handleNavClick,
  }

  return (
    <>
      {/* Desktop sidebar — full width */}
      <aside
        className="hidden lg:flex flex-col w-[260px] h-screen sticky top-0 bg-surface-container-low border-r border-outline-variant/[0.07] flex-shrink-0"
        aria-label="Bilah sisi navigasi"
      >
        <SidebarContent {...sharedProps} />
      </aside>

      {/* Tablet sidebar — icons only */}
      <aside
        className="hidden md:flex lg:hidden flex-col w-[72px] h-screen sticky top-0 bg-surface-container-low border-r border-outline-variant/[0.07] flex-shrink-0"
        aria-label="Navigasi tablet"
      >
        <SidebarContent {...sharedProps} collapsed />
      </aside>

      {/* Mobile bottom navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 h-16 bg-surface/90 backdrop-blur-xl border-t border-outline-variant/10 flex md:hidden z-50"
        aria-label="Navigasi bawah mobile"
      >
        {navItems
          .filter(item => !item.superAdminOnly || isSuperAdmin)
          .slice(0, 5)
          .map(item => (
            <BottomNavItem
              key={item.href}
              item={item}
              isActive={isActive(item.href)}
              onClick={() => navigate(item.href)}
            />
          ))}
      </nav>
    </>
  )
}