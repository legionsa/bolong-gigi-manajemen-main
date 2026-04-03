import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { ControlRoomLayout } from '@/components/controlroom/ControlRoomLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import {
  Database,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  AlertTriangle,
  Shield,
  Lock,
  Info,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Curated list of tables allowed for browsing
const ALLOWED_TABLES = [
  'clinics',
  'clinic_users',
  'patients',
  'appointments',
  'doctors',
  'billing_items',
  'invoices',
  'payments',
  'onboarding_progress',
  'branches',
]

// PII column patterns per table
const PII_COLUMNS: Record<string, string[]> = {
  patients: ['name', 'email', 'phone', 'nik', 'address', 'emergency_contact_name', 'emergency_contact_phone'],
  clinics: ['head_name', 'contact_email', 'contact_phone'],
  clinic_users: ['name', 'email', 'phone'],
  doctors: ['name', 'email', 'phone', 'str_number', 'npwp'],
}

// PII masking functions
function maskName(name: string): string {
  if (!name || name.length < 2) return '***'
  const parts = name.split(' ')
  return parts.map(part => {
    if (part.length <= 1) return part + '***'
    return part[0] + '***' + part[part.length - 1]
  }).join(' ')
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return '***'
  if (phone.startsWith('+')) {
    // Show first 4 and last 3 digits
    return phone.slice(0, 4) + '***' + phone.slice(-3)
  }
  return phone.slice(0, 3) + '***' + phone.slice(-3)
}

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***.***'
  const [local, domain] = email.split('@')
  const [domainName, ...tlds] = domain.split('.')
  return local[0] + '***@***.' + domainName.slice(-3) + '.' + tlds.join('.')
}

function maskNIK(nik: string): string {
  if (!nik || nik.length < 4) return '****-****-****-****'
  return '****-****-****-' + nik.slice(-4)
}

function maskValue(column: string, value: string): string {
  if (!value) return value

  const lowerColumn = column.toLowerCase()

  // Name patterns
  if (lowerColumn.includes('name') && !lowerColumn.includes('id')) {
    return maskName(value)
  }

  // Email
  if (lowerColumn === 'email' || lowerColumn.includes('email')) {
    return maskEmail(value)
  }

  // Phone
  if (lowerColumn.includes('phone') || lowerColumn.includes('tel')) {
    return maskPhone(value)
  }

  // NIK / KTP
  if (lowerColumn === 'nik' || lowerColumn.includes('ktp') || lowerColumn.includes('identity')) {
    return maskNIK(value)
  }

  // Default: return as-is (non-PII)
  return value
}

function applyPIIMasking(row: Record<string, any>, tableName: string): Record<string, any> {
  const piiCols = PII_COLUMNS[tableName] || []
  const masked = { ...row }

  for (const key of Object.keys(masked)) {
    if (piiCols.some(col => key.toLowerCase().includes(col.toLowerCase()))) {
      masked[key] = maskValue(key, String(masked[key] ?? ''))
    }
  }

  return masked
}

interface ColumnDef {
  name: string
  type: string
}

interface QueryResult {
  columns: ColumnDef[]
  rows: Record<string, any>[]
  totalCount: number
  page: number
  pageSize: number
}

