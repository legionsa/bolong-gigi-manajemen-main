import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { ControlRoomLayout } from '@/components/controlroom/ControlRoomLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import {
  Shield,
  Search,
  Plus,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  KeyRound,
  Activity,
  TrendingUp,
  TrendingDown,
  FileText,
  Clock,
  Building2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface BpjsClinicCredential {
  id: string
  clinic_id: string
  clinic_name?: string
  cons_id: string
  secret_key: string
  app_code: string
  bpjs_faskes_id?: string
  status: string
  last_verified: string | null
  last_used: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

interface ClaimStats {
  total_claims: number
  draft_count: number
  submitted_count: number
  approved_count: number
  rejected_count: number
  paid_count: number
  approval_rate: number
}

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-500 border-green-500/20',
  inactive: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  expired: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  error: 'bg-red-500/10 text-red-500 border-red-500/20',
}

const claimStatusColors: Record<string, string> = {
  draft: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
  submitted: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  approved: 'bg-green-500/10 text-green-500 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
  paid: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
}

export default function BpjsIntegration() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedCredential, setSelectedCredential] = useState<BpjsClinicCredential | null>(null)
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())

  const [newCredential, setNewCredential] = useState({
    clinic_id: '',
    cons_id: '',
    secret_key: '',
    app_code: '',
    bpjs_faskes_id: '',
  })

  const [editCredential, setEditCredential] = useState({
    cons_id: '',
    secret_key: '',
    app_code: '',
    bpjs_faskes_id: '',
  })

  const superadmin = {
    email: 'arya@company.com',
    displayName: 'Arya Kusuma',
    tier: 'owner' as const,
  }

  // Fetch clinics for dropdown
  const { data: clinics } = useQuery({
    queryKey: ['controlroom', 'clinics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('controlroom.clinics')
        .select('id, name, bpjs_faskes_id')
        .order('name', { ascending: true })

      if (error) throw error
      return data || []
    },
    staleTime: 60 * 1000,
  })

  // Fetch claim statistics
  const { data: claimStats } = useQuery<ClaimStats>({
    queryKey: ['controlroom', 'bpjs-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('public.bpjs_claims')
        .select('status')

      if (error) throw error

      const claims = data || []
      const total = claims.length
      const draft = claims.filter(c => c.status === 'draft').length
      const submitted = claims.filter(c => c.status === 'submitted').length
      const approved = claims.filter(c => c.status === 'approved').length
      const rejected = claims.filter(c => c.status === 'rejected').length
      const paid = claims.filter(c => c.status === 'paid').length

      const decided = approved + rejected
      const approvalRate = decided > 0 ? (approved / decided) * 100 : 0

      return {
        total_claims: total,
        draft_count: draft,
        submitted_count: submitted,
        approved_count: approved,
        rejected_count: rejected,
        paid_count: paid,
        approval_rate: Math.round(approvalRate * 10) / 10,
      }
    },
    staleTime: 60 * 1000,
  })

  // Create credential mutation
  const createCredential = useMutation({
    mutationFn: async (data: typeof newCredential) => {
      // First, create integration credential record
      const { error: credError } = await supabase
        .from('controlroom.integration_credentials')
        .insert({
          clinic_id: data.clinic_id,
          integration: 'bpjs',
          key_name: 'cons_id',
          vault_key_id: `bpjs_${data.clinic_id}_cons_id`,
          status: 'active',
        })

      if (credError) throw credError

      // Update clinic with faskes_id if provided
      if (data.bpjs_faskes_id) {
        const { error: clinicError } = await supabase
          .from('controlroom.clinics')
          .update({ bpjs_faskes_id: data.bpjs_faskes_id })
          .eq('id', data.clinic_id)

        if (clinicError) throw clinicError
      }

      // Store secret in Vault (simplified - would use Supabase Vault in production)
      // For now, we'll just store metadata
    },
    onSuccess: () => {
      toast({ title: 'BPJS credential added successfully' })
      queryClient.invalidateQueries({ queryKey: ['controlroom', 'bpjs-credentials'] })
      setIsAddOpen(false)
      setNewCredential({ clinic_id: '', cons_id: '', secret_key: '', app_code: '', bpjs_faskes_id: '' })
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add credential', description: error.message, variant: 'destructive' })
    },
  })

  // Update credential mutation
  const updateCredential = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<typeof newCredential>) => {
      const { error } = await supabase
        .from('controlroom.integration_credentials')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: 'Credential updated' })
      queryClient.invalidateQueries({ queryKey: ['controlroom', 'bpjs-credentials'] })
      setIsEditOpen(false)
      setSelectedCredential(null)
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update credential', description: error.message, variant: 'destructive' })
    },
  })

  // Delete credential mutation
  const deleteCredential = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('controlroom.integration_credentials')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: 'Credential deleted' })
      queryClient.invalidateQueries({ queryKey: ['controlroom', 'bpjs-credentials'] })
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete credential', description: error.message, variant: 'destructive' })
    },
  })

  // Test connection mutation
  const testConnection = useMutation({
    mutationFn: async (credential: BpjsClinicCredential) => {
      // Call eligibility check endpoint
      const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/bpjs-eligibility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nik: '1234567890123456', // Test NIK
          clinic_id: credential.clinic_id,
        }),
      })

      const result = await response.json()

      // Update last_verified
      await supabase
        .from('controlroom.integration_credentials')
        .update({ last_verified: new Date().toISOString() })
        .eq('id', credential.id)

      return result
    },
    onSuccess: (result) => {
      if (result.success) {
        toast({ title: 'Connection test successful', description: 'BPJS API is accessible' })
      } else {
        toast({ title: 'Connection test failed', description: result.error || 'Check credentials', variant: 'destructive' })
      }
      queryClient.invalidateQueries({ queryKey: ['controlroom', 'bpjs-credentials'] })
    },
    onError: (error: Error) => {
      toast({ title: 'Connection test failed', description: error.message, variant: 'destructive' })
    },
  })

  // Filter credentials
  const filteredClinics = clinics?.filter((clinic) => {
    const matchesSearch = clinic.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  }) || []

  const handleViewDetail = (credential: BpjsClinicCredential) => {
    setSelectedCredential(credential)
    setIsDetailOpen(true)
  }

  const handleEdit = (credential: BpjsClinicCredential) => {
    setSelectedCredential(credential)
    setEditCredential({
      cons_id: credential.cons_id,
      secret_key: credential.secret_key,
      app_code: credential.app_code,
      bpjs_faskes_id: credential.bpjs_faskes_id || '',
    })
    setIsEditOpen(true)
  }

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const handleCopyKey = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({ title: 'Copied to clipboard' })
  }

  return (
    <ControlRoomLayout superadmin={superadmin} platformStatus="green">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-100">BPJS P-Care Integration</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage clinic credentials and monitor claim success rates
            </p>
          </div>
          <Button onClick={() => setIsAddOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-black gap-1.5">
            <Plus className="w-4 h-4" />
            Add Clinic Credential
          </Button>
        </div>

        <Tabs defaultValue="clinics" className="space-y-4">
          <TabsList className="bg-[#0A1120] border border-gray-800">
            <TabsTrigger value="clinics" className="data-[state=active]:bg-amber-500/20">Clinic Credentials</TabsTrigger>
            <TabsTrigger value="stats" className="data-[state=active]:bg-amber-500/20">Claim Statistics</TabsTrigger>
            <TabsTrigger value="reference" className="data-[state=active]:bg-amber-500/20">ICD Reference</TabsTrigger>
          </TabsList>

          {/* Clinic Credentials Tab */}
          <TabsContent value="clinics" className="space-y-4">
            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4">
              <Card className="bg-[#0A1120] border-gray-800">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Clinics</p>
                      <p className="text-2xl font-semibold text-gray-100">{clinics?.length || 0}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#0A1120] border-gray-800">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Active</p>
                      <p className="text-2xl font-semibold text-green-500">
                        {clinics?.filter(c => c.bpjs_faskes_id).length || 0}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#0A1120] border-gray-800">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Claims</p>
                      <p className="text-2xl font-semibold text-gray-100">{claimStats?.total_claims || 0}</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-amber-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#0A1120] border-gray-800">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Approval Rate</p>
                      <p className="text-2xl font-semibold text-gray-100">{claimStats?.approval_rate || 0}%</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-teal-500/10 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-teal-500" />
                    </div>
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
                  placeholder="Search by clinic name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-[#0A1120] border-gray-800 text-gray-100"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 bg-[#0A1120] border-gray-800">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Clinics Table */}
            <div className="bg-[#0A1120] border border-gray-800 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Clinic</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Faskes ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Cons ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Last Verified</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClinics.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No clinics found</td>
                    </tr>
                  ) : (
                    filteredClinics.map((clinic) => {
                      const hasCredential = !!clinic.bpjs_faskes_id
                      return (
                        <tr key={clinic.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-900/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                <Building2 className="w-4 h-4 text-blue-500" />
                              </div>
                              <span className="text-sm text-gray-100 font-medium">{clinic.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-mono text-gray-300">
                              {clinic.bpjs_faskes_id || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-300">
                              {hasCredential ? 'Configured' : 'Not set'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge className={cn(
                              'text-xs',
                              hasCredential ? statusColors.active : statusColors.inactive
                            )}>
                              {hasCredential ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-300">-</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit({
                                  id: clinic.id,
                                  clinic_id: clinic.id,
                                  clinic_name: clinic.name,
                                  cons_id: '',
                                  secret_key: '',
                                  app_code: '',
                                  bpjs_faskes_id: clinic.bpjs_faskes_id || '',
                                  status: hasCredential ? 'active' : 'inactive',
                                  last_verified: null,
                                  last_used: null,
                                  expires_at: null,
                                  created_at: '',
                                  updated_at: '',
                                })}
                                className="text-gray-400 hover:text-gray-100"
                              >
                                <KeyRound className="w-4 h-4" />
                              </Button>
                              {hasCredential && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => testConnection.mutate({
                                    id: clinic.id,
                                    clinic_id: clinic.id,
                                    clinic_name: clinic.name,
                                    cons_id: '',
                                    secret_key: '',
                                    app_code: '',
                                    bpjs_faskes_id: clinic.bpjs_faskes_id || '',
                                    status: 'active',
                                    last_verified: null,
                                    last_used: null,
                                    expires_at: null,
                                    created_at: '',
                                    updated_at: '',
                                  })}
                                  className="text-gray-400 hover:text-gray-100"
                                >
                                  <Activity className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Claim Statistics Tab */}
          <TabsContent value="stats" className="space-y-4">
            <div className="grid grid-cols-5 gap-4">
              <Card className="bg-[#0A1120] border-gray-800">
                <CardContent className="pt-4">
                  <p className="text-sm text-gray-500 mb-2">Draft</p>
                  <p className="text-3xl font-semibold text-gray-100">{claimStats?.draft_count || 0}</p>
                  <div className="mt-2 h-1 rounded bg-gray-700 overflow-hidden">
                    <div
                      className="h-full bg-gray-500 transition-all"
                      style={{ width: `${((claimStats?.draft_count || 0) / Math.max(claimStats?.total_claims || 1, 1)) * 100}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#0A1120] border-gray-800">
                <CardContent className="pt-4">
                  <p className="text-sm text-gray-500 mb-2">Submitted</p>
                  <p className="text-3xl font-semibold text-blue-500">{claimStats?.submitted_count || 0}</p>
                  <div className="mt-2 h-1 rounded bg-gray-700 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${((claimStats?.submitted_count || 0) / Math.max(claimStats?.total_claims || 1, 1)) * 100}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#0A1120] border-gray-800">
                <CardContent className="pt-4">
                  <p className="text-sm text-gray-500 mb-2">Approved</p>
                  <p className="text-3xl font-semibold text-green-500">{claimStats?.approved_count || 0}</p>
                  <div className="mt-2 h-1 rounded bg-gray-700 overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${((claimStats?.approved_count || 0) / Math.max(claimStats?.total_claims || 1, 1)) * 100}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#0A1120] border-gray-800">
                <CardContent className="pt-4">
                  <p className="text-sm text-gray-500 mb-2">Rejected</p>
                  <p className="text-3xl font-semibold text-red-500">{claimStats?.rejected_count || 0}</p>
                  <div className="mt-2 h-1 rounded bg-gray-700 overflow-hidden">
                    <div
                      className="h-full bg-red-500 transition-all"
                      style={{ width: `${((claimStats?.rejected_count || 0) / Math.max(claimStats?.total_claims || 1, 1)) * 100}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-[#0A1120] border-gray-800">
                <CardContent className="pt-4">
                  <p className="text-sm text-gray-500 mb-2">Paid</p>
                  <p className="text-3xl font-semibold text-teal-500">{claimStats?.paid_count || 0}</p>
                  <div className="mt-2 h-1 rounded bg-gray-700 overflow-hidden">
                    <div
                      className="h-full bg-teal-500 transition-all"
                      style={{ width: `${((claimStats?.paid_count || 0) / Math.max(claimStats?.total_claims || 1, 1)) * 100}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-[#0A1120] border-gray-800">
              <CardHeader>
                <CardTitle className="text-gray-100 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-amber-500" />
                  Claim Performance
                </CardTitle>
                <CardDescription>Overall BPJS claim success rate</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-end gap-2">
                      <span className="text-4xl font-bold text-gray-100">{claimStats?.approval_rate || 0}%</span>
                      <span className="text-sm text-gray-500 mb-1">approval rate</span>
                    </div>
                    <p className="text-sm text-gray-400 mt-2">
                      {claimStats?.approved_count || 0} approved out of {(claimStats?.approved_count || 0) + (claimStats?.rejected_count || 0)} decided claims
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-green-500">{claimStats?.approved_count || 0}</p>
                      <p className="text-xs text-gray-500">Approved</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-red-500">{claimStats?.rejected_count || 0}</p>
                      <p className="text-xs text-gray-500">Rejected</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ICD Reference Tab */}
          <TabsContent value="reference" className="space-y-4">
            <Card className="bg-[#0A1120] border-gray-800">
              <CardHeader>
                <CardTitle className="text-gray-100">ICD-10 & ICD-9-CM Reference</CardTitle>
                <CardDescription>Common dental diagnosis and procedure codes for BPJS</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-400">
                  Reference tables for dental ICD-10 (diagnoses) and ICD-9-CM (procedures) codes are available
                  in the database. These can be managed by clinic administrators through the main application.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Credential Modal */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="bg-[#0A1120] border-gray-800 text-gray-100">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-500" />
                Add BPJS Credential for Clinic
              </DialogTitle>
              <DialogDescription>Configure BPJS P-Care API credentials for a clinic</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                createCredential.mutate(newCredential)
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="clinic_id">Clinic</Label>
                <Select
                  value={newCredential.clinic_id}
                  onValueChange={(v) => setNewCredential((prev) => ({ ...prev, clinic_id: v }))}
                >
                  <SelectTrigger className="bg-[#05080F] border-gray-700">
                    <SelectValue placeholder="Select clinic" />
                  </SelectTrigger>
                  <SelectContent>
                    {clinics?.map((clinic) => (
                      <SelectItem key={clinic.id} value={clinic.id}>{clinic.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cons_id">Cons ID</Label>
                <Input
                  id="cons_id"
                  value={newCredential.cons_id}
                  onChange={(e) => setNewCredential((prev) => ({ ...prev, cons_id: e.target.value }))}
                  className="bg-[#05080F] border-gray-700"
                  placeholder="Consumer ID from BPJS"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secret_key">Secret Key</Label>
                <Input
                  id="secret_key"
                  type="password"
                  value={newCredential.secret_key}
                  onChange={(e) => setNewCredential((prev) => ({ ...prev, secret_key: e.target.value }))}
                  className="bg-[#05080F] border-gray-700"
                  placeholder="Secret key from BPJS"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="app_code">App Code</Label>
                <Input
                  id="app_code"
                  value={newCredential.app_code}
                  onChange={(e) => setNewCredential((prev) => ({ ...prev, app_code: e.target.value }))}
                  className="bg-[#05080F] border-gray-700"
                  placeholder="Application code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bpjs_faskes_id">BPJS Faskes ID</Label>
                <Input
                  id="bpjs_faskes_id"
                  value={newCredential.bpjs_faskes_id}
                  onChange={(e) => setNewCredential((prev) => ({ ...prev, bpjs_faskes_id: e.target.value }))}
                  className="bg-[#05080F] border-gray-700"
                  placeholder="e.g., 0165"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="border-gray-700">
                  Cancel
                </Button>
                <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-black">
                  Save Credential
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Credential Modal */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="bg-[#0A1120] border-gray-800 text-gray-100">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-500" />
                Edit BPJS Credential
              </DialogTitle>
              <DialogDescription>
                Update credentials for {selectedCredential?.clinic_name}
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (selectedCredential) {
                  updateCredential.mutate({ id: selectedCredential.id, ...editCredential })
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="edit_cons_id">Cons ID</Label>
                <Input
                  id="edit_cons_id"
                  value={editCredential.cons_id}
                  onChange={(e) => setEditCredential((prev) => ({ ...prev, cons_id: e.target.value }))}
                  className="bg-[#05080F] border-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_secret_key">Secret Key</Label>
                <Input
                  id="edit_secret_key"
                  type="password"
                  value={editCredential.secret_key}
                  onChange={(e) => setEditCredential((prev) => ({ ...prev, secret_key: e.target.value }))}
                  className="bg-[#05080F] border-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_app_code">App Code</Label>
                <Input
                  id="edit_app_code"
                  value={editCredential.app_code}
                  onChange={(e) => setEditCredential((prev) => ({ ...prev, app_code: e.target.value }))}
                  className="bg-[#05080F] border-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_bpjs_faskes_id">BPJS Faskes ID</Label>
                <Input
                  id="edit_bpjs_faskes_id"
                  value={editCredential.bpjs_faskes_id}
                  onChange={(e) => setEditCredential((prev) => ({ ...prev, bpjs_faskes_id: e.target.value }))}
                  className="bg-[#05080F] border-gray-700"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="border-gray-700">
                  Cancel
                </Button>
                <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-black">
                  Update
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Detail Modal */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="bg-[#0A1120] border-gray-800 text-gray-100">
            <DialogHeader>
              <DialogTitle>Credential Details</DialogTitle>
              <DialogDescription>View credential information</DialogDescription>
            </DialogHeader>
            {selectedCredential && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Clinic</p>
                    <p className="text-sm text-gray-100">{selectedCredential.clinic_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <Badge className={cn('text-xs', statusColors[selectedCredential.status] || statusColors.active)}>
                      {selectedCredential.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Faskes ID</p>
                    <p className="text-sm font-mono text-gray-100">{selectedCredential.bpjs_faskes_id || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Last Verified</p>
                    <p className="text-sm text-gray-100">
                      {selectedCredential.last_verified
                        ? format(new Date(selectedCredential.last_verified), 'dd MMM yyyy, HH:mm')
                        : 'Never'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ControlRoomLayout>
  )
}
