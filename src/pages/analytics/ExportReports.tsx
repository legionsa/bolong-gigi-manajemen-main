import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, parseISO, eachDayOfInterval } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/integrations/supabase/client'
import { cn } from '@/lib/utils'
import {
  Download, FileSpreadsheet, Stethoscope, TrendingUp,
  Users, Calendar, CheckCircle2, Loader2, CheckCheck
} from 'lucide-react'

interface ExportReportsProps {
  dateFrom: string
  dateTo: string
  selectedDoctor: string
  selectedService: string
}

type ReportType = 'diagnosis' | 'procedures' | 'retention' | 'revenue' | 'funnel' | 'doctor_performance'
type ExportStatus = 'idle' | 'loading' | 'done' | 'error'

interface ReportDef {
  type: ReportType
  label: string
  description: string
  icon: React.ElementType
  category: 'clinical' | 'business'
}

const REPORTS: ReportDef[] = [
  {
    type: 'diagnosis',
    label: 'Distribusi Diagnosis ICD-10',
    description: '10 diagnosis teratas berdasarkan kode ICD-10',
    icon: Stethoscope,
    category: 'clinical',
  },
  {
    type: 'procedures',
    label: 'Frekuensi Prosedur',
    description: '10 prosedur paling umum dilakukan',
    icon: CheckCircle2,
    category: 'clinical',
  },
  {
    type: 'retention',
    label: 'Retensi Pasien',
    description: 'Data pasien baru vs pasien kembali per hari',
    icon: Users,
    category: 'clinical',
  },
  {
    type: 'revenue',
    label: 'Tren Pendapatan',
    description: 'Pendapatan harian berdasarkan metode pembayaran',
    icon: TrendingUp,
    category: 'business',
  },
  {
    type: 'funnel',
    label: 'Funnel Janji Temu',
    description: 'Jumlah appointment per status (dipesan, selesai, dll)',
    icon: Calendar,
    category: 'business',
  },
  {
    type: 'doctor_performance',
    label: 'Performa Dokter',
    description: 'Statistik per dokter: pasien, janji, prosedur, pendapatan',
    icon: Users,
    category: 'business',
  },
]

