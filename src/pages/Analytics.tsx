import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, startOfQuarter, endOfQuarter,
  format, subDays
} from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { CalendarDays, TrendingUp, Users, Receipt, Download, BarChart3, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { supabase } from '@/integrations/supabase/client'
import { useQuery } from '@tanstack/react-query'
import ClinicalAnalytics from './analytics/ClinicalAnalytics'
import BusinessAnalytics from './analytics/BusinessAnalytics'
import ExportReports from './analytics/ExportReports'

export type DateRangePreset = 'today' | 'this_week' | 'this_month' | 'this_quarter' | 'custom'

export interface DateRange {
  from: Date
  to: Date
}

function getPresetRange(preset: DateRangePreset): DateRange {
  const now = new Date()
  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) }
    case 'this_week':
      return { from: startOfWeek(now, { locale: localeId }), to: endOfWeek(now, { locale: localeId }) }
    case 'this_month':
      return { from: startOfMonth(now), to: endOfMonth(now) }
    case 'this_quarter':
      return { from: startOfQuarter(now), to: endOfQuarter(now) }
    default:
      return { from: startOfDay(now), to: endOfDay(now) }
  }
}

const ANALYTICS_TABS = [
  { value: 'overview', label: 'Ringkasan' },
  { value: 'clinical', label: 'Klinis' },
  { value: 'business', label: 'Bisnis' },
  { value: 'export', label: 'Ekspor' },
] as const

type TabValue = typeof ANALYTICS_TABS[number]['value']

const DATE_PRESET_LABELS: Record<DateRangePreset, string> = {
  today: 'Hari Ini',
  this_week: 'Minggu Ini',
  this_month: 'Bulan Ini',
  this_quarter: 'Kuarter Ini',
  custom: 'Kustom',
}

