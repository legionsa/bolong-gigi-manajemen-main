import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Shield,
  Plus,
  Search,
  MoreVertical,
  Eye,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  RefreshCw,
  Calendar,
  User,
  Building2,
  AlertCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

// Status badge colors
const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' },
  submitted: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Submitted' },
  approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approved' },
  rejected: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rejected' },
  paid: { bg: 'bg-teal-100', text: 'text-teal-800', label: 'Paid' },
}

interface BpjsClaim {
  id: string
  appointment_id: string
  clinic_id: string
  patient_id: string
  sep_no: string | null
  diagnoses: any[]
  procedures: any[]
  status: string
  submitted_at: string | null
  approved_at: string | null
  rejected_at: string | null
  rejection_reason: string | null
  total_claim_amount: number | null
  created_at: string
  // Joined data
  patients?: {
    full_name: string
    nik: string
    bpjs_number: string | null
  }
  appointments?: {
    appointment_date: string
    chief_complaint: string | null
  }
  clinics?: {
    name: string
  }
}

interface Appointment {
  id: string
  appointment_date: string
  chief_complaint: string | null
  status: string
  patients: {
    id: string
    full_name: string
    nik: string
    bpjs_number: string | null
    bpjs_active: boolean | null
  }
}

const ClaimsTableSkeleton = () => (
  <Table>
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead>SEP Number</TableHead>
        <TableHead>Patient</TableHead>
        <TableHead>Appointment</TableHead>
        <TableHead>Diagnoses</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Amount</TableHead>
        <TableHead>Aksi</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {[1, 2, 3].map(i => (
        <TableRow key={i}>
          <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
          <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
          <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
          <TableCell><Skeleton className="h-4 w-[80px] rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-5 w-[80px] rounded-full" /></TableCell>
          <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
          <TableCell><Skeleton className="h-8 w-[60px]" /></TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
)

export default function BpjsClaimManagement() {
  const { toast } = useToast()
  const [claims, setClaims] = useState<BpjsClaim[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [clinicId, setClinicId] = useState<string | null>(null)

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isSubmitOpen, setIsSubmitOpen] = useState(false)
  const [selectedClaim, setSelectedClaim] = useState<BpjsClaim | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // New claim form
  const [newClaim, setNewClaim] = useState({
    appointment_id: '',
    diagnoses: [] as string[],
    procedures: [] as string[],
  })

  useEffect(() => {
    loadClinicAndClaims()
    loadAppointments()
  }, [])

  const loadClinicAndClaims = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get clinic_id for this admin
    const { data: cu } = await supabase
      .from('clinic_users')
      .select('clinic_id')
      .eq('user_id', user.id)
      .eq('role', 'clinic_admin')
      .single()

    if (!cu) { setIsLoading(false); return }
    setClinicId(cu.clinic_id)

    // Get claims with joined data
    const { data: claimsData, error: claimsError } = await supabase
      .from('bpjs_claims')
      .select(`
        *,
        patients:patient_id (full_name, nik, bpjs_number),
        appointments:appointment_id (appointment_date, chief_complaint),
        clinics:clinic_id (name)
      `)
      .eq('clinic_id', cu.clinic_id)
      .order('created_at', { ascending: false })

    if (claimsError) {
      console.error('Error loading claims:', claimsError)
      toast({ title: 'Gagal memuat klaim', variant: 'destructive' })
    } else {
      setClaims(claimsData || [])
    }

    setIsLoading(false)
  }

  const loadAppointments = async () => {
    // Get appointments that can be claimed (completed, no existing claim)
    const { data: appointmentsData } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        chief_complaint,
        status,
        patients (
          id,
          full_name,
          nik,
          bpjs_number,
          bpjs_active
        )
      `)
      .eq('status', 'completed')
      .order('appointment_date', { ascending: false })
      .limit(50)

    if (appointmentsData) {
      // Filter out appointments that already have claims
      const { data: existingClaims } = await supabase
        .from('bpjs_claims')
        .select('appointment_id')

      const claimedAppointmentIds = new Set(existingClaims?.map(c => c.appointment_id) || [])
      const eligibleAppointments = appointmentsData.filter(a => !claimedAppointmentIds.has(a.id))

      setAppointments(eligibleAppointments)
    }
  }

  const handleCreateClaim = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clinicId || !newClaim.appointment_id) return

    const appointment = appointments.find(a => a.id === newClaim.appointment_id)
    if (!appointment) return

    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from('bpjs_claims')
        .insert({
          appointment_id: newClaim.appointment_id,
          clinic_id: clinicId,
          patient_id: appointment.patients.id,
          diagnoses: newClaim.diagnoses.map(code => ({ code, description: '' })),
          procedures: newClaim.procedures.map(code => ({ code, description: '' })),
          status: 'draft',
        })

      if (error) throw error

      toast({ title: 'Klaim berhasil dibuat', description: 'Klaim draft siap untuk disubmit ke BPJS' })
      setIsCreateOpen(false)
      setNewClaim({ appointment_id: '', diagnoses: [], procedures: [] })
      loadClinicAndClaims()
      loadAppointments()
    } catch (error: any) {
      toast({ title: 'Gagal membuat klaim', description: error.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitToBpjs = async (claim: BpjsClaim) => {
    if (!clinicId) return

    setSelectedClaim(claim)
    setIsSubmitOpen(true)
  }

  const confirmSubmitToBpjs = async () => {
    if (!selectedClaim || !clinicId) return

    setIsSubmitting(true)

    try {
      const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/bpjs-submit-claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          action: 'create_sep',
          appointment_id: selectedClaim.appointment_id,
          clinic_id: clinicId,
          patient_id: selectedClaim.patient_id,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || 'Failed to submit claim')
      }

      toast({
        title: 'Klaim berhasil disubmit',
        description: `SEP Number: ${result.data.sep_no}`,
      })

      setIsSubmitOpen(false)
      setSelectedClaim(null)
      loadClinicAndClaims()
    } catch (error: any) {
      toast({
        title: 'Gagal submit klaim',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleViewDetail = (claim: BpjsClaim) => {
    setSelectedClaim(claim)
    setIsDetailOpen(true)
  }

  const filteredClaims = claims.filter(claim => {
    const matchesSearch =
      claim.sep_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.patients?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.patients?.nik?.includes(searchTerm)

    const matchesStatus = statusFilter === 'all' || claim.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    const config = STATUS_COLORS[status] || STATUS_COLORS.draft
    return (
      <Badge className={`${config.bg} ${config.text}`}>
        {config.label}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="bg-surface-container-lowest shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-primary">
                <div className="w-9 h-9 rounded-xl bg-secondary-fixed flex items-center justify-center">
                  <Shield className="w-5 h-5 text-on-secondary-fixed" />
                </div>
                Manajemen Klaim BPJS
              </CardTitle>
              <CardDescription className="mt-2">
                Kelola klaim BPJS P-Care untuk pasien dengan BPJS aktif
              </CardDescription>
            </div>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button variant="medical" className="gap-2 w-full sm:w-auto justify-center">
                  <Plus className="w-4 h-4" />
                  Klaim Baru
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[480px] bg-surface-container-lowest">
                <DialogHeader>
                  <DialogTitle className="text-on-surface">Buat Klaim BPJS Baru</DialogTitle>
                  <DialogDescription className="text-on-surface-variant">
                    Pilih appointment untuk membuat klaim BPJS P-Care
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateClaim} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="appointment" className="font-semibold text-on-surface">
                      Appointment Pasien
                    </Label>
                    <Select
                      value={newClaim.appointment_id}
                      onValueChange={(v) => {
                        setNewClaim(prev => ({ ...prev, appointment_id: v }))
                        const apt = appointments.find(a => a.id === v)
                        setSelectedAppointment(apt || null)
                      }}
                    >
                      <SelectTrigger className="bg-surface-container-low border-none rounded-xl h-12">
                        <SelectValue placeholder="Pilih appointment" />
                      </SelectTrigger>
                      <SelectContent>
                        {appointments.map(apt => (
                          <SelectItem key={apt.id} value={apt.id}>
                            {format(new Date(apt.appointment_date), 'dd MMM yyyy', { locale: localeId })} - {apt.patients.full_name} ({apt.patients.nik})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedAppointment && (
                    <div className="rounded-xl bg-surface-container-low p-4 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-on-surface-variant" />
                        <span className="font-medium text-on-surface">{selectedAppointment.patients.full_name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-on-surface-variant">NIK:</span>
                        <span className="font-mono text-on-surface">{selectedAppointment.patients.nik}</span>
                      </div>
                      {selectedAppointment.patients.bpjs_number && (
                        <div className="flex items-center gap-2 text-sm">
                          <Shield className="w-4 h-4 text-on-surface-variant" />
                          <span className="text-on-surface-variant">BPJS:</span>
                          <span className="font-mono text-on-surface">{selectedAppointment.patients.bpjs_number}</span>
                        </div>
                      )}
                      {selectedAppointment.chief_complaint && (
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="w-4 h-4 text-on-surface-variant" />
                          <span className="text-on-surface">{selectedAppointment.chief_complaint}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="diagnoses" className="font-semibold text-on-surface">
                      Kode ICD-10 (Diagnosa)
                    </Label>
                    <Input
                      id="diagnoses"
                      placeholder="Contoh: K02.0, K04.1 (pisahkan dengan koma)"
                      value={newClaim.diagnoses.join(', ')}
                      onChange={(e) => setNewClaim(prev => ({
                        ...prev,
                        diagnoses: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      }))}
                      className="bg-surface-container-low border-none rounded-xl h-12"
                    />
                    <p className="text-xs text-on-surface-variant">
                      Masukkan kode ICD-10 dipisahkan dengan koma
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="procedures" className="font-semibold text-on-surface">
                      Kode ICD-9-CM (Prosedur)
                    </Label>
                    <Input
                      id="procedures"
                      placeholder="Contoh: 23.01, 24.0 (pisahkan dengan koma)"
                      value={newClaim.procedures.join(', ')}
                      onChange={(e) => setNewClaim(prev => ({
                        ...prev,
                        procedures: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                      }))}
                      className="bg-surface-container-low border-none rounded-xl h-12"
                    />
                    <p className="text-xs text-on-surface-variant">
                      Masukkan kode ICD-9-CM dipisahkan dengan koma
                    </p>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      variant="medical"
                      disabled={!newClaim.appointment_id || isSubmitting}
                      className="gap-2"
                    >
                      {isSubmitting ? 'Membuat...' : 'Buat Klaim'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-on-surface-variant" />
              <Input
                placeholder="Cari SEP number, nama pasien, atau NIK..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 bg-surface-container-low border-0 focus:bg-surface-container focus:ring-2 focus:ring-primary/30 rounded-xl"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] bg-surface-container-low border-none rounded-xl">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? <ClaimsTableSkeleton /> : filteredClaims.length === 0 ? (
            <div className="text-center py-16">
              <Shield className="w-12 h-12 mx-auto text-on-surface-variant/30 mb-3" />
              <p className="font-semibold text-on-surface mb-1">Belum ada klaim</p>
              <p className="text-sm text-on-surface-variant mb-4">
                Buat klaim baru dari appointment yang sudah completed
              </p>
              <Button variant="medical" onClick={() => setIsCreateOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Klaim Baru
              </Button>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-outline-variant/20">
                    <TableHead className="text-on-surface-variant font-semibold">SEP Number</TableHead>
                    <TableHead className="text-on-surface-variant font-semibold">Patient</TableHead>
                    <TableHead className="text-on-surface-variant font-semibold">Appointment</TableHead>
                    <TableHead className="text-on-surface-variant font-semibold">Diagnoses</TableHead>
                    <TableHead className="text-on-surface-variant font-semibold">Status</TableHead>
                    <TableHead className="text-on-surface-variant font-semibold">Amount</TableHead>
                    <TableHead className="text-right text-on-surface-variant font-semibold">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClaims.map(claim => (
                    <TableRow key={claim.id} className="hover:bg-surface-container-low border-b border-outline-variant/10">
                      <TableCell className="font-mono text-sm font-medium text-on-surface">
                        {claim.sep_no || '-'}
                      </TableCell>
                      <TableCell className="font-medium text-on-surface">
                        {claim.patients?.full_name || 'Unknown'}
                        <div className="text-xs text-on-surface-variant font-mono">
                          {claim.patients?.nik}
                        </div>
                      </TableCell>
                      <TableCell className="text-on-surface-variant text-sm">
                        {claim.appointments
                          ? format(new Date(claim.appointments.appointment_date), 'dd MMM yyyy', { locale: localeId })
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {claim.diagnoses?.slice(0, 2).map((d: any, i) => (
                            <Badge key={i} variant="outline" className="text-xs font-mono">
                              {d.code}
                            </Badge>
                          ))}
                          {claim.diagnoses?.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{claim.diagnoses.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(claim.status)}
                      </TableCell>
                      <TableCell className="text-on-surface font-mono">
                        {claim.total_claim_amount
                          ? `Rp ${claim.total_claim_amount.toLocaleString('id-ID')}`
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel className="text-xs text-on-surface-variant">Aksi</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleViewDetail(claim)} className="gap-2">
                              <Eye className="w-4 h-4" />
                              Lihat Detail
                            </DropdownMenuItem>
                            {claim.status === 'draft' && (
                              <DropdownMenuItem onClick={() => handleSubmitToBpjs(claim)} className="gap-2">
                                <Send className="w-4 h-4 text-blue-600" />
                                Submit ke BPJS
                              </DropdownMenuItem>
                            )}
                            {claim.status === 'rejected' && (
                              <DropdownMenuItem className="gap-2">
                                <RefreshCw className="w-4 h-4 text-amber-600" />
                                Aju Ulang
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[600px] bg-surface-container-lowest">
          <DialogHeader>
            <DialogTitle className="text-on-surface flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Detail Klaim BPJS
            </DialogTitle>
            <DialogDescription className="text-on-surface-variant">
              Informasi lengkap klaim {selectedClaim?.sep_no || 'Draft'}
            </DialogDescription>
          </DialogHeader>
          {selectedClaim && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-on-surface-variant">SEP Number</p>
                  <p className="font-mono font-medium text-on-surface">
                    {selectedClaim.sep_no || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant">Status</p>
                  {getStatusBadge(selectedClaim.status)}
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant">Patient</p>
                  <p className="font-medium text-on-surface">
                    {selectedClaim.patients?.full_name || 'Unknown'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant">NIK</p>
                  <p className="font-mono text-on-surface">
                    {selectedClaim.patients?.nik || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant">BPJS Number</p>
                  <p className="font-mono text-on-surface">
                    {selectedClaim.patients?.bpjs_number || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant">Appointment</p>
                  <p className="text-on-surface">
                    {selectedClaim.appointments
                      ? format(new Date(selectedClaim.appointments.appointment_date), 'dd MMMM yyyy', { locale: localeId })
                      : '-'
                    }
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-on-surface-variant mb-2">Diagnoses (ICD-10)</p>
                <div className="flex flex-wrap gap-2">
                  {selectedClaim.diagnoses?.map((d: any, i) => (
                    <Badge key={i} variant="outline" className="font-mono">
                      {d.code} - {d.description || 'N/A'}
                    </Badge>
                  )) || '-'}
                </div>
              </div>

              <div>
                <p className="text-xs text-on-surface-variant mb-2">Procedures (ICD-9-CM)</p>
                <div className="flex flex-wrap gap-2">
                  {selectedClaim.procedures?.map((p: any, i) => (
                    <Badge key={i} variant="outline" className="font-mono">
                      {p.code} - {p.description || 'N/A'}
                    </Badge>
                  )) || '-'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-on-surface-variant">Total Amount</p>
                  <p className="font-mono font-medium text-on-surface">
                    {selectedClaim.total_claim_amount
                      ? `Rp ${selectedClaim.total_claim_amount.toLocaleString('id-ID')}`
                      : '-'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant">Submitted At</p>
                  <p className="text-on-surface">
                    {selectedClaim.submitted_at
                      ? format(new Date(selectedClaim.submitted_at), 'dd MMM yyyy HH:mm', { locale: localeId })
                      : '-'
                    }
                  </p>
                </div>
              </div>

              {selectedClaim.rejection_reason && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <p className="font-medium text-red-800">Alasan Penolakan</p>
                  </div>
                  <p className="text-sm text-red-700">{selectedClaim.rejection_reason}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Tutup
            </Button>
            {selectedClaim?.status === 'draft' && (
              <Button
                variant="medical"
                onClick={() => {
                  setIsDetailOpen(false)
                  handleSubmitToBpjs(selectedClaim)
                }}
                className="gap-2"
              >
                <Send className="w-4 h-4" />
                Submit ke BPJS
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Confirmation Dialog */}
      <Dialog open={isSubmitOpen} onOpenChange={setIsSubmitOpen}>
        <DialogContent className="sm:max-w-[480px] bg-surface-container-lowest">
          <DialogHeader>
            <DialogTitle className="text-on-surface flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-600" />
              Submit Klaim ke BPJS
            </DialogTitle>
            <DialogDescription className="text-on-surface-variant">
              Klaim akan disubmit ke BPJS P-Care untuk proses review
            </DialogDescription>
          </DialogHeader>
          {selectedClaim && (
            <div className="space-y-4">
              <div className="rounded-xl bg-surface-container-low p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-on-surface-variant">Patient</span>
                  <span className="font-medium text-on-surface">
                    {selectedClaim.patients?.full_name || 'Unknown'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-on-surface-variant">SEP Number</span>
                  <span className="font-mono text-on-surface">
                    {selectedClaim.sep_no || 'Will be generated'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-on-surface-variant">Diagnoses</span>
                  <span className="font-mono text-on-surface">
                    {selectedClaim.diagnoses?.map((d: any) => d.code).join(', ') || '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-on-surface-variant">Procedures</span>
                  <span className="font-mono text-on-surface">
                    {selectedClaim.procedures?.map((p: any) => p.code).join(', ') || '-'}
                  </span>
                </div>
              </div>

              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">Proses ini tidak dapat dibatalkan</p>
                    <p className="mt-1">Pastikan semua data sudah benar sebelum submit.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubmitOpen(false)} disabled={isSubmitting}>
              Batal
            </Button>
            <Button
              variant="medical"
              onClick={confirmSubmitToBpjs}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Menyubmit...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Submit Sekarang
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
