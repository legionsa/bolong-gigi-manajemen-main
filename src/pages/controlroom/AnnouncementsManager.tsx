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
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import {
  Megaphone,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Info,
  AlertTriangle,
  AlertCircle,
  Clock,
  Send,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Announcement {
  id: string
  message: string
  type: string
  link: string | null
  target_type: string
  target_clinic_ids: string[] | null
  is_dismissable: boolean
  is_active: boolean
  scheduled_at: string | null
  starts_at: string | null
  expires_at: string | null
  created_by: string
  created_at: string
}

const typeColors: Record<string, string> = {
  info: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  critical: 'bg-red-500/10 text-red-500 border-red-500/20',
}

const typeIcons: Record<string, React.ReactNode> = {
  info: <Info className="w-4 h-4" />,
  warning: <AlertTriangle className="w-4 h-4" />,
  critical: <AlertCircle className="w-4 h-4" />,
}

export default function AnnouncementsManager() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)

  const [newAnnouncement, setNewAnnouncement] = useState({
    message: '',
    type: 'info',
    link: '',
    target_type: 'all',
    is_dismissable: true,
    scheduled_at: '',
    starts_at: '',
    expires_at: '',
  })

  // Fetch announcements
  const { data: announcements, isLoading } = useQuery<Announcement[]>({
    queryKey: ['controlroom', 'announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('controlroom.announcements')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    staleTime: 60 * 1000,
  })

  // Create announcement mutation
  const createAnnouncement = useMutation({
    mutationFn: async (data: typeof newAnnouncement) => {
      const payload = {
        message: data.message,
        type: data.type,
        link: data.link || null,
        target_type: data.target_type,
        target_clinic_ids: data.target_type === 'specific' ? [] : null,
        is_dismissable: data.is_dismissable,
        is_active: true,
        scheduled_at: data.scheduled_at || null,
        starts_at: data.starts_at || null,
        expires_at: data.expires_at || null,
      }

      const { error } = await supabase.from('controlroom.announcements').insert(payload)
      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: 'Announcement created successfully' })
      queryClient.invalidateQueries({ queryKey: ['controlroom', 'announcements'] })
      setIsCreateOpen(false)
      setNewAnnouncement({
        message: '',
        type: 'info',
        link: '',
        target_type: 'all',
        is_dismissable: true,
        scheduled_at: '',
        starts_at: '',
        expires_at: '',
      })
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to create announcement', description: error.message, variant: 'destructive' })
    },
  })

  // Update announcement mutation
  const updateAnnouncement = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Announcement>) => {
      const { error } = await supabase.from('controlroom.announcements').update(updates).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: 'Announcement updated' })
      queryClient.invalidateQueries({ queryKey: ['controlroom', 'announcements'] })
      setIsEditOpen(false)
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update announcement', description: error.message, variant: 'destructive' })
    },
  })

  // Delete announcement mutation
  const deleteAnnouncement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('controlroom.announcements').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: 'Announcement deleted' })
      queryClient.invalidateQueries({ queryKey: ['controlroom', 'announcements'] })
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to delete announcement', description: error.message, variant: 'destructive' })
    },
  })

  // Filter announcements
  const filteredAnnouncements = announcements?.filter((ann) => {
    const matchesSearch = ann.message.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === 'all' || ann.type === typeFilter
    return matchesSearch && matchesType
  })

  const activeCount = announcements?.filter((a) => a.is_active).length || 0

  const handleEdit = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement)
    setIsEditOpen(true)
  }

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
            <h1 className="text-2xl font-semibold text-gray-100">Announcements Manager</h1>
            <p className="text-sm text-gray-500 mt-1">
              Create and manage platform-wide announcements
            </p>
          </div>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-black gap-1.5"
          >
            <Plus className="w-4 h-4" />
            New Announcement
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-[#0A1120] border-gray-800">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-2xl font-semibold text-gray-100">{announcements?.length || 0}</p>
                </div>
                <Megaphone className="w-8 h-8 text-amber-500/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#0A1120] border-gray-800">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active</p>
                  <p className="text-2xl font-semibold text-green-500">{activeCount}</p>
                </div>
                <Info className="w-8 h-8 text-green-500/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#0A1120] border-gray-800">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Scheduled</p>
                  <p className="text-2xl font-semibold text-amber-500">
                    {announcements?.filter((a) => a.scheduled_at && new Date(a.scheduled_at) > new Date()).length || 0}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-amber-500/20" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[#0A1120] border-gray-800">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Critical</p>
                  <p className="text-2xl font-semibold text-red-500">
                    {announcements?.filter((a) => a.type === 'critical' && a.is_active).length || 0}
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-red-500/20" />
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
              placeholder="Search announcements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#0A1120] border-gray-800 text-gray-100"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36 bg-[#0A1120] border-gray-800">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Announcements List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="bg-[#0A1120] border border-gray-800 rounded-lg p-8 text-center text-gray-500">
              Loading...
            </div>
          ) : filteredAnnouncements?.length === 0 ? (
            <div className="bg-[#0A1120] border border-gray-800 rounded-lg p-8 text-center text-gray-500">
              No announcements found
            </div>
          ) : (
            filteredAnnouncements?.map((announcement) => (
              <Card
                key={announcement.id}
                className={cn(
                  'bg-[#0A1120] border-gray-800',
                  !announcement.is_active && 'opacity-60'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                      announcement.type === 'info' && 'bg-blue-500/10 text-blue-500',
                      announcement.type === 'warning' && 'bg-amber-500/10 text-amber-500',
                      announcement.type === 'critical' && 'bg-red-500/10 text-red-500'
                    )}>
                      {typeIcons[announcement.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={cn('text-xs', typeColors[announcement.type])}>
                          {announcement.type}
                        </Badge>
                        {announcement.is_active ? (
                          <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">Active</Badge>
                        ) : (
                          <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20 text-xs">Inactive</Badge>
                        )}
                        {announcement.scheduled_at && new Date(announcement.scheduled_at) > new Date() && (
                          <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-xs">Scheduled</Badge>
                        )}
                      </div>
                      <p className="text-gray-100 mb-2">{announcement.message}</p>
                      {announcement.link && (
                        <p className="text-xs text-gray-500 mb-2">Link: {announcement.link}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Target: {announcement.target_type}</span>
                        <span>Created: {format(new Date(announcement.created_at), 'dd MMM yyyy')}</span>
                        {announcement.expires_at && (
                          <span>Expires: {format(new Date(announcement.expires_at), 'dd MMM yyyy')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(announcement)}
                        className="text-gray-400 hover:text-gray-100"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateAnnouncement.mutate({
                          id: announcement.id,
                          is_active: !announcement.is_active
                        })}
                        className={announcement.is_active ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'}
                      >
                        {announcement.is_active ? <X className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteAnnouncement.mutate(announcement.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Create Announcement Modal */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="bg-[#0A1120] border-gray-800 text-gray-100">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-amber-500" />
                Create Announcement
              </DialogTitle>
              <DialogDescription>Create a new platform announcement</DialogDescription>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                createAnnouncement.mutate(newAnnouncement)
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={newAnnouncement.message}
                  onChange={(e) => setNewAnnouncement((prev) => ({ ...prev, message: e.target.value }))}
                  className="bg-[#05080F] border-gray-700"
                  placeholder="Enter announcement message..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={newAnnouncement.type}
                    onValueChange={(v) => setNewAnnouncement((prev) => ({ ...prev, type: v }))}
                  >
                    <SelectTrigger className="bg-[#05080F] border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target_type">Target</Label>
                  <Select
                    value={newAnnouncement.target_type}
                    onValueChange={(v) => setNewAnnouncement((prev) => ({ ...prev, target_type: v }))}
                  >
                    <SelectTrigger className="bg-[#05080F] border-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clinics</SelectItem>
                      <SelectItem value="specific">Specific Clinics</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="link">Link (optional)</Label>
                <Input
                  id="link"
                  value={newAnnouncement.link}
                  onChange={(e) => setNewAnnouncement((prev) => ({ ...prev, link: e.target.value }))}
                  className="bg-[#05080F] border-gray-700"
                  placeholder="https://..."
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduled_at">Schedule For</Label>
                  <Input
                    id="scheduled_at"
                    type="datetime-local"
                    value={newAnnouncement.scheduled_at}
                    onChange={(e) => setNewAnnouncement((prev) => ({ ...prev, scheduled_at: e.target.value }))}
                    className="bg-[#05080F] border-gray-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="starts_at">Start Date</Label>
                  <Input
                    id="starts_at"
                    type="datetime-local"
                    value={newAnnouncement.starts_at}
                    onChange={(e) => setNewAnnouncement((prev) => ({ ...prev, starts_at: e.target.value }))}
                    className="bg-[#05080F] border-gray-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expires_at">Expiry Date</Label>
                  <Input
                    id="expires_at"
                    type="datetime-local"
                    value={newAnnouncement.expires_at}
                    onChange={(e) => setNewAnnouncement((prev) => ({ ...prev, expires_at: e.target.value }))}
                    className="bg-[#05080F] border-gray-700"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_dismissable"
                  checked={newAnnouncement.is_dismissable}
                  onCheckedChange={(checked) => setNewAnnouncement((prev) => ({ ...prev, is_dismissable: checked }))}
                />
                <Label htmlFor="is_dismissable">User can dismiss</Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="border-gray-700">
                  Cancel
                </Button>
                <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-black">
                  Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Announcement Modal */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="bg-[#0A1120] border-gray-800 text-gray-100">
            <DialogHeader>
              <DialogTitle>Edit Announcement</DialogTitle>
              <DialogDescription>Update announcement details</DialogDescription>
            </DialogHeader>
            {selectedAnnouncement && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  // Extract only what we need for update
                  updateAnnouncement.mutate({
                    id: selectedAnnouncement.id,
                    message: (e.target as any).message.value,
                    type: (e.target as any).type.value,
                    is_active: (e.target as any).is_active.checked,
                  })
                }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    name="message"
                    defaultValue={selectedAnnouncement.message}
                    className="bg-[#05080F] border-gray-700"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select name="type" defaultValue={selectedAnnouncement.type}>
                      <SelectTrigger className="bg-[#05080F] border-gray-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <Switch id="is_active" name="is_active" defaultChecked={selectedAnnouncement.is_active} />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="border-gray-700">
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-black">
                    Save Changes
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ControlRoomLayout>
  )
}