import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Cell, Legend, ResponsiveContainer, Tooltip
} from 'recharts'
import { format, eachDayOfInterval, parseISO } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/integrations/supabase/client'
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart'
import { Activity, Stethoscope, Users, TrendingUp, Download } from 'lucide-react'

interface ClinicalAnalyticsProps {
  dateFrom: string
  dateTo: string
  selectedDoctor: string
  selectedService: string
}

const CHART_COLORS = {
  primary: 'hsl(var(--primary))',
  secondary: 'hsl(var(--secondary))',
  accent: 'hsl(var(--accent))',
  muted: 'hsl(var(--muted-foreground))',
  grid: 'hsl(var(--border))',
}

// ── Diagnosis Distribution (horizontal bar) ───────────────────
function DiagnosisChart({ data }: { data: { code: string; label: string; count: number }[] }) {
  const chartData = data.slice(0, 10)
  const config = {
    count: { label: 'Jumlah', color: CHART_COLORS.primary },
  }

  return (
    <Card className="bg-surface-container-low border-none shadow-long">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-primary" />
          Distribusi Diagnosis (ICD-10)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-sm text-on-surface-variant">
            Tidak ada data diagnosis
          </div>
        ) : (
          <ChartContainer config={config} className="h-64 w-full">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis
                type="category"
                dataKey="code"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                width={80}
              />
              <Tooltip
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Bar dataKey="count" name="Jumlah" fill={CHART_COLORS.primary} radius={4}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={`hsl(var(--primary) / ${1 - i * 0.08})`} />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ── Procedure Frequency (bar chart) ──────────────────────────
function ProcedureChart({ data }: { data: { code: string; name: string; count: number }[] }) {
  const chartData = data.slice(0, 10)
  const config = {
    count: { label: 'Jumlah', color: CHART_COLORS.secondary },
  }

  return (
    <Card className="bg-surface-container-low border-none shadow-long">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Activity className="w-4 h-4 text-secondary" />
          Frekuensi Prosedur
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-sm text-on-surface-variant">
            Tidak ada data prosedur
          </div>
        ) : (
          <ChartContainer config={config} className="h-64 w-full">
            <BarChart data={chartData} margin={{ top: 0, right: 16, left: 0, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis
                dataKey="code"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                angle={-30}
                textAnchor="end"
                interval={0}
              />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip content={<ChartTooltipContent indicator="dot" />} />
              <Bar dataKey="count" name="Jumlah" fill={CHART_COLORS.secondary} radius={4} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ── Patient Retention (line chart) ────────────────────────────
function RetentionChart({
  data,
  dateFrom,
  dateTo,
}: {
  data: { date: string; newPatients: number; returningPatients: number }[]
  dateFrom: string
  dateTo: string
}) {
  const config = {
    newPatients: { label: 'Pasien Baru', color: CHART_COLORS.primary },
    returningPatients: { label: 'Pasien Kembali', color: CHART_COLORS.accent },
  }

  return (
    <Card className="bg-surface-container-low border-none shadow-long">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Retensi Pasien
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-sm text-on-surface-variant">
            Tidak ada data pasien
          </div>
        ) : (
          <ChartContainer config={config} className="h-64 w-full">
            <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={d => format(parseISO(d), 'dd MMM', { locale: localeId })}
              />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip
                content={<ChartTooltipContent indicator="dot" labelFormatter={d => format(parseISO(String(d)), 'dd MMMM yyyy', { locale: localeId })} />}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="newPatients"
                name="Pasien Baru"
                stroke={CHART_COLORS.primary}
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="returningPatients"
                name="Pasien Kembali"
                stroke={CHART_COLORS.accent}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ── Treatment Outcomes (stacked bar by status) ───────────────
function TreatmentOutcomesChart({ data }: { data: { date: string; completed: number; cancelled: number; noShow: number }[] }) {
  const config = {
    completed: { label: 'Selesai', color: '#22c55e' },
    cancelled: { label: 'Dibatalkan', color: '#ef4444' },
    noShow: { label: 'Tidak Hadir', color: '#f59e0b' },
  }

  return (
    <Card className="bg-surface-container-low border-none shadow-long">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-600" />
          Outcome Perawatan
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-sm text-on-surface-variant">
            Tidak ada data appointment
          </div>
        ) : (
          <ChartContainer config={config} className="h-64 w-full">
            <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={d => format(parseISO(d), 'dd MMM', { locale: localeId })}
              />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip content={<ChartTooltipContent indicator="dot" labelFormatter={d => format(parseISO(String(d)), 'dd MMMM yyyy', { locale: localeId })} />} />
              <Legend />
              <Bar dataKey="completed" stackId="a" name="Selesai" fill="#22c55e" radius={[0, 0, 0, 0]} />
              <Bar dataKey="cancelled" stackId="a" name="Dibatalkan" fill="#ef4444" radius={[0, 0, 0, 0]} />
              <Bar dataKey="noShow" stackId="a" name="Tidak Hadir" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ── Main ClinicalAnalytics ────────────────────────────────────
const ClinicalAnalytics = ({ dateFrom, dateTo, selectedDoctor, selectedService }: ClinicalAnalyticsProps) => {
  const doctorFilter = selectedDoctor !== 'all' ? selectedDoctor : null
  const serviceFilter = selectedService !== 'all' ? selectedService : null

  // Diagnosis codes from medical_records
  const { data: diagnosisData } = useQuery({
    queryKey: ['clinical-diagnosis', dateFrom, dateTo, doctorFilter],
    queryFn: async () => {
      let query = supabase
        .from('medical_records')
        .select('diagnosis_codes, visit_date, patient_id')
        .gte('visit_date', dateFrom)
        .lte('visit_date', dateTo)

      if (doctorFilter) query = query.eq('doctor_id', doctorFilter)

      const { data: records } = await query

      const codeCount: Record<string, number> = {}
      ;(records || []).forEach((r: { diagnosis_codes: string[] | null }) => {
        ;(r.diagnosis_codes || []).forEach((code: string) => {
          codeCount[code] = (codeCount[code] || 0) + 1
        })
      })

      return Object.entries(codeCount)
        .map(([code, count]) => ({ code, label: code, count }))
        .sort((a, b) => b.count - a.count)
    },
  })

  // Procedure frequency
  const { data: procedureData } = useQuery({
    queryKey: ['clinical-procedures', dateFrom, dateTo, doctorFilter],
    queryFn: async () => {
      let query = supabase
        .from('medical_records')
        .select('procedure_codes')
        .gte('visit_date', dateFrom)
        .lte('visit_date', dateTo)

      if (doctorFilter) query = query.eq('doctor_id', doctorFilter)

      const { data: records } = await query

      const procCount: Record<string, number> = {}
      ;(records || []).forEach((r: { procedure_codes: string[] | null }) => {
        ;(r.procedure_codes || []).forEach((proc: string) => {
          procCount[proc] = (procCount[proc] || 0) + 1
        })
      })

      return Object.entries(procCount)
        .map(([code, count]) => ({ code, name: code, count }))
        .sort((a, b) => b.count - a.count)
    },
  })

  // Patient retention: daily new vs returning
  const { data: retentionData } = useQuery({
    queryKey: ['clinical-retention', dateFrom, dateTo],
    queryFn: async () => {
      const { data: patients } = await supabase
        .from('patients')
        .select('id, created_at')
        .gte('created_at', `${dateFrom}T00:00:00`)
        .lte('created_at', `${dateTo}T23:59:59`)

      const days = eachDayOfInterval({
        start: parseISO(dateFrom),
        end: parseISO(dateTo),
      })

      const dateStr = (d: Date) => format(d, 'yyyy-MM-dd')

      // For each day, count new patients (created that day)
      // and returning patients (appointments that are follow-ups — approximated by visits after first visit)
      const result = days.map(day => {
        const dayStr = dateStr(day)
        const dayPatients = (patients || []).filter(
          (p: { created_at: string }) => p.created_at?.startsWith(dayStr)
        )
        // Returning patients: medical records on this day for patients created before this day
        const { data: returning } = supabase
          .from('medical_records')
          .select('id, patient_id')
          .gte('visit_date', dayStr)
          .lte('visit_date', dayStr)

        const returningCount = (returning || []).length - dayPatients.length

        return {
          date: dayStr,
          newPatients: dayPatients.length,
          returningPatients: Math.max(0, returningCount),
        }
      })

      return result
    },
  })

  // Treatment outcomes by day
  const { data: outcomesData } = useQuery({
    queryKey: ['clinical-outcomes', dateFrom, dateTo, doctorFilter],
    queryFn: async () => {
      let query = supabase
        .from('appointments')
        .select('status, appointment_date_time')
        .gte('appointment_date_time', `${dateFrom}T00:00:00`)
        .lte('appointment_date_time', `${dateTo}T23:59:59`)

      if (doctorFilter) query = query.eq('dentist_id', doctorFilter)

      const { data: appts } = await query

      const days = eachDayOfInterval({
        start: parseISO(dateFrom),
        end: parseISO(dateTo),
      })

      const dateStr = (d: Date) => format(d, 'yyyy-MM-dd')

      return days.map(day => {
        const dayStr = dateStr(day)
        const dayAppts = (appts || []).filter(
          (a: { appointment_date_time: string }) => a.appointment_date_time?.startsWith(dayStr)
        )
        return {
          date: dayStr,
          completed: dayAppts.filter((a: { status: string }) => a.status === 'completed' || a.status === 'done').length,
          cancelled: dayAppts.filter((a: { status: string }) => a.status === 'cancelled').length,
          noShow: dayAppts.filter((a: { status: string }) => a.status === 'no_show' || a.status === 'noshow' || a.status === 'absent').length,
        }
      })
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-on-surface">Metrik Klinis</h2>
          <p className="text-sm text-on-surface-variant">Diagnosis, prosedur, dan retensi pasien</p>
        </div>
        <Badge variant="outline" className="text-xs">
          {format(parseISO(dateFrom), 'dd MMM', { locale: localeId })} –{' '}
          {format(parseISO(dateTo), 'dd MMM yyyy', { locale: localeId })}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DiagnosisChart data={diagnosisData || []} />
        <ProcedureChart data={procedureData || []} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RetentionChart data={retentionData || []} dateFrom={dateFrom} dateTo={dateTo} />
        <TreatmentOutcomesChart data={outcomesData || []} />
      </div>

      {/* Summary Table: Top 10 Diagnoses */}
      <Card className="bg-surface-container-low border-none shadow-long">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-bold">Top 10 Diagnosis (ICD-10)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline/20">
                  <th className="text-left py-2 px-3 font-bold text-on-surface-variant">#</th>
                  <th className="text-left py-2 px-3 font-bold text-on-surface-variant">Kode ICD-10</th>
                  <th className="text-left py-2 px-3 font-bold text-on-surface-variant">Jumlah</th>
                  <th className="text-right py-2 px-3 font-bold text-on-surface-variant">%</th>
                </tr>
              </thead>
              <tbody>
                {(diagnosisData || []).slice(0, 10).map((d, i) => {
                  const total = (diagnosisData || []).reduce((s, x) => s + x.count, 0)
                  return (
                    <tr key={d.code} className="border-b border-outline/10 hover:bg-surface-container-lowest transition-colors">
                      <td className="py-2 px-3 text-on-surface-variant">{i + 1}</td>
                      <td className="py-2 px-3 font-mono font-semibold text-on-surface">{d.code}</td>
                      <td className="py-2 px-3 text-on-surface">{d.count}</td>
                      <td className="py-2 px-3 text-right text-on-surface-variant">
                        {total > 0 ? ((d.count / total) * 100).toFixed(1) : 0}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ClinicalAnalytics
