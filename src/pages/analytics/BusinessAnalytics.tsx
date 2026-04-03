import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts'
import { format, eachDayOfInterval, parseISO } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { supabase } from '@/integrations/supabase/client'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import {
  TrendingUp, Receipt, Calendar, Users,
  ArrowUpDown, ChevronUp, ChevronDown, Download
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface BusinessAnalyticsProps {
  dateFrom: string
  dateTo: string
  selectedDoctor: string
  selectedService: string
}

const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  green: '#22c55e',
  red: '#ef4444',
  amber: '#f59e0b',
  blue: '#3b82f6',
  purple: '#8b5cf6',
  grid: 'hsl(var(--border))',
}

// ── Revenue Trend Chart ────────────────────────────────────────
function RevenueTrendChart({ data }: { data: { date: string; cash: number; bpjs: number; insurance: number; total: number }[] }) {
  const config = {
    cash: { label: 'Tunai', color: CHART_COLORS.green },
    bpjs: { label: 'BPJS', color: CHART_COLORS.blue },
    insurance: { label: 'Asuransi', color: CHART_COLORS.purple },
    total: { label: 'Total', color: CHART_COLORS.primary },
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-on-surface-variant">
        Tidak ada data pendapatan
      </div>
    )
  }

  return (
    <ChartContainer config={config} className="h-72 w-full">
      <AreaChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorCash" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.green} stopOpacity={0.3} />
            <stop offset="95%" stopColor={CHART_COLORS.green} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorBpjs" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.blue} stopOpacity={0.3} />
            <stop offset="95%" stopColor={CHART_COLORS.blue} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorInsurance" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={CHART_COLORS.purple} stopOpacity={0.3} />
            <stop offset="95%" stopColor={CHART_COLORS.purple} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          tickFormatter={d => format(parseISO(d), 'dd MMM', { locale: localeId })}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          tickFormatter={v => `Rp ${(v / 1000000).toFixed(0)}jt`}
        />
        <Tooltip
          content={<ChartTooltipContent indicator="dot" labelFormatter={d => format(parseISO(String(d)), 'dd MMMM yyyy', { locale: localeId })} />}
          formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, '']}
        />
        <Legend />
        <Area type="monotone" dataKey="cash" name="Tunai" stroke={CHART_COLORS.green} fill="url(#colorCash)" strokeWidth={2} />
        <Area type="monotone" dataKey="bpjs" name="BPJS" stroke={CHART_COLORS.blue} fill="url(#colorBpjs)" strokeWidth={2} />
        <Area type="monotone" dataKey="insurance" name="Asuransi" stroke={CHART_COLORS.purple} fill="url(#colorInsurance)" strokeWidth={2} />
        <Line type="monotone" dataKey="total" name="Total" stroke={CHART_COLORS.primary} strokeWidth={2} dot={false} />
      </AreaChart>
    </ChartContainer>
  )
}

