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
  Key,
  Search,
  Plus,
  Eye,
  EyeOff,
  Copy,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Shield,
  MessageSquare,
  CreditCard,
  Smartphone,
  Mail,
  Lock,
  Unlock,
  AlertTriangle,
  KeyRound,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface IntegrationCredential {
  id: string
  clinic_id: string
  clinic_name?: string
  integration: string
  key_name: string
  vault_key_id: string
  status: string
  last_verified: string | null
  last_used: string | null
  expires_at: string | null
  created_at: string
}

interface RateLimit {
  id: string
  integration: string
  max_per_day: number
  max_per_minute: number
  alert_threshold: number
  created_at: string
  updated_at: string
}

const integrationIcons: Record<string, React.ReactNode> = {
  whatsapp: <MessageSquare className="w-5 h-5" />,
  bpjs: <Shield className="w-5 h-5" />,
  midtrans: <CreditCard className="w-5 h-5" />,
  otp_sms: <Smartphone className="w-5 h-5" />,
  email: <Mail className="w-5 h-5" />,
}

const integrationColors: Record<string, string> = {
  whatsapp: 'bg-green-500/10 text-green-500 border-green-500/20',
  bpjs: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  midtrans: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  otp_sms: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  email: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
}

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-500 border-green-500/20',
  expired: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  revoked: 'bg-red-500/10 text-red-500 border-red-500/20',
}