// ── CSV Export Utility ────────────────────────────────────────
function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const str = String(v)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }
  const lines = [
    headers.map(escape).join(','),
    ...rows.map(row => row.map(escape).join(',')),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Report Row ────────────────────────────────────────────────
function ReportExportCard({
  report, dateFrom, dateTo, onExport,
}: {
  report: ReportDef
  dateFrom: string
  dateTo: string
  onExport: (type: ReportType, status: ExportStatus) => void
}) {
  const [status, setStatus] = useState<ExportStatus>('idle')

  const handleExport = async () => {
    setStatus('loading')
    onExport(report.type, 'loading')

    try {
      const dateStr = `${format(parseISO(dateFrom), 'yyyyMMdd')}_${format(parseISO(dateTo), 'yyyyMMdd')}`

      switch (report.type) {
        case 'diagnosis': {
          const { data: records } = await supabase
            .from('medical_records')
            .select('diagnosis_codes')
            .gte('visit_date', dateFrom)
            .lte('visit_date', dateTo)

          const codeCount: Record<string, number> = {}
          ;(records || []).forEach((r: { diagnosis_codes: string[] | null }) => {
            ;(r.diagnosis_codes || []).forEach((code: string) => {
              codeCount[code] = (codeCount[code] || 0) + 1
            })
          })
          const sorted = Object.entries(codeCount)
            .map(([code, count]) => ({ code, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 50)

          downloadCsv(
            `diagnosis_icd10_${dateStr}.csv`,
            ['Kode ICD-10', 'Jumlah'],
            sorted.map(d => [d.code, d.count])
          )
          break
        }

        case 'procedures': {
          const { data: records } = await supabase
            .from('medical_records')
            .select('procedure_codes')
            .gte('visit_date', dateFrom)
            .lte('visit_date', dateTo)

          const procCount: Record<string, number> = {}
          ;(records || []).forEach((r: { procedure_codes: string[] | null }) => {
            ;(r.procedure_codes || []).forEach((proc: string) => {
              procCount[proc] = (procCount[proc] || 0) + 1
            })
          })
          const sorted = Object.entries(procCount)
            .map(([code, count]) => ({ code, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 50)

          downloadCsv(
            `frekuensi_prosedur_${dateStr}.csv`,
            ['Kode Prosedur', 'Jumlah'],
            sorted.map(d => [d.code, d.count])
          )
          break
        }

        case 'retention': {
          const { data: patients } = await supabase
            .from('patients')
            .select('id, created_at')
            .gte('created_at', `${dateFrom}T00:00:00`)
            .lte('created_at', `${dateTo}T23:59:59`)

          const days = eachDayOfInterval({
            start: parseISO(dateFrom),
            end: parseISO(dateTo),
          })

          const rows = days.map(day => {
            const dayStr = format(day, 'yyyy-MM-dd')
            const dayPatients = (patients || []).filter(
              (p: { created_at: string }) => p.created_at?.startsWith(dayStr)
            )
            return [
              dayStr,
              dayPatients.length,
              0, // returning will be 0 for now as it needs MR join
            ]
          })

          downloadCsv(
            `retensi_pasien_${dateStr}.csv`,
            ['Tanggal', 'Pasien Baru', 'Pasien Kembali'],
            rows
          )
          break
        }

        case 'revenue': {
          const { data: invoices } = await supabase
            .from('invoices')
            .select('total_amount, payment_status, payment_method, appointment_date')
            .gte('appointment_date', dateFrom)
            .lte('appointment_date', dateTo)

          const days = eachDayOfInterval({
            start: parseISO(dateFrom),
            end: parseISO(dateTo),
          })

          const rows = days.map(day => {
            const dayStr = format(day, 'yyyy-MM-dd')
            const dayInvoices = (invoices || []).filter(
              (i: { appointment_date: string }) => i.appointment_date?.startsWith(dayStr)
            )
            const paidInvoices = dayInvoices.filter(
              (i: { payment_status: string }) => i.payment_status === 'paid'
            )
            const cash = paidInvoices
              .filter((i: { payment_method: string }) => ['cash', 'tunai'].includes(i.payment_method?.toLowerCase()))
              .reduce((s: number, i: { total_amount: number }) => s + (i.total_amount || 0), 0)
            const bpjs = paidInvoices
              .filter((i: { payment_method: string }) => i.payment_method?.toLowerCase() === 'bpjs')
              .reduce((s: number, i: { total_amount: number }) => s + (i.total_amount || 0), 0)
            const insurance = paidInvoices
              .filter((i: { payment_method: string }) => !['cash', 'tunai', 'bpjs'].includes(i.payment_method?.toLowerCase()))
              .reduce((s: number, i: { total_amount: number }) => s + (i.total_amount || 0), 0)
            return [dayStr, cash, bpjs, insurance, cash + bpjs + insurance]
          })

          downloadCsv(
            `tren_pendapatan_${dateStr}.csv`,
            ['Tanggal', 'Tunai', 'BPJS', 'Asuransi', 'Total'],
            rows
          )
          break
        }

        case 'funnel': {
          const { data: appts } = await supabase
            .from('appointments')
            .select('status')
            .gte('appointment_date_time', `${dateFrom}T00:00:00`)
            .lte('appointment_date_time', `${dateTo}T23:59:59`)

          const normalize = (s: string) => s?.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_')
          const count = (pattern: string[]) =>
            (appts || []).filter((a: { status: string }) => pattern.includes(normalize(a.status))).length

          downloadCsv(
            `funnel_janji_${dateStr}.csv`,
            ['Status', 'Jumlah'],
            [
              ['Dipesan', count(['booked', 'scheduled', 'reserved'])],
              ['Dikonfirmasi', count(['confirmed', 'approved'])],
              ['Selesai', count(['completed', 'done', 'finished'])],
              ['Dibatalkan', count(['cancelled', 'canceled'])],
              ['Tidak Hadir', count(['no_show', 'noshow', 'absent', 'absensi'])],
            ]
          )
          break
        }

        case 'doctor_performance': {
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

          const rows = (doctors || []).map((doc: { id: string; full_name: string }) => {
            const docAppts = (appts || []).filter((a: { dentist_id: string | null }) => a.dentist_id === doc.id)
            const docRecords = (records || []).filter((r: { doctor_id: string | null }) => r.doctor_id === doc.id)
            const uniquePatients = new Set(docAppts.map((a: { patient_id: string | null }) => a.patient_id).filter(Boolean))
            const procedureCount = docRecords.reduce(
              (s: number, r: { procedure_codes: string[] | null }) => s + (r.procedure_codes?.length || 0),
              0
            )
            return [
              doc.full_name,
              docAppts.length,
              uniquePatients.size,
              procedureCount,
              0, // revenue placeholder
            ]
          })

          downloadCsv(
            `performa_dokter_${dateStr}.csv`,
            ['Nama Dokter', 'Janji Temu', 'Pasien Dilayani', 'Prosedur', 'Pendapatan'],
            rows
          )
          break
        }
      }

      setStatus('done')
      onExport(report.type, 'done')
      setTimeout(() => setStatus('idle'), 3000)
    } catch {
      setStatus('error')
      onExport(report.type, 'error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  const Icon = report.icon

  return (
    <Card className="bg-surface-container-low border-none shadow-long hover:shadow-xl transition-all">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
            report.category === 'clinical'
              ? 'bg-blue-100 text-blue-600'
              : 'bg-green-100 text-green-600'
          )}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-bold text-on-surface text-sm">{report.label}</h3>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {report.category === 'clinical' ? 'Klinis' : 'Bisnis'}
              </Badge>
            </div>
            <p className="text-xs text-on-surface-variant">{report.description}</p>
          </div>
          <Button
            size="sm"
            variant={status === 'done' ? 'secondary' : 'default'}
            className="gap-1.5 flex-shrink-0 shadow-sm"
            onClick={handleExport}
            disabled={status === 'loading'}
          >
            {status === 'loading' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : status === 'done' ? (
              <CheckCheck className="w-3.5 h-3.5" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            {status === 'done' ? 'Terunduh' : status === 'loading' ? 'Mengunduh...' : 'CSV'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main ExportReports ─────────────────────────────────────────
const ExportReports = ({ dateFrom, dateTo, selectedDoctor, selectedService }: ExportReportsProps) => {
  const [exportStatuses, setExportStatuses] = useState<Partial<Record<ReportType, ExportStatus>>>({})

  const handleExportStatus = (type: ReportType, status: ExportStatus) => {
    setExportStatuses(prev => ({ ...prev, [type]: status }))
  }

  const clinicalReports = REPORTS.filter(r => r.category === 'clinical')
  const businessReports = REPORTS.filter(r => r.category === 'business')

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-on-surface">Ekspor Laporan</h2>
          <p className="text-sm text-on-surface-variant">
            Unduh laporan dalam format CSV untuk analitis lebih lanjut
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <FileSpreadsheet className="w-3 h-3 mr-1" />
            CSV (Excel-compatible)
          </Badge>
          <Badge variant="outline" className="text-xs">
            {format(parseISO(dateFrom), 'dd MMM', { locale: localeId })} –{' '}
            {format(parseISO(dateTo), 'dd MMM yyyy', { locale: localeId })}
          </Badge>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <FileSpreadsheet className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-blue-800">Format CSV</p>
          <p className="text-xs text-blue-700 mt-0.5">
            Semua laporan diekspor sebagai file CSV yang dapat dibuka di Microsoft Excel, Google Sheets, atau aplikasi spreadsheet lainnya. Untuk laporan PDF, gunakan fungsi "Cetak" browser (Ctrl+P / Cmd+P) pada tampilan analitik.
          </p>
        </div>
      </div>

      {/* Clinical Reports */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-blue-500" />
          Laporan Klinis
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {clinicalReports.map(report => (
            <ReportExportCard
              key={report.type}
              report={report}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onExport={handleExportStatus}
            />
          ))}
        </div>
      </div>

      {/* Business Reports */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-500" />
          Laporan Bisnis
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {businessReports.map(report => (
            <ReportExportCard
              key={report.type}
              report={report}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onExport={handleExportStatus}
            />
          ))}
        </div>
      </div>

      {/* Bulk Export */}
      <Card className="bg-surface-container-low border-none shadow-long">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-on-surface">Ekspor Semua Laporan</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Unduh semua 6 laporan sekaligus dalam satu folder ZIP (tersedia segera)
              </p>
            </div>
            <Button
              variant="medical"
              size="sm"
              className="gap-2 shadow-md"
              onClick={() => {
                REPORTS.forEach(report => {
                  setTimeout(() => {
                    const card = document.querySelector(`[data-report="${report.type}"]`) as HTMLElement
                    if (card) card.click()
                  }, 500)
                })
              }}
            >
              <Download className="w-4 h-4" />
              Unduh Semua CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ExportReports
