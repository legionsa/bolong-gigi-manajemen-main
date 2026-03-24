import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { ControlRoomLayout } from '@/components/controlroom/ControlRoomLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import {
  FileText,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Info,
  Shield,
  User,
  Building2,
  Settings,
  Key,
  UserX,
  UserCheck,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AuditEntry {
  id: number
  actor_type: string
  actor_id: string | null
  actor_email: string | null
  clinic_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  before_state: any | null
  after_state: any | null
  ip_address: string | null
  user_agent: string | null
  severity: string
  created_at: string
}

const severityColors: Record<string, string> = {
  info: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  critical: 'bg-red-500/10 text-red-500 border-red-500/20',
}

const actionIcons: Record<string, React.ReactNode> = {
  USER_DEACTIVATED: <UserX className="w-4 h-4" />,
  USER_ACTIVATED: <UserCheck className="w-4 h-4" />,
  SESSION_CREATED: <User className="w-4 h-4" />,
  SESSION_REVOKED: <LogOut className="w-4 h-4" />,
  API_KEY_CREATED: <Key className="w-4 h-4" />,
  API_KEY_VIEWED: <Key className="w-4 h-4" />,
  API_KEY_REVOKED: <Key className="w-4 h-4" />,
  SETTINGS_CHANGED: <Settings className="w-4 h-4" />,
  CLINIC_CREATED: <Building2 className="w-4 h-4" />,
  CLINIC_UPDATED: <Building2 className="w-4 h-4" />,
}

const actionColors: Record<string, string> = {
  USER_DEACTIVATED: 'text-red-400',
  USER_ACTIVATED: 'text-green-400',
  SESSION_CREATED: 'text-blue-400',
  SESSION_REVOKED: 'text-amber-400',
  API_KEY_CREATED: 'text-purple-400',
  API_KEY_VIEWED: 'text-gray-400',
  API_KEY_REVOKED: 'text-red-400',
  SETTINGS_CHANGED: 'text-cyan-400',
  CLINIC_CREATED: 'text-green-400',
  CLINIC_UPDATED: 'text-amber-400',
}

export default function AuditLogExplorer() {
  const { toast } = useToast()

  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('7d')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 25

  // Calculate date filter
  const getDateFilter = () => {
    const now = new Date()
    switch (dateRange) {
      case '1d':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000)
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }
  }

  // Fetch audit logs
  const { data: auditLogs, isLoading } = useQuery<AuditEntry[]>({
    queryKey: ['controlroom', 'audit-logs', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('controlroom.audit_log')
        .select('*')
        .gte('created_at', getDateFilter().toISOString())
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) throw error
      return data || []
    },
    staleTime: 60 * 1000,
  })

  // Fetch summary stats
  const { data: stats } = useQuery({
    queryKey: ['controlroom', 'audit-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('controlroom.audit_log')
        .select('severity, action')

      if (error) throw error

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const recentLogs = (data || []).filter((log: any) => new Date(log.created_at) >= sevenDaysAgo)

      return {
        total: data?.length || 0,
        thisWeek: recentLogs.length,
        critical: recentLogs.filter((l: any) => l.severity === 'critical').length,
        byAction: recentLogs.reduce((acc: any, log: any) => {
          acc[log.action] = (acc[log.action] || 0) + 1
          return acc
        }, {}),
      }
    },
    staleTime: 60 * 1000,
  })

  // Filter logs
  const filteredLogs = auditLogs?.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.actor_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity_id?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesSeverity = severityFilter === 'all' || log.severity === severityFilter
    const matchesAction = actionFilter === 'all' || log.action.includes(actionFilter)

    return matchesSearch && matchesSeverity && matchesAction
  })

  // Pagination
  const totalPages = Math.ceil((filteredLogs?.length || 0) / pageSize)
  const paginatedLogs = filteredLogs?.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  // Export to CSV
  const handleExport = () => {
    if (!filteredLogs) return

    const headers = ['Timestamp', 'Actor', 'Action', 'Entity Type', 'Entity ID', 'Severity', 'IP Address']
    const rows = filteredLogs.map((log) => [
      format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
      log.actor_email || 'System',
      log.action,
      log.entity_type || '',
      log.entity_id || '',
      log.severity,
      log.ip_address || '',
    ])

    const csv = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
  }

  const superadmin = {
    email: 'arya@company.com',
    displayName: 'Arya Kusuma',
    tier: 'operator',
  }

  return (
    <ControlRoomLayout superadmin={superadmin} platformStatus="green">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-100">Audit Log Explorer</h1>
            <p className="text-sm text-gray-500 mt-1">
              Searchable audit trail of all platform activities
            </p>
          </div>
          <Button
            onClick={handleExport}
            variant="outline"
            className="border-gray-700 gap-1.5"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-[#0A1120] border-gray-800">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Events</p>
                  <p className="text-2xl font-semibold text-gray-100">{stats?.total || 0}</p>
                </div>
                <FileText className="w-8 h-8 text-gray-500/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#0A1120] border-gray-800">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">This Week</p>
                  <p className="text-2xl font-semibold text-amber-500">{stats?.thisWeek || 0}</p>
                </div>
                <Info className="w-8 h-8 text-amber-500/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#0A1120] border-gray-800">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Critical Events</p>
                  <p className="text-2xl font-semibold text-red-500">{stats?.critical || 0}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-500/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#0A1120] border-gray-800">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Top Action</p>
                  <p className="text-lg font-semibold text-gray-100 truncate">
                    {stats?.byAction ? Object.entries(stats.byAction).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A' : 'N/A'}
                  </p>
                </div>
                <Shield className="w-8 h-8 text-cyan-500/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Search by action, actor, entity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#0A1120] border-gray-800 text-gray-100"
            />
          </div>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-32 bg-[#0A1120] border-gray-800">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-40 bg-[#0A1120] border-gray-800">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="USER">User Actions</SelectItem>
              <SelectItem value="SESSION">Session Actions</SelectItem>
              <SelectItem value="API_KEY">API Key Actions</SelectItem>
              <SelectItem value="SETTINGS">Settings</SelectItem>
              <SelectItem value="CLINIC">Clinic Actions</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32 bg-[#0A1120] border-gray-800">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Audit Log Table */}
        <div className="bg-[#0A1120] border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Timestamp</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Action</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Entity</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Severity</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">IP Address</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                </tr>
              ) : paginatedLogs?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No audit logs found</td>
                </tr>
              ) : (
                paginatedLogs?.map((log) => (
                  <tr key={log.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-900/50">
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-300">
                        {format(new Date(log.created_at), 'dd MMM yyyy')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(log.created_at), 'HH:mm:ss')}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-gray-700 rounded-full flex items-center justify-center">
                          {log.actor_type === 'superadmin' ? (
                            <Shield className="w-3 h-3 text-amber-500" />
                          ) : log.actor_type === 'system' ? (
                            <Settings className="w-3 h-3 text-gray-500" />
                          ) : (
                            <User className="w-3 h-3 text-blue-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-gray-100">{log.actor_email || 'System'}</p>
                          <p className="text-xs text-gray-500">{log.actor_type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={cn('w-6 h-6 rounded flex items-center justify-center', actionColors[log.action] || 'text-gray-400')}>
                          {actionIcons[log.action] || <FileText className="w-4 h-4" />}
                        </span>
                        <span className="text-sm text-gray-100 font-mono">{log.action}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-300">{log.entity_type || '-'}</p>
                      <p className="text-xs text-gray-500 font-mono truncate max-w-[150px]">{log.entity_id || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn('text-xs', severityColors[log.severity] || severityColors.info)}>
                        {log.severity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-300 font-mono">{log.ip_address || '-'}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredLogs?.length || 0)} of {filteredLogs?.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="border-gray-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-300">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="border-gray-700"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </ControlRoomLayout>
  )
}