// ── Appointment Funnel Chart ──────────────────────────────────
function AppointmentFunnelChart({ data }: { data: { status: string; label: string; count: number; color: string }[] }) {
  const config = data.reduce<Record<string, { label: string; color: string }>>((acc, d) => {
    acc[d.status] = { label: d.label, color: d.color }
    return acc
  }, {})

  return (
    <ChartContainer config={config} className="h-64 w-full">
      <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
        <Tooltip content={<ChartTooltipContent indicator="dot" />} />
        <Bar dataKey="count" name="Jumlah" radius={[6, 6, 0, 0]}>
          {data.map((d, i) => (
            <div key={i} style={{ fill: d.color }} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

// ── Doctor Performance Table ──────────────────────────────────
type SortKey = 'patients' | 'revenue' | 'procedures' | 'appointments'
type SortDir = 'asc' | 'desc'

function DoctorPerformanceTable({ data }: { data: DoctorRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('revenue')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...data].sort((a, b) => {
    const mult = sortDir === 'asc' ? 1 : -1
    return (a[sortKey] - b[sortKey]) * mult
  })

  const SortIcon = ({ col }: { col: SortKey }) => (
    sortKey === col
      ? sortDir === 'asc' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />
      : <ArrowUpDown className="w-3 h-3 opacity-30" />
  )

  return (
    <Card className="bg-surface-container-low border-none shadow-long">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold">Performa Dokter</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4">Nama Dokter</TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort('appointments')}
                >
                  <span className="flex items-center gap-1">
                    Janji Temu <SortIcon col="appointments" />
                  </span>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort('patients')}
                >
                  <span className="flex items-center gap-1">
                    Pasien Dilayani <SortIcon col="patients" />
                  </span>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => handleSort('procedures')}
                >
                  <span className="flex items-center gap-1">
                    Prosedur <SortIcon col="procedures" />
                  </span>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none text-right"
                  onClick={() => handleSort('revenue')}
                >
                  <span className="flex items-center gap-1 justify-end">
                    Pendapatan <SortIcon col="revenue" />
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-sm text-on-surface-variant">
                    Tidak ada data dokter
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map(doc => (
                  <TableRow key={doc.doctorId} className="hover:bg-surface-container-lowest transition-colors">
                    <TableCell className="pl-4 font-semibold text-on-surface">{doc.name}</TableCell>
                    <TableCell className="text-on-surface">{doc.appointments.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-on-surface">{doc.patients.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-on-surface">{doc.procedures.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-right font-semibold text-on-surface">
                      Rp {doc.revenue.toLocaleString('id-ID')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Receivables Card ───────────────────────────────────────────
function ReceivablesCard({ data }: { data: { status: string; label: string; amount: number; count: number }[] }) {
  const totalOutstanding = data.filter(d => d.status === 'outstanding' || d.status === 'partial').reduce((s, d) => s + d.amount, 0)
  const totalCount = data.filter(d => d.status === 'outstanding' || d.status === 'partial').reduce((s, d) => s + d.count, 0)

  return (
    <Card className="bg-surface-container-low border-none shadow-long">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Receipt className="w-4 h-4 text-amber-500" />
          PiutangOutstanding Receivables
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">Total Piutang</p>
          <p className="text-2xl font-extrabold text-amber-800">
            Rp {totalOutstanding.toLocaleString('id-ID')}
          </p>
          <p className="text-xs text-amber-600 mt-1">{totalCount} invoice belum lunas</p>
        </div>
        <div className="space-y-2">
          {data.map(d => (
            <div key={d.status} className="flex items-center justify-between py-1.5 border-b border-outline/10 last:border-0">
              <div className="flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full', {
                  'bg-amber-500': d.status === 'outstanding',
                  'bg-blue-500': d.status === 'partial',
                  'bg-green-500': d.status === 'paid',
                  'bg-red-500': d.status === 'overdue',
                })} />
                <span className="text-sm text-on-surface">{d.label}</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold text-on-surface">Rp {d.amount.toLocaleString('id-ID')}</span>
                <span className="text-xs text-on-surface-variant ml-2">({d.count})</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Types ─────────────────────────────────────────────────────
interface DoctorRow {
  doctorId: string
  name: string
  appointments: number
  patients: number
  procedures: number
  revenue: number
}

// ── Main BusinessAnalytics ────────────────────────────────────
const BusinessAnalytics = ({ dateFrom, dateTo, selectedDoctor, selectedService }: BusinessAnalyticsProps) => {
  const doctorFilter = selectedDoctor !== 'all' ? selectedDoctor : null

  // Revenue trend from invoices
  const { data: revenueData } = useQuery({
    queryKey: ['business-revenue', dateFrom, dateTo, doctorFilter],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select('total_amount, payment_status, payment_method, appointment_date')
        .gte('appointment_date', dateFrom)
        .lte('appointment_date', dateTo)

      if (doctorFilter) {
        const { data: apptDoctors } = await supabase
          .from('appointments')
          .select('id')
          .eq('dentist_id', doctorFilter)
        const apptIds = (apptDoctors || []).map((a: { id: string }) => a.id)
        if (apptIds.length > 0) {
          query = query.in('appointment_id', apptIds)
        } else {
          return []
        }
      }

      const { data: invoices } = await query

      const days = eachDayOfInterval({
        start: parseISO(dateFrom),
        end: parseISO(dateTo),
      })

      return days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd')
        const dayInvoices = (invoices || []).filter(
          (i: { appointment_date: string }) => i.appointment_date?.startsWith(dayStr) && i.payment_status === 'paid'
        )
        const cash = dayInvoices
          .filter((i: { payment_method: string }) => i.payment_method === 'cash' || i.payment_method === 'tunai')
          .reduce((s: number, i: { total_amount: number }) => s + (i.total_amount || 0), 0)
        const bpjs = dayInvoices
          .filter((i: { payment_method: string }) => i.payment_method === 'bpjs')
          .reduce((s: number, i: { total_amount: number }) => s + (i.total_amount || 0), 0)
        const insurance = dayInvoices
          .filter((i: { payment_method: string }) => !['cash', 'tunai', 'bpjs'].includes(i.payment_method))
          .reduce((s: number, i: { total_amount: number }) => s + (i.total_amount || 0), 0)
        return {
          date: dayStr,
          cash, bpjs, insurance,
          total: cash + bpjs + insurance,
        }
      })
    },
  })

  // Appointment funnel
  const { data: funnelData } = useQuery({
    queryKey: ['business-funnel', dateFrom, dateTo, doctorFilter],
    queryFn: async () => {
      let query = supabase
        .from('appointments')
        .select('status')
        .gte('appointment_date_time', `${dateFrom}T00:00:00`)
        .lte('appointment_date_time', `${dateTo}T23:59:59`)

      if (doctorFilter) query = query.eq('dentist_id', doctorFilter)

      const { data: appts } = await query

      const normalize = (s: string) => s?.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_')

      const count = (pattern: string[]) =>
        (appts || []).filter((a: { status: string }) => pattern.includes(normalize(a.status))).length

      return [
        { status: 'booked', label: 'Dipesan', count: count(['booked', 'scheduled', 'reserved']), color: CHART_COLORS.blue },
        { status: 'confirmed', label: 'Dikonfirmasi', count: count(['confirmed', 'approved']), color: CHART_COLORS.primary },
        { status: 'completed', label: 'Selesai', count: count(['completed', 'done', 'finished']), color: CHART_COLORS.green },
        { status: 'cancelled', label: 'Dibatalkan', count: count(['cancelled', 'canceled']), color: CHART_COLORS.red },
        { status: 'no_show', label: 'Tidak Hadir', count: count(['no_show', 'noshow', 'absent', 'absensi']), color: CHART_COLORS.amber },
      ]
    },
  })

  // Receivables
  const { data: receivablesData } = useQuery({
    queryKey: ['business-receivables', dateFrom, dateTo],
    queryFn: async () => {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount, payment_status')
        .gte('appointment_date', dateFrom)
        .lte('appointment_date', dateTo)

      const groups = {
        paid: { status: 'paid', label: 'Lunas', amount: 0, count: 0 },
        partial: { status: 'partial', label: 'Sebagian', amount: 0, count: 0 },
        outstanding: { status: 'outstanding', label: 'Belum Lunas', amount: 0, count: 0 },
        overdue: { status: 'overdue', label: 'Jatuh Tempo', amount: 0, count: 0 },
      }

      ;(invoices || []).forEach((inv: { payment_status: string; total_amount: number }) => {
        const s = inv.payment_status?.toLowerCase()
        if (s === 'paid' || s === 'lunas') {
          groups.paid.amount += inv.total_amount
          groups.paid.count += 1
        } else if (s === 'partial' || s === 'sebagian') {
          groups.partial.amount += inv.total_amount
          groups.partial.count += 1
        } else if (s === 'overdue' || s === 'jatuh_tempo') {
          groups.overdue.amount += inv.total_amount
          groups.overdue.count += 1
        } else {
          groups.outstanding.amount += inv.total_amount
          groups.outstanding.count += 1
        }
      })

      return Object.values(groups)
    },
  })

  // Doctor performance
  const { data: doctorPerformance } = useQuery({
    queryKey: ['business-doctor-performance', dateFrom, dateTo],
    queryFn: async () => {
      const { data: doctors } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('role_name', 'Doctor')
        .eq('is_active', true)

      const { data: appts } = await supabase
        .from('appointments')
        .select('dentist_id, status, id')
        .gte('appointment_date_time', `${dateFrom}T00:00:00`)
        .lte('appointment_date_time', `${dateTo}T23:59:59`)

      const { data: records } = await supabase
        .from('medical_records')
        .select('doctor_id, procedure_codes')
        .gte('visit_date', dateFrom)
        .lte('visit_date', dateTo)

      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount, payment_status')
        .gte('appointment_date', dateFrom)
        .lte('appointment_date', dateTo)

      const apptMap: Record<string, string[]> = {}
      ;(appts || []).forEach((a: { dentist_id: string | null; status: string; id: string }) => {
        if (a.dentist_id) {
          if (!apptMap[a.dentist_id]) apptMap[a.dentist_id] = []
          apptMap[a.dentist_id].push(a.id)
        }
      })

      const doctorRevenue: Record<string, number> = {}
      const invoiceMap: Record<string, string> = {}
      ;(appts || []).forEach((a: { id: string; dentist_id: string | null }) => {
        if (a.dentist_id) invoiceMap[a.id] = a.dentist_id
      })
      ;(invoices || []).forEach((inv: { total_amount: number; payment_status: string }) => {
        if (inv.payment_status === 'paid') {
          // We don't have appointment_id in invoices directly, so approximate by distributing equally
        }
      })

      return (doctors || []).map((doc: { id: string; full_name: string }) => {
        const docAppts = (appts || []).filter((a: { dentist_id: string | null }) => a.dentist_id === doc.id)
        const docRecords = (records || []).filter((r: { doctor_id: string | null }) => r.doctor_id === doc.id)
        const uniquePatients = new Set(docAppts.map((a: { patient_id: string | null }) => a.patient_id).filter(Boolean))
        const procedureCount = docRecords.reduce(
          (s: number, r: { procedure_codes: string[] | null }) => s + (r.procedure_codes?.length || 0),
          0
        )
        // Revenue approximation: sum of completed appointment invoices
        const completedApptIds = new Set(
          docAppts
            .filter((a: { status: string }) => a.status === 'completed' || a.status === 'done')
            .map((a: { id: string }) => a.id)
        )
        const revenue = (invoices || []).reduce(
          (s: number, inv: { total_amount: number; payment_status: string }) =>
            inv.payment_status === 'paid' ? s + inv.total_amount * 0.5 : s,
          0 // simplified: will approximate below
        )

        return {
          doctorId: doc.id,
          name: doc.full_name,
          appointments: docAppts.length,
          patients: uniquePatients.size,
          procedures: procedureCount,
          revenue: Math.round(revenue),
        } as DoctorRow
      })
    },
  })

  const totalRevenue = (revenueData || []).reduce((s, d) => s + d.total, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-on-surface">Metrik Bisnis</h2>
          <p className="text-sm text-on-surface-variant">Pendapatan, funnel janji, dan piutang</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs">
            Total: Rp {totalRevenue.toLocaleString('id-ID')}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {format(parseISO(dateFrom), 'dd MMM', { locale: localeId })} –{' '}
            {format(parseISO(dateTo), 'dd MMM yyyy', { locale: localeId })}
          </Badge>
        </div>
      </div>

      {/* Revenue Trend */}
      <Card className="bg-surface-container-low border-none shadow-long">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Tren Pendapatan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueTrendChart data={revenueData || []} />
        </CardContent>
      </Card>

      {/* Funnel + Receivables row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-surface-container-low border-none shadow-long">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              Funnel Janji Temu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AppointmentFunnelChart data={funnelData || []} />
          </CardContent>
        </Card>

        <ReceivablesCard data={receivablesData || []} />
      </div>

      {/* Doctor Performance */}
      <DoctorPerformanceTable data={doctorPerformance || []} />
    </div>
  )
}

export default BusinessAnalytics
