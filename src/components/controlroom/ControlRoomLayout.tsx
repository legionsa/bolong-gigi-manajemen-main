import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  LayoutDashboard,
  Building2,
  Users,
  MessageSquare,
  Smartphone,
  Mail,
  Settings,
  Shield,
  Activity,
  DollarSign,
  Search,
  Plus,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  XCircle,
  Megaphone,
  Key,
  AlertTriangle,
  FileText,
} from 'lucide-react'

interface NavItem {
  label: string
  icon: React.ReactNode
  href: string
  badge?: string | number
}

interface NavGroup {
  label?: string
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    items: [
      { label: 'Command Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, href: '/controlroom' },
    ],
  },
  {
    label: 'REGISTRY',
    items: [
      { label: 'Clinics', icon: <Building2 className="w-5 h-5" />, href: '/controlroom/clinics' },
      { label: 'Users', icon: <Users className="w-5 h-5" />, href: '/controlroom/users' },
    ],
  },
  {
    label: 'INTEGRATIONS',
    items: [
      { label: 'WhatsApp Hub', icon: <MessageSquare className="w-5 h-5" />, href: '/controlroom/whatsapp' },
      { label: 'OTP Settings', icon: <Smartphone className="w-5 h-5" />, href: '/controlroom/otp-settings' },
      { label: 'Integration Vault', icon: <Key className="w-5 h-5" />, href: '/controlroom/integrations' },
    ],
  },
  {
    label: 'PLATFORM',
    items: [
      { label: 'Incidents', icon: <AlertTriangle className="w-5 h-5" />, href: '/controlroom/incidents' },
      { label: 'Announcements', icon: <Megaphone className="w-5 h-5" />, href: '/controlroom/announcements' },
      { label: 'Audit Log', icon: <FileText className="w-5 h-5" />, href: '/controlroom/audit-log' },
    ],
  },
]

interface ControlRoomLayoutProps {
  children: React.ReactNode
  superadmin?: {
    email: string
    displayName: string
    tier: string
  }
  onLogout?: () => void
  platformStatus?: 'green' | 'amber' | 'red'
  onSearch?: (query: string) => void
}

export function ControlRoomLayout({
  children,
  superadmin,
  onLogout,
  platformStatus = 'green',
  onSearch,
}: ControlRoomLayoutProps) {
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch?.(searchQuery)
  }

  const statusColors = {
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  }

  return (
    <div className="min-h-screen bg-[#05080F] text-gray-100">
      {/* Status Ring - Fixed at top */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50 flex">
        <div className={cn('w-full transition-colors', statusColors[platformStatus])} />
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-1 h-[calc(100vh-4px)] bg-[#0A1120] border-r border-gray-800 flex flex-col z-40 transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center font-bold text-black">
              D
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="font-semibold text-sm">DentiCare</span>
                <span className="text-xs text-amber-500">ControlRoom</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {navGroups.map((group, idx) => (
            <div key={idx} className="mb-4">
              {group.label && !collapsed && (
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {group.label}
                </div>
              )}
              {group.items.map((item) => {
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors',
                      isActive
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                    )}
                  >
                    {item.icon}
                    {!collapsed && (
                      <span className="text-sm font-medium">{item.label}</span>
                    )}
                    {!collapsed && item.badge && (
                      <Badge variant="outline" className="ml-auto text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-4 border-t border-gray-800 text-gray-400 hover:text-gray-100 transition-colors flex items-center justify-center"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>

        {/* User Info */}
        {superadmin && !collapsed && (
          <div className="p-4 border-t border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-sm font-medium">
                {superadmin.displayName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{superadmin.displayName}</p>
                <p className="text-xs text-gray-500 truncate">{superadmin.email}</p>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
            <Badge
              variant="outline"
              className={cn(
                'mt-2 text-xs',
                superadmin.tier === 'owner' && 'border-amber-500 text-amber-500',
                superadmin.tier === 'operator' && 'border-cyan-500 text-cyan-500',
                superadmin.tier === 'viewer' && 'border-gray-500 text-gray-500'
              )}
            >
              {superadmin.tier}
            </Badge>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main
        className={cn(
          'transition-all duration-300 pt-6',
          collapsed ? 'ml-16' : 'ml-64'
        )}
      >
        {/* Header */}
        <header className="sticky top-1 z-30 bg-[#05080F]/80 backdrop-blur-sm border-b border-gray-800 px-6 py-3">
          <div className="flex items-center gap-4">
            {/* Global Search */}
            <form onSubmit={handleSearch} className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  type="search"
                  placeholder="Search clinics, users, or invoice IDs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-[#0A1120] border-gray-700 text-gray-100 placeholder:text-gray-500 focus:border-amber-500"
                />
              </div>
            </form>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-gray-100 gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Onboard Clinic
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="relative text-gray-400 hover:text-gray-100"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full" />
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  )
}

// Status indicator component
export function StatusIndicator({ status }: { status: 'operational' | 'degraded' | 'down' }) {
  const config = {
    operational: { color: 'bg-green-500', label: 'Operational' },
    degraded: { color: 'bg-amber-500', label: 'Degraded' },
    down: { color: 'bg-red-500', label: 'Down' },
  }
  const { color, label } = config[status]
  return (
    <div className="flex items-center gap-2">
      <div className={cn('w-2 h-2 rounded-full', color)} />
      <span className="text-sm text-gray-400">{label}</span>
    </div>
  )
}

// Metric card component
export function MetricCard({
  title,
  value,
  change,
  trend,
  icon,
}: {
  title: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  icon?: React.ReactNode
}) {
  return (
    <div className="bg-[#0A1120] border border-gray-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">{title}</span>
        {icon && <span className="text-gray-400">{icon}</span>}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-semibold text-gray-100">{value}</span>
        {change && (
          <span
            className={cn(
              'text-xs',
              trend === 'up' && 'text-green-400',
              trend === 'down' && 'text-red-400',
              trend === 'neutral' && 'text-gray-400'
            )}
          >
            {change}
          </span>
        )}
      </div>
    </div>
  )
}

// Alert item component
export function AlertItem({
  severity,
  message,
  time,
}: {
  severity: 'info' | 'warning' | 'critical'
  message: string
  time: string
}) {
  const colors = {
    info: 'border-cyan-500/30 bg-cyan-500/5',
    warning: 'border-amber-500/30 bg-amber-500/5',
    critical: 'border-red-500/30 bg-red-500/5',
  }
  const icons = {
    info: <CheckCircle className="w-4 h-4 text-cyan-500" />,
    warning: <AlertCircle className="w-4 h-4 text-amber-500" />,
    critical: <XCircle className="w-4 h-4 text-red-500" />,
  }
  return (
    <div className={cn('border rounded-lg p-3', colors[severity])}>
      <div className="flex items-start gap-2">
        {icons[severity]}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-100">{message}</p>
          <p className="text-xs text-gray-500 mt-0.5">{time}</p>
        </div>
      </div>
    </div>
  )
}