// ── KPI Card ──────────────────────────────────────────────────
function KpiCard({
  title, value, subtitle, icon: Icon, trend,
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  trend?: { label: string; positive: boolean }
}) {
  return (
    <Card className="bg-surface-container-low border-none shadow-long">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{title}</span>
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-primary" aria-hidden="true" />
          </div>
        </div>
        <div className="text-2xl font-extrabold text-on-surface tracking-tight mb-1">{value}</div>
        {subtitle && (
          <p className="text-xs text-on-surface-variant">{subtitle}</p>
        )}
        {trend && (
          <div className={cn('text-xs font-semibold mt-2', trend.positive ? 'text-green-600' : 'text-red-500')}>
            {trend.positive ? '↑' : '↓'} {trend.label}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Filter Chip ───────────────────────────────────────────────
function FilterChip({
  label, selected, onClick,
}: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border',
        selected
          ? 'bg-primary text-on-primary border-primary shadow-sm'
          : 'bg-surface-container-low text-on-surface-variant border-outline/30 hover:border-primary/40'
      )}
    >
      {label}
    </button>
  )
}

// ── Main Analytics Hub ─────────────────────────────────────────
const Analytics = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('atab') as TabValue | null
  const activeTab = tabParam || 'overview'

  const [datePreset, setDatePreset] = useState<DateRangePreset>('this_month')
  const [customRange, setCustomRange] = useState<DateRange | undefined>()
  const [selectedDoctor, setSelectedDoctor] = useState<string>('all')
  const [selectedService, setSelectedService] = useState<string>('all')

  const dateRange = useMemo(() => {
    if (datePreset === 'custom' && customRange) return customRange
    return getPresetRange(datePreset)
  }, [datePreset, customRange])

  const dateFromStr = useMemo(() => format(dateRange.from, 'yyyy-MM-dd'), [dateRange])
  const dateToStr = useMemo(() => format(dateRange.to, 'yyyy-MM-dd'), [dateRange])

  const handleTabChange = (tab: TabValue) => {
    setSearchParams(prev => {
      prev.set('atab', tab)
      return prev
    })
  }

  // ── KPI data ────────────────────────────────────────────────
  const { data: kpiData, isLoading: kpiLoading } = useQuery({
    queryKey: ['analytics-kpis', dateFromStr, dateToStr, selectedDoctor],
    queryFn: async () => {
      const doctorFilter = selectedDoctor !== 'all'
        ? `AND dentist_id = '${selectedDoctor}'` : ''

      // Appointments in range
      const { data: appts } = await supabase
        .from('appointments')
        .select('status, service_name')
        .gte('appointment_date_time', `${dateFromStr}T00:00:00`)
        .lte('appointment_date_time', `${dateToStr}T23:59:59`)
        .single()

      // Use invoices for revenue (grouped by date)
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total_amount, payment_status, payment_method, appointment_date')
        .gte('appointment_date', dateFromStr)
        .lte('appointment_date', dateToStr)

      // Patients created in range
      const { count: newPatients } = await supabase
        .from('patients')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', `${dateFromStr}T00:00:00`)
        .lte('created_at', `${dateToStr}T23:59:59`)

      const completedAppts = (appts && Array.isArray([appts]) ? [appts] : [])
        .filter(a => a?.status === 'completed' || a?.status === 'done').length || 0

      const totalRevenue = (invoices || [])
        .filter((i: { payment_status: string }) => i?.payment_status === 'paid')
        .reduce((sum: number, i: { total_amount: number }) => sum + (i?.total_amount || 0), 0)

      return {
        totalAppointments: Array.isArray(appts) ? appts.length : 0,
        completedAppointments: Array.isArray(appts)
          ? appts.filter((a: { status: string }) => a?.status === 'completed' || a?.status === 'done').length
          : 0,
        newPatients: newPatients || 0,
        totalRevenue,
      }
    },
  })

  // Doctors list for filter
  const { data: doctors } = useQuery({
    queryKey: ['analytics-doctors'],
    queryFn: async () => {
      const { data } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('role_name', 'Doctor')
        .eq('is_active', true)
      return data || []
    },
  })

  // Services list for filter
  const { data: services } = useQuery({
    queryKey: ['analytics-services'],
    queryFn: async () => {
      const { data } = await supabase
        .from('services')
        .select('id, name')
        .eq('is_active', true)
      return data || []
    },
  })

  const handleDoctorFilter = (id: string) => setSelectedDoctor(id)
  const handleServiceFilter = (id: string) => setSelectedService(id)

  const kpis = kpiLoading ? { totalAppointments: 0, completedAppointments: 0, newPatients: 0, totalRevenue: 0 } : (kpiData || { totalAppointments: 0, completedAppointments: 0, newPatients: 0, totalRevenue: 0 })

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-primary tracking-tight font-headline">
            Analitik &amp; Laporan
          </h1>
          <p className="text-on-surface-variant text-sm mt-0.5">
            Insights bisnis dan klinis klinik Gigi
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          {(Object.keys(DATE_PRESET_LABELS) as DateRangePreset[]).map(preset => (
            <FilterChip
              key={preset}
              label={DATE_PRESET_LABELS[preset]}
              selected={datePreset === preset}
              onClick={() => setDatePreset(preset)}
            />
          ))}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 text-xs h-8">
                <CalendarDays className="w-3.5 h-3.5" />
                {datePreset === 'custom' && customRange
                  ? `${format(customRange.from, 'dd MMM', { locale: localeId })} – ${format(customRange.to, 'dd MMM yyyy', { locale: localeId })}`
                  : DATE_PRESET_LABELS[datePreset]}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={customRange ? { from: customRange.from, to: customRange.to } : undefined}
                onSelect={range => {
                  if (range?.from && range?.to) {
                    setCustomRange({ from: range.from, to: range.to })
                    setDatePreset('custom')
                  }
                }}
                numberOfMonths={2}
                locale={localeId}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* ── Filter Chips ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Filter:</span>
        <Select value={selectedDoctor} onValueChange={handleDoctorFilter}>
          <SelectTrigger className="h-8 text-xs w-44">
            <SelectValue placeholder="Semua Dokter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Dokter</SelectItem>
            {(doctors || []).map(d => (
              <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedService} onValueChange={handleServiceFilter}>
          <SelectTrigger className="h-8 text-xs w-44">
            <SelectValue placeholder="Semua Layanan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Layanan</SelectItem>
            {(services || []).map(s => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(selectedDoctor !== 'all' || selectedService !== 'all') && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => { setSelectedDoctor('all'); setSelectedService('all') }}
          >
            Reset Filter
          </Button>
        )}
        <Badge variant="outline" className="text-xs">
          {format(dateRange.from, 'dd MMM yyyy', { locale: localeId })} –{' '}
          {format(dateRange.to, 'dd MMM yyyy', { locale: localeId })}
        </Badge>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex items-center gap-1 border-b border-outline/20">
        {ANALYTICS_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => handleTabChange(tab.value)}
            className={cn(
              'px-4 py-2.5 text-sm font-semibold transition-all relative',
              activeTab === tab.value
                ? 'text-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            )}
          >
            {tab.label}
            {activeTab === tab.value && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                title="Total Janji"
                value={kpis.totalAppointments.toLocaleString('id-ID')}
                subtitle="dalam periode ini"
                icon={CalendarDays}
              />
              <KpiCard
                title="Janji Selesai"
                value={kpis.completedAppointments.toLocaleString('id-ID')}
                subtitle={`${kpis.totalAppointments > 0
                  ? Math.round((kpis.completedAppointments / kpis.totalAppointments) * 100)
                  : 0}% dari total`}
                icon={Activity}
              />
              <KpiCard
                title="Pasien Baru"
                value={kpis.newPatients.toLocaleString('id-ID')}
                subtitle="terdaftar dalam periode ini"
                icon={Users}
              />
              <KpiCard
                title="Total Pendapatan"
                value={`Rp ${kpis.totalRevenue.toLocaleString('id-ID')}`}
                subtitle="dari invoice lunas"
                icon={Receipt}
                trend={kpis.totalRevenue > 0 ? { label: 'vs periode sebelumnya', positive: true } : undefined}
              />
            </div>

            {/* Quick nav to Clinical / Business */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card
                className="bg-gradient-to-br from-blue-50 to-indigo-50 border-none shadow-long cursor-pointer hover:shadow-xl transition-all"
                onClick={() => handleTabChange('clinical')}
              >
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-on-surface">Analitik Klinis</h3>
                    <p className="text-sm text-on-surface-variant mt-0.5">
                      Diagnosis, prosedur, dan retensi pasien
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card
                className="bg-gradient-to-br from-green-50 to-emerald-50 border-none shadow-long cursor-pointer hover:shadow-xl transition-all"
                onClick={() => handleTabChange('business')}
              >
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-on-surface">Analitik Bisnis</h3>
                    <p className="text-sm text-on-surface-variant mt-0.5">
                      Pendapatan, funnel janji, dan piutang
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'clinical' && (
          <ClinicalAnalytics
            dateFrom={dateFromStr}
            dateTo={dateToStr}
            selectedDoctor={selectedDoctor}
            selectedService={selectedService}
          />
        )}

        {activeTab === 'business' && (
          <BusinessAnalytics
            dateFrom={dateFromStr}
            dateTo={dateToStr}
            selectedDoctor={selectedDoctor}
            selectedService={selectedService}
          />
        )}

        {activeTab === 'export' && (
          <ExportReports
            dateFrom={dateFromStr}
            dateTo={dateToStr}
            selectedDoctor={selectedDoctor}
            selectedService={selectedService}
          />
        )}
      </div>
    </div>
  )
}

export default Analytics