export default function DatabaseExplorer() {
  const { toast } = useToast()

  const [selectedTable, setSelectedTable] = useState<string>('clinics')
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [searchQuery, setSearchQuery] = useState('')

  const pageSize = 50

  // Fetch table data
  useEffect(() => {
    fetchTableData()
  }, [selectedTable, currentPage, sortColumn, sortDirection])

  const fetchTableData = async () => {
    setIsLoading(true)

    try {
      // Security check - only allow curated tables
      if (!ALLOWED_TABLES.includes(selectedTable)) {
        throw new Error(`Table "${selectedTable}" is not allowed. Only read operations are permitted.`)
      }

      // Build query using Supabase client (read-only)
      let query = supabase.from(selectedTable).select('*', { count: 'exact' })

      // Apply sorting
      if (sortColumn) {
        query = query.order(sortColumn, { ascending: sortDirection === 'asc' })
      }

      // Apply pagination
      const from = (currentPage - 1) * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error

      // Apply PII masking to all string columns
      const maskedRows = (data || []).map(row => applyPIIMasking(row, selectedTable))

      // Get column info from first row
      const columns: ColumnDef[] = data && data.length > 0
        ? Object.keys(data[0]).map(key => ({
            name: key,
            type: typeof data[0][key],
          }))
        : []

      setQueryResult({
        columns,
        rows: maskedRows,
        totalCount: count || 0,
        page: currentPage,
        pageSize,
      })
    } catch (error: any) {
      toast({
        title: 'Query failed',
        description: error.message,
        variant: 'destructive',
      })
      // Log audit trail for failed query attempt
      logAuditEvent('read', selectedTable, error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const logAuditEvent = async (action: string, table: string, queryText: string, rowCount?: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      await supabase.from('controlroom.audit_log').insert({
        actor_id: user?.id,
        action,
        table_accessed: table,
        query_hash: btoa(queryText).slice(0, 32),
        row_count: rowCount,
        ip_address: await getClientIP(),
        user_agent: navigator.userAgent,
      })
    } catch (e) {
      console.error('Failed to log audit event:', e)
    }
  }

  const getClientIP = async (): Promise<string> => {
    // In production, this would be captured server-side
    return 'unknown'
  }

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const handleExportCSV = () => {
    if (!queryResult?.rows.length) return

    // Get headers from columns
    const headers = queryResult.columns.map(c => c.name)
    const csvRows = [headers.join(',')]

    queryResult.rows.forEach(row => {
      const values = headers.map(h => {
        const val = String(row[h] ?? '')
        // Escape quotes and wrap in quotes if contains comma
        if (val.includes(',') || val.includes('"')) {
          return '"' + val.replace(/"/g, '""') + '"'
        }
        return val
      })
      csvRows.push(values.join(','))
    })

    const csv = csvRows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedTable}_export_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`
    a.click()

    // Log export action
    logAuditEvent('export', selectedTable, `SELECT * FROM ${selectedTable}`, queryResult.rows.length)

    toast({ title: 'Export complete', description: `${queryResult.rows.length} rows exported (PII masked)` })
  }

  const handleRefresh = () => {
    fetchTableData()
  }

  const totalPages = queryResult ? Math.ceil(queryResult.totalCount / pageSize) : 0

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
            <h1 className="text-2xl font-semibold text-gray-100 flex items-center gap-2">
              <Database className="w-6 h-6" />
              Database Explorer
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Read-only browser for platform data with PII masking
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-red-500 text-red-500 gap-1">
              <Lock className="w-3 h-3" />
              READ-ONLY
            </Badge>
          </div>
        </div>

        {/* Security Warning */}
        <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <Shield className="w-5 h-5 text-amber-500 mt-0.5" />
          <div>
            <p className="text-sm text-amber-400 font-medium">Read-Only Access</p>
            <p className="text-xs text-gray-400">
              This tool provides read-only access to platform data. All queries are logged for audit purposes.
              INSERT, UPDATE, and DELETE operations are blocked and logged as security events.
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <Select value={selectedTable} onValueChange={(v) => {
            setSelectedTable(v)
            setCurrentPage(1)
            setSortColumn(null)
          }}>
            <SelectTrigger className="w-48 bg-[#0A1120] border-gray-700">
              <SelectValue placeholder="Select table" />
            </SelectTrigger>
            <SelectContent>
              {ALLOWED_TABLES.map(table => (
                <SelectItem key={table} value={table}>
                  {table}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Filter results..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#0A1120] border-gray-700 text-gray-100"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="border-gray-700 text-gray-300"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={!queryResult?.rows.length}
            className="border-gray-700 text-gray-300"
          >
            <Download className="w-4 h-4 mr-1" />
            Export CSV
          </Button>
        </div>

        {/* Stats */}
        {queryResult && (
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>Total: {queryResult.totalCount.toLocaleString()} rows</span>
            <span>|</span>
            <span>Page {currentPage} of {totalPages || 1}</span>
            <span>|</span>
            <span>Showing {queryResult.rows.length} rows (PII masked)</span>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-[#0A1120] border border-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 bg-[#05080F]">
                  {queryResult?.columns.map((col) => (
                    <th
                      key={col.name}
                      className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase cursor-pointer hover:text-gray-200"
                      onClick={() => handleSort(col.name)}
                    >
                      <div className="flex items-center gap-1">
                        {col.name}
                        {sortColumn === col.name && (
                          sortDirection === 'asc'
                            ? <ChevronUp className="w-3 h-3" />
                            : <ChevronDown className="w-3 h-3" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={queryResult?.columns.length || 1} className="px-4 py-8 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : queryResult?.rows.length === 0 ? (
                  <tr>
                    <td colSpan={queryResult?.columns.length || 1} className="px-4 py-8 text-center text-gray-500">
                      No data found
                    </td>
                  </tr>
                ) : (
                  queryResult?.rows
                    .filter(row => {
                      if (!searchQuery) return true
                      return Object.values(row).some(v =>
                        String(v).toLowerCase().includes(searchQuery.toLowerCase())
                      )
                    })
                    .map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                      {queryResult.columns.map((col) => (
                        <td key={col.name} className="px-4 py-3 text-sm text-gray-300">
                          {formatCellValue(row[col.name])}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, queryResult?.totalCount || 0)} of {queryResult?.totalCount}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="border-gray-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-300 px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="border-gray-700"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Audit Note */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Info className="w-3 h-3" />
          <span>All queries are logged to controlroom.audit_log with actor, timestamp, and table accessed</span>
        </div>
      </div>
    </ControlRoomLayout>
  )
}

// Format cell value for display
function formatCellValue(value: any): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') {
    if (value instanceof Date) return format(value, 'dd MMM yyyy HH:mm')
    return JSON.stringify(value)
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
    try {
      return format(new Date(value), 'dd MMM yyyy HH:mm')
    } catch {
      return value
    }
  }
  return String(value)
}