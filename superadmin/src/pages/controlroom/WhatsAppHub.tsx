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
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import {
  MessageSquare,
  Search,
  Plus,
  Eye,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Send,
  Settings,
  BarChart3,
  Phone,
  Mail,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface WhatsAppCredential {
  id: string
  clinic_id: string
  clinic_name?: string
  integration: string
  key_name: string
  vault_key_id: string
  status: string
  last_verified: string
  last_used: string
  expires_at: string
  created_at: string
}

interface WhatsAppStats {
  total_sent: number
  delivered: number
  failed: number
  pending: number
}

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-500 border-green-500/20',
  expired: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  revoked: 'bg-red-500/10 text-red-500 border-red-500/20',
}

export default function WhatsAppHub() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedCredential, setSelectedCredential] = useState<WhatsAppCredential | null>(null)
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Fetch WhatsApp credentials
  const { data: credentials, isLoading } = useQuery<WhatsAppCredential[]>({
    queryKey: ['controlroom', 'whatsapp-credentials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('controlroom.integration_credentials')
        .select('*, clinic:controlroom.clinics(name)')
        .eq('integration', 'whatsapp')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    staleTime: 60 * 1000,
  })

  // Fetch WhatsApp stats
  const { data: stats } = useQuery<WhatsAppStats>({
    queryKey: ['controlroom', 'whatsapp-stats'],
    queryFn: async () => {
      // This would normally be from a view or aggregated query
      const { data, error } = await supabase
        .from('communication_log')
        .select('status')
        .eq('channel', 'whatsapp')

      if (error) throw error

      const stats: WhatsAppStats = {
        total_sent: data?.length || 0,
        delivered: data?.filter(d => d.status === 'delivered').length || 0,
        failed: data?.filter(d => d.status === 'failed').length || 0,
        pending: data?.filter(d => d.status === 'pending' || d.status === 'sent').length || 0,
      }
      return stats
    },
    staleTime: 60 * 1000,
  })

  // Verify credential mutation
  const verifyCredential = useMutation({
    mutationFn: async (credentialId: string) => {
      const { error } = await supabase
        .from('controlroom.integration_credentials')
        .update({ last_verified: new Date().toISOString() })
        .eq('id', credentialId)

      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: 'Credential verified successfully' })
      queryClient.invalidateQueries({ queryKey: ['controlroom', 'whatsapp-credentials'] })
    },
    onError: (error: Error) => {
      toast({ title: 'Verification failed', description: error.message, variant: 'destructive' })
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
      queryClient.invalidateQueries({ queryKey: ['controlroom', 'whatsapp-credentials'] })
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update status', description: error.message, variant: 'destructive' })
    },
  })

  // Filter credentials
  const filteredCredentials = credentials?.filter((cred) => {
    const clinicName = (cred as any).clinic?.name || ''
    const matchesSearch =
      clinicName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cred.key_name.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || cred.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const handleViewDetail = (credential: WhatsAppCredential) => {
    setSelectedCredential(credential)
    setIsDetailOpen(true)
  }

  const handleVerify = (credential: WhatsAppCredential) => {
    verifyCredential.mutate(credential.id)
  }

  const superadmin = {
    email: 'arya@company.com',
    displayName: 'Arya Kusuma',
    tier: 'operator',
  }

  return (
    <ControlRoomLayout superadmin={superadmin} platformStatus="green" onSearch={(q) => setSearchQuery(q)}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-100">WhatsApp Hub</h1>
            <p className="text-sm text-gray-500 mt-1">
              Monitor and manage WhatsApp Business API connections
            </p>
          </div>
          <Button
            onClick={() => setIsConfigOpen(true)}
            className="bg-green-500 hover:bg-green-600 text-black gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Connection
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-[#0A1120] border-gray-800">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Sent</p>
                  <p className="text-2xl font-semibold text-gray-100">{stats?.total_sent || 0}</p>
                </div>
                <MessageSquare className="w-8 h-8 text-green-500/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#0A1120] border-gray-800">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Delivered</p>
                  <p className="text-2xl font-semibold text-green-500">{stats?.delivered || 0}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#0A1120] border-gray-800">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Pending</p>
                  <p className="text-2xl font-semibold text-amber-500">{stats?.pending || 0}</p>
                </div>
                <Clock className="w-8 h-8 text-amber-500/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#0A1120] border-gray-800">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Failed</p>
                  <p className="text-2xl font-semibold text-red-500">{stats?.failed || 0}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-500/20" />
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

        {/* Credentials List */}
        <div className="bg-[#0A1120] border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Clinic</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Key Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Last Verified</th>
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
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No WhatsApp connections found</td>
                </tr>
              ) : (
                filteredCredentials?.map((credential) => (
                  <tr key={credential.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-900/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center">
                          <MessageSquare className="w-4 h-4 text-green-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-100">{(credential as any).clinic?.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{credential.clinic_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-300">{credential.key_name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn('text-xs', statusColors[credential.status] || statusColors.active)}>
                        {credential.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-300">
                        {credential.last_verified
                          ? format(new Date(credential.last_verified), 'dd MMM yyyy, HH:mm')
                          : 'Never'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-300">
                        {credential.last_used
                          ? format(new Date(credential.last_used), 'dd MMM yyyy, HH:mm')
                          : 'Never'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetail(credential)}
                          className="text-gray-400 hover:text-gray-100"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVerify(credential)}
                          className="text-blue-400 hover:text-blue-300"
                          title="Verify Connection"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </Button>
                        {credential.status === 'active' ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateCredentialStatus.mutate({ id: credential.id, status: 'revoked' })}
                            className="text-red-400 hover:text-red-300"
                            title="Revoke"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateCredentialStatus.mutate({ id: credential.id, status: 'active' })}
                            className="text-green-400 hover:text-green-300"
                            title="Activate"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Add Connection Modal */}
        <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
          <DialogContent className="bg-[#0A1120] border-gray-800 text-gray-100">
            <DialogHeader>
              <DialogTitle>Add WhatsApp Connection</DialogTitle>
              <DialogDescription>Configure a new WhatsApp Business API connection</DialogDescription>
            </DialogHeader>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clinic_id">Clinic</Label>
                <Select>
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
                <Label htmlFor="key_name">Key Name</Label>
                <Input id="key_name" name="key_name" placeholder="e.g., main_number, verification_bot" className="bg-[#05080F] border-gray-700" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="api_key">360Dialog API Key</Label>
                <Input id="api_key" name="api_key" type="password" placeholder="Enter API key" className="bg-[#05080F] border-gray-700" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone_number">Phone Number</Label>
                <Input id="phone_number" name="phone_number" placeholder="e.g., 6281234567890" className="bg-[#05080F] border-gray-700" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="waba_id">WhatsApp Business Account ID</Label>
                <Input id="waba_id" name="waba_id" placeholder="Enter WABA ID" className="bg-[#05080F] border-gray-700" />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsConfigOpen(false)} className="border-gray-700">
                  Cancel
                </Button>
                <Button type="submit" className="bg-green-500 hover:bg-green-600 text-black">
                  Add Connection
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Detail Modal */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="bg-[#0A1120] border-gray-800 text-gray-100">
            <DialogHeader>
              <DialogTitle>WhatsApp Connection Details</DialogTitle>
              <DialogDescription>View and manage connection details</DialogDescription>
            </DialogHeader>
            {selectedCredential && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Clinic</p>
                    <p className="text-sm text-gray-100">{(selectedCredential as any).clinic?.name || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <Badge className={cn('text-xs', statusColors[selectedCredential.status] || statusColors.active)}>
                      {selectedCredential.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Key Name</p>
                    <p className="text-sm text-gray-100">{selectedCredential.key_name}</p>
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
                    <p className="text-xs text-gray-500">Created</p>
                    <p className="text-sm text-gray-100">
                      {format(new Date(selectedCredential.created_at), 'dd MMM yyyy, HH:mm')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" className="flex-1 border-gray-700">
                    <Settings className="w-4 h-4 mr-2" />
                    Configure
                  </Button>
                  <Button variant="outline" className="flex-1 border-gray-700">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Stats
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ControlRoomLayout>
  )
}