export default function IntegrationVault() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [integrationFilter, setIntegrationFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedCredential, setSelectedCredential] = useState<IntegrationCredential | null>(null)
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())

  const [newCredential, setNewCredential] = useState({
    clinic_id: '',
    integration: '',
    key_name: '',
    api_key: '',
    expires_at: '',
  })

  // Fetch credentials
  const { data: credentials, isLoading } = useQuery<IntegrationCredential[]>({
    queryKey: ['controlroom', 'credentials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('controlroom.integration_credentials')
        .select('*, clinic:controlroom.clinics(name)')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    staleTime: 60 * 1000,
  })

  // Fetch rate limits
  const { data: rateLimits } = useQuery<RateLimit[]>({
    queryKey: ['controlroom', 'rate-limits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('controlroom.rate_limits')
        .select('*')
        .order('integration', { ascending: true })

      if (error) throw error
      return data || []
    },
    staleTime: 60 * 1000,
  })

  // Create credential mutation
  const createCredential = useMutation({
    mutationFn: async (data: typeof newCredential) => {
      // In production, would store API key in Vault and get vault_key_id
      const vault_key_id = `vault_${Date.now()}`

      const { error } = await supabase
        .from('controlroom.integration_credentials')
        .insert({
          clinic_id: data.clinic_id,
          integration: data.integration,
          key_name: data.key_name,
          vault_key_id,
          status: 'active',
        })

      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: 'Credential added successfully' })
      queryClient.invalidateQueries({ queryKey: ['controlroom', 'credentials'] })
      setIsAddOpen(false)
      setNewCredential({ clinic_id: '', integration: '', key_name: '', api_key: '', expires_at: '' })
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add credential', description: error.message, variant: 'destructive' })
    },
  })

  // Update credential status mutation
  const updateCredentialStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('controlroom.integration_credentials')
        .update({ status })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: 'Status updated' })
      queryClient.invalidateQueries({ queryKey: ['controlroom', 'credentials'] })
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update status', description: error.message, variant: 'destructive' })
    },
  })

  // Delete credential mutation
  const deleteCredential = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('controlroom.integration_credentials').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: 'Credential deleted' })
      queryClient.invalidateQueries({ queryKey: ['controlroom', 'credentials'] })
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete credential', description: error.message, variant: 'destructive' })
    },
  })

  // Update rate limit mutation
  const updateRateLimit = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<RateLimit>) => {
      const { error } = await supabase
        .from('controlroom.rate_limits')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: 'Rate limit updated' })
      queryClient.invalidateQueries({ queryKey: ['controlroom', 'rate-limits'] })
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update rate limit', description: error.message, variant: 'destructive' })
    },
  })

  // Filter credentials
  const filteredCredentials = credentials?.filter((cred) => {
    const clinicName = (cred as any).clinic?.name || ''
    const matchesSearch =
      clinicName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cred.key_name.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesIntegration = integrationFilter === 'all' || cred.integration === integrationFilter
    const matchesStatus = statusFilter === 'all' || cred.status === statusFilter

    return matchesSearch && matchesIntegration && matchesStatus
  })

  const handleViewDetail = (credential: IntegrationCredential) => {
    setSelectedCredential(credential)
    setIsDetailOpen(true)
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

  const handleCopyKey = (vaultKeyId: string) => {
    navigator.clipboard.writeText(vaultKeyId)
    toast({ title: 'Copied to clipboard' })
  }

  const superadmin = {
    email: 'arya@company.com',
    displayName: 'Arya Kusuma',
    tier: 'owner',
  }

  return (
    <ControlRoomLayout superadmin={superadmin} platformStatus="green">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-100">Integration Credentials Vault</h1>
            <p className="text-sm text-gray-500 mt-1">
              Securely manage API keys and integration credentials
            </p>
          </div>
          <Button onClick={() => setIsAddOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-black gap-1.5">
            <Plus className="w-4 h-4" />
            Add Credential
          </Button>
        </div>

        <Tabs defaultValue="credentials" className="space-y-4">
          <TabsList className="bg-[#0A1120] border border-gray-800">
            <TabsTrigger value="credentials" className="data-[state=active]:bg-amber-500/20">Credentials</TabsTrigger>
            <TabsTrigger value="rate-limits" className="data-[state=active]:bg-amber-500/20">Rate Limits</TabsTrigger>
          </TabsList>

          {/* Credentials Tab */}
          <TabsContent value="credentials" className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-5 gap-4">
              {['whatsapp', 'bpjs', 'midtrans', 'otp_sms', 'email'].map((integration) => (
                <Card
                  key={integration}
                  className={cn(
                    'bg-[#0A1120] border-gray-800 cursor-pointer transition-colors',
                    integrationFilter === integration && 'border-amber-500/50'
                  )}
                  onClick={() => setIntegrationFilter(integration === integrationFilter ? 'all' : integration)}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 capitalize">{integration}</p>
                        <p className="text-2xl font-semibold text-gray-100">
                          {credentials?.filter((c) => c.integration === integration).length || 0}
                        </p>
                      </div>
                      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', integrationColors[integration]?.split(' ')[0] || 'bg-gray-500/10')}>
                        {integrationIcons[integration]}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  type="search"
                  placeholder="Search by clinic or key name..."
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
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Credentials Table */}
            <div className="bg-[#0A1120] border border-gray-800 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Integration</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Clinic</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Key Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Last Used</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                    </tr>
                  ) : filteredCredentials?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No credentials found</td>
                    </tr>
                  ) : (
                    filteredCredentials?.map((cred) => (
                      <tr key={cred.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-900/50">
                        <td className="px-4 py-3">
                          <Badge className={cn('text-xs', integrationColors[cred.integration] || 'bg-gray-500/10 text-gray-500 border-gray-500/20')}>
                            {integrationIcons[cred.integration]}
                            <span className="ml-1 capitalize">{cred.integration}</span>
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-100">{(cred as any).clinic?.name || 'Unknown'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-gray-300">{cred.key_name}</p>
                            <button
                              onClick={() => toggleKeyVisibility(cred.id)}
                              className="text-gray-500 hover:text-gray-300"
                            >
                              {visibleKeys.has(cred.id) ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={cn('text-xs', statusColors[cred.status] || statusColors.active)}>
                            {cred.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-300">
                            {cred.last_used
                              ? format(new Date(cred.last_used), 'dd MMM yyyy, HH:mm')
                              : 'Never'}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyKey(cred.vault_key_id)}
                              className="text-gray-400 hover:text-gray-100"
                              title="Copy Key ID"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetail(cred)}
                              className="text-gray-400 hover:text-gray-100"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {cred.status === 'active' ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateCredentialStatus.mutate({ id: cred.id, status: 'revoked' })}
                                className="text-red-400 hover:text-red-300"
                                title="Revoke"
                              >
                                <Lock className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateCredentialStatus.mutate({ id: cred.id, status: 'active' })}
                                className="text-green-400 hover:text-green-300"
                                title="Activate"
                              >
                                <Unlock className="w-4 h-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteCredential.mutate(cred.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* Rate Limits Tab */}
          <TabsContent value="rate-limits" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {rateLimits?.map((limit) => (
                <Card key={limit.id} className="bg-[#0A1120] border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-gray-100 flex items-center gap-2">
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', integrationColors[limit.integration]?.split(' ')[0] || 'bg-gray-500/10')}>
                        {integrationIcons[limit.integration]}
                      </div>
                      <span className="capitalize">{limit.integration}</span>
                    </CardTitle>
                    <CardDescription>Configure rate limits for {limit.integration}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Max per Day</Label>
                        <Input
                          type="number"
                          defaultValue={limit.max_per_day}
                          className="bg-[#05080F] border-gray-700"
                          onBlur={(e) => {
                            if (e.target.value !== String(limit.max_per_day)) {
                              updateRateLimit.mutate({ id: limit.id, max_per_day: parseInt(e.target.value) })
                            }
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Max per Minute</Label>
                        <Input
                          type="number"
                          defaultValue={limit.max_per_minute}
                          className="bg-[#05080F] border-gray-700"
                          onBlur={(e) => {
                            if (e.target.value !== String(limit.max_per_minute)) {
                              updateRateLimit.mutate({ id: limit.id, max_per_minute: parseInt(e.target.value) })
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Alert Threshold ({Math.round(limit.alert_threshold * 100)}%)</Label>
                      <Input
                        type="range"
                        min="0.5"
                        max="0.95"
                        step="0.05"
                        defaultValue={limit.alert_threshold}
                        className="w-full"
                        onChange={(e) => {
                          updateRateLimit.mutate({ id: limit.id, alert_threshold: parseFloat(e.target.value) })
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Last updated: {format(new Date(limit.updated_at), 'dd MMM yyyy HH:mm')}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Add Credential Modal */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="bg-[#0A1120] border-gray-800 text-gray-100">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-500" />
                Add New Credential
              </DialogTitle>
              <DialogDescription>Store a new integration credential securely</DialogDescription>
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
                    <SelectItem value="clinic-1">Klinik Gigi Sejahtera</SelectItem>
                    <SelectItem value="clinic-2">Klinik Gigi Maju</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="integration">Integration</Label>
                <Select
                  value={newCredential.integration}
                  onValueChange={(v) => setNewCredential((prev) => ({ ...prev, integration: v }))}
                >
                  <SelectTrigger className="bg-[#05080F] border-gray-700">
                    <SelectValue placeholder="Select integration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="bpjs">BPJS</SelectItem>
                    <SelectItem value="midtrans">Midtrans</SelectItem>
                    <SelectItem value="otp_sms">OTP SMS</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="key_name">Key Name</Label>
                <Input
                  id="key_name"
                  value={newCredential.key_name}
                  onChange={(e) => setNewCredential((prev) => ({ ...prev, key_name: e.target.value }))}
                  className="bg-[#05080F] border-gray-700"
                  placeholder="e.g., production_api_key, sandbox_token"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="api_key">API Key / Secret</Label>
                <Input
                  id="api_key"
                  type="password"
                  value={newCredential.api_key}
                  onChange={(e) => setNewCredential((prev) => ({ ...prev, api_key: e.target.value }))}
                  className="bg-[#05080F] border-gray-700"
                  placeholder="Enter API key (will be stored in Vault)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expires_at">Expiry Date (optional)</Label>
                <Input
                  id="expires_at"
                  type="date"
                  value={newCredential.expires_at}
                  onChange={(e) => setNewCredential((prev) => ({ ...prev, expires_at: e.target.value }))}
                  className="bg-[#05080F] border-gray-700"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="border-gray-700">
                  Cancel
                </Button>
                <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-black">
                  Store Credential
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
                    <p className="text-xs text-gray-500">Integration</p>
                    <Badge className={cn('text-xs mt-1', integrationColors[selectedCredential.integration] || 'bg-gray-500/10 text-gray-500 border-gray-500/20')}>
                      {selectedCredential.integration}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <Badge className={cn('text-xs mt-1', statusColors[selectedCredential.status] || statusColors.active)}>
                      {selectedCredential.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Clinic</p>
                    <p className="text-sm text-gray-100">{(selectedCredential as any).clinic?.name || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Key Name</p>
                    <p className="text-sm text-gray-100">{selectedCredential.key_name}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Vault Key ID</p>
                    <div className="flex items-center gap-2">
                      <code className="text-sm text-gray-300 bg-[#05080F] px-2 py-1 rounded">
                        {selectedCredential.vault_key_id}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyKey(selectedCredential.vault_key_id)}
                        className="text-gray-400 hover:text-gray-100"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Last Verified</p>
                    <p className="text-sm text-gray-100">
                      {selectedCredential.last_verified
                        ? format(new Date(selectedCredential.last_verified), 'dd MMM yyyy, HH:mm')
                        : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Last Used</p>
                    <p className="text-sm text-gray-100">
                      {selectedCredential.last_used
                        ? format(new Date(selectedCredential.last_used), 'dd MMM yyyy, HH:mm')
                        : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Expires</p>
                    <p className="text-sm text-gray-100">
                      {selectedCredential.expires_at
                        ? format(new Date(selectedCredential.expires_at), 'dd MMM yyyy')
                        : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Created</p>
                    <p className="text-sm text-gray-100">
                      {format(new Date(selectedCredential.created_at), 'dd MMM yyyy')}
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