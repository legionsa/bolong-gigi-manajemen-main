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
  AlertTriangle,
  Search,
  Plus,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  RefreshCw,
  Activity,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Incident {
  id: string
  service: string
  status: string
  title: string
  description: string
  updates: any[]
  started_at: string
  resolved_at: string | null
  created_by: string
  created_at: string
}

const statusColors: Record<string, string> = {
  investigating: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  identified: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  monitoring: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  resolved: 'bg-green-500/10 text-green-500 border-green-500/20',
}

const statusIcons: Record<string, React.ReactNode> = {
  investigating: <AlertCircle className="w-4 h-4" />,
  identified: <AlertTriangle className="w-4 h-4" />,
  monitoring: <Clock className="w-4 h-4" />,
  resolved: <CheckCircle className="w-4 h-4" />,
}

const serviceColors: Record<string, string> = {
  whatsapp: 'bg-green-500/10 text-green-500 border-green-500/20',
  sms: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  email: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  api: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  database: 'bg-red-500/10 text-red-500 border-red-500/20',
  auth: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  booking: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  billing: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
}

export default function IncidentManagement() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [serviceFilter, setServiceFilter] = useState<string>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [newUpdate, setNewUpdate] = useState('')

  const [newIncident, setNewIncident] = useState({
    service: '',
    title: '',
    description: '',
    status: 'investigating',
  })

  // Fetch incidents
  const { data: incidents, isLoading } = useQuery<Incident[]>({
    queryKey: ['controlroom', 'incidents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('controlroom.incidents')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    staleTime: 60 * 1000,
  })

  // Active incidents count
  const activeIncidents = incidents?.filter((i) => i.status !== 'resolved').length || 0

  // Create incident mutation
  const createIncident = useMutation({
    mutationFn: async (data: typeof newIncident) => {
      const { error } = await supabase.from('controlroom.incidents').insert({
        service: data.service,
        title: data.title,
        description: data.description,
        status: data.status,
        updates: [],
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: 'Incident created successfully' })
      queryClient.invalidateQueries({ queryKey: ['controlroom', 'incidents'] })
      setIsCreateOpen(false)
      setNewIncident({ service: '', title: '', description: '', status: 'investigating' })
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create incident', description: error.message, variant: 'destructive' })
    },
  })

  // Update incident status mutation
  const updateIncidentStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Partial<Incident> = { status }
      if (status === 'resolved') {
        updates.resolved_at = new Date().toISOString()
      }

      const { error } = await supabase.from('controlroom.incidents').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: 'Incident updated' })
      queryClient.invalidateQueries({ queryKey: ['controlroom', 'incidents'] })
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update incident', description: error.message, variant: 'destructive' })
    },
  })

  // Add update mutation
  const addUpdate = useMutation({
    mutationFn: async ({ id, update }: { id: string; update: string }) => {
      const incident = incidents?.find((i) => i.id === id)
      if (!incident) throw new Error('Incident not found')

      const newUpdateObj = {
        message: update,
        timestamp: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('controlroom.incidents')
        .update({ updates: [...(incident.updates || []), newUpdateObj] })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: 'Update added' })
      queryClient.invalidateQueries({ queryKey: ['controlroom', 'incidents'] })
      setNewUpdate('')
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to add update', description: error.message, variant: 'destructive' })
    },
  })

  // Filter incidents
  const filteredIncidents = incidents?.filter((incident) => {
    const matchesSearch =
      incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      incident.description.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || incident.status === statusFilter
    const matchesService = serviceFilter === 'all' || incident.service === serviceFilter

    return matchesSearch && matchesStatus && matchesService
  })

  const handleViewDetail = (incident: Incident) => {
    setSelectedIncident(incident)
    setIsDetailOpen(true)
  }

  const handleAddUpdate = () => {
    if (selectedIncident && newUpdate.trim()) {
      addUpdate.mutate({ id: selectedIncident.id, update: newUpdate })
    }
  }

  const superadmin = {
    email: 'arya@company.com',
    displayName: 'Arya Kusuma',
    tier: 'operator',
  }

  return (
    <ControlRoomLayout superadmin={superadmin} platformStatus={activeIncidents > 0 ? 'red' : 'green'}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-100">Incident Management</h1>
            <p className="text-sm text-gray-500 mt-1">
              Track and manage platform incidents and outages
            </p>
          </div>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-red-500 hover:bg-red-600 text-white gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Report Incident
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4">
          <Card
            className={cn(
              'bg-[#0A1120] border-gray-800 cursor-pointer transition-colors',
              statusFilter === 'all' && 'border-amber-500/50'
            )}
            onClick={() => setStatusFilter('all')}
          >
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-2xl font-semibold text-gray-100">{incidents?.length || 0}</p>
                </div>
                <Activity className="w-8 h-8 text-gray-500/20" />
              </div>
            </CardContent>
          </Card>
          {['investigating', 'identified', 'monitoring', 'resolved'].map((status) => (
            <Card
              key={status}
              className={cn(
                'bg-[#0A1120] border-gray-800 cursor-pointer transition-colors',
                statusFilter === status && 'border-amber-500/50'
              )}
              onClick={() => setStatusFilter(status === statusFilter ? 'all' : status)}
            >
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 capitalize">{status}</p>
                    <p className="text-2xl font-semibold text-gray-100">
                      {incidents?.filter((i) => i.status === status).length || 0}
                    </p>
                  </div>
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', statusColors[status].split(' ')[0])}>
                    {statusIcons[status]}
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
              placeholder="Search incidents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#0A1120] border-gray-800 text-gray-100"
            />
          </div>
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className="w-36 bg-[#0A1120] border-gray-800">
              <SelectValue placeholder="Service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="api">API</SelectItem>
              <SelectItem value="database">Database</SelectItem>
              <SelectItem value="auth">Auth</SelectItem>
              <SelectItem value="booking">Booking</SelectItem>
              <SelectItem value="billing">Billing</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Incidents List */}
        <div className="bg-[#0A1120] border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Incident</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Service</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Started</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Duration</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                </tr>
              ) : filteredIncidents?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No incidents found</td>
                </tr>
              ) : (
                filteredIncidents?.map((incident) => {
                  const duration = incident.status === 'resolved' && incident.resolved_at
                    ? Math.round((new Date(incident.resolved_at).getTime() - new Date(incident.started_at).getTime()) / (1000 * 60))
                    : Math.round((Date.now() - new Date(incident.started_at).getTime()) / (1000 * 60))

                  return (
                    <tr key={incident.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-900/50">
                      <td className="px-4 py-3">
                        <Badge className={cn('text-xs', statusColors[incident.status])}>
                          {statusIcons[incident.status]}
                          <span className="ml-1">{incident.status}</span>
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-100">{incident.title}</p>
                        <p className="text-xs text-gray-500 truncate max-w-xs">{incident.description}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={cn('text-xs', serviceColors[incident.service] || 'bg-gray-500/10 text-gray-500 border-gray-500/20')}>
                          {incident.service}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-300">
                          {format(new Date(incident.started_at), 'dd MMM yyyy, HH:mm')}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className={cn('text-sm', incident.status === 'resolved' ? 'text-green-400' : 'text-amber-400')}>
                          {duration < 60 ? `${duration}m` : `${Math.round(duration / 60)}h`}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetail(incident)}
                            className="text-gray-400 hover:text-gray-100"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {incident.status !== 'resolved' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateIncidentStatus.mutate({ id: incident.id, status: 'resolved' })}
                              className="text-green-400 hover:text-green-300"
                              title="Resolve"
                            >
                              <CheckCircle className="w-4 h-4" />
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

        {/* Create Incident Modal */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="bg-[#0A1120] border-gray-800 text-gray-100">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                Report New Incident
              </DialogTitle>
              <DialogDescription>Create a new incident to track and communicate an issue</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                createIncident.mutate(newIncident)
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="service">Affected Service</Label>
                <Select
                  value={newIncident.service}
                  onValueChange={(v) => setNewIncident((prev) => ({ ...prev, service: v }))}
                >
                  <SelectTrigger className="bg-[#05080F] border-gray-700">
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="api">API</SelectItem>
                    <SelectItem value="database">Database</SelectItem>
                    <SelectItem value="auth">Auth</SelectItem>
                    <SelectItem value="booking">Booking</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newIncident.title}
                  onChange={(e) => setNewIncident((prev) => ({ ...prev, title: e.target.value }))}
                  className="bg-[#05080F] border-gray-700"
                  placeholder="Brief description of the incident"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newIncident.description}
                  onChange={(e) => setNewIncident((prev) => ({ ...prev, description: e.target.value }))}
                  className="bg-[#05080F] border-gray-700"
                  placeholder="Detailed description of the issue..."
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="border-gray-700">
                  Cancel
                </Button>
                <Button type="submit" className="bg-red-500 hover:bg-red-600 text-white">
                  Create Incident
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Incident Detail Modal */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="bg-[#0A1120] border-gray-800 text-gray-100 max-w-2xl">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>{selectedIncident?.title}</DialogTitle>
                {selectedIncident && (
                  <Badge className={cn('text-xs', statusColors[selectedIncident.status])}>
                    {statusIcons[selectedIncident.status as keyof typeof statusIcons]}
                    <span className="ml-1">{selectedIncident.status}</span>
                  </Badge>
                )}
              </div>
              <DialogDescription>Incident Details and Updates</DialogDescription>
            </DialogHeader>
            {selectedIncident && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-[#05080F] rounded-lg border border-gray-800">
                  <div>
                    <p className="text-xs text-gray-500">Service</p>
                    <Badge className={cn('text-xs mt-1', serviceColors[selectedIncident.service] || 'bg-gray-500/10 text-gray-500 border-gray-500/20')}>
                      {selectedIncident.service}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Started</p>
                    <p className="text-sm text-gray-100">
                      {format(new Date(selectedIncident.started_at), 'dd MMM yyyy, HH:mm')}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Description</p>
                    <p className="text-sm text-gray-100">{selectedIncident.description}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-100 mb-2">Updates</p>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedIncident.updates?.length > 0 ? (
                      selectedIncident.updates.map((update: any, index: number) => (
                        <div key={index} className="p-3 bg-[#05080F] rounded-lg border border-gray-800">
                          <p className="text-sm text-gray-100">{update.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {format(new Date(update.timestamp), 'dd MMM yyyy, HH:mm')}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No updates yet</p>
                    )}
                  </div>
                </div>

                {selectedIncident.status !== 'resolved' && (
                  <div className="flex gap-2">
                    <Input
                      value={newUpdate}
                      onChange={(e) => setNewUpdate(e.target.value)}
                      placeholder="Add an update..."
                      className="bg-[#05080F] border-gray-700"
                    />
                    <Button onClick={handleAddUpdate} className="bg-amber-500 hover:bg-amber-600 text-black">
                      Add Update
                    </Button>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t border-gray-800">
                  {selectedIncident.status === 'investigating' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateIncidentStatus.mutate({ id: selectedIncident.id, status: 'identified' })}
                      className="border-gray-700"
                    >
                      Mark as Identified
                    </Button>
                  )}
                  {selectedIncident.status === 'identified' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateIncidentStatus.mutate({ id: selectedIncident.id, status: 'monitoring' })}
                      className="border-gray-700"
                    >
                      Start Monitoring
                    </Button>
                  )}
                  {selectedIncident.status !== 'resolved' && (
                    <Button
                      size="sm"
                      onClick={() => updateIncidentStatus.mutate({ id: selectedIncident.id, status: 'resolved' })}
                      className="bg-green-500 hover:bg-green-600 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Resolve
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ControlRoomLayout>
  )
}