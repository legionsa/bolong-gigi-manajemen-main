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
  Building2,
  Search,
  Plus,
  MoreVertical,
  Edit,
  UserX,
  UserCheck,
  Key,
  LogOut,
  Eye,
  MapPin,
  Phone,
  Mail,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Clinic {
  id: string
  name: string
  slug: string
  city: string
  province: string
  address: string
  phone: string
  email: string
  license_number: string
  bpjs_faskes_id: string
  plan_tier: string
  status: string
  trial_ends_at: string
  created_at: string
}

const statusColors: Record<string, string> = {
  trial: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  active: 'bg-green-500/10 text-green-500 border-green-500/20',
  suspended: 'bg-red-500/10 text-red-500 border-red-500/20',
  churned: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
}

const planColors: Record<string, string> = {
  starter: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  growth: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  enterprise: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
}

export default function ClinicRegistry() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null)
  const [isOnboardModalOpen, setIsOnboardModalOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const pageSize = 10

  // Fetch clinics
  const { data: clinics, isLoading } = useQuery<Clinic[]>({
    queryKey: ['controlroom', 'clinics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('controlroom.clinics')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    staleTime: 60 * 1000,
  })

  // Filter clinics
  const filteredClinics = clinics?.filter((clinic) => {
    const matchesSearch =
      clinic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clinic.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      clinic.email?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || clinic.status === statusFilter
    const matchesPlan = planFilter === 'all' || clinic.plan_tier === planFilter

    return matchesSearch && matchesStatus && matchesPlan
  })

  // Pagination
  const totalPages = Math.ceil((filteredClinics?.length || 0) / pageSize)
  const paginatedClinics = filteredClinics?.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  // Onboard clinic mutation
  const onboardClinic = useMutation({
    mutationFn: async (data: {
      name: string
      city: string
      province: string
      email: string
      phone: string
      license_number: string
      plan_tier: string
    }) => {
      const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

      const { data: clinic, error } = await supabase
        .from('controlroom.clinics')
        .insert({
          name: data.name,
          slug,
          city: data.city,
          province: data.province,
          email: data.email,
          phone: data.phone,
          license_number: data.license_number,
          plan_tier: data.plan_tier,
          status: 'trial',
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single()

      if (error) throw error
      return clinic
    },
    onSuccess: () => {
      toast({ title: 'Clinic onboarded successfully' })
      queryClient.invalidateQueries({ queryKey: ['controlroom', 'clinics'] })
      setIsOnboardModalOpen(false)
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to onboard clinic', description: error.message, variant: 'destructive' })
    },
  })

  // Update clinic status mutation
  const updateClinicStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Partial<Clinic> = { status }
      if (status === 'suspended') {
        updates.suspended_at = new Date().toISOString()
      }
      if (status === 'active') {
        updates.activated_at = new Date().toISOString()
      }
      if (status === 'churned') {
        updates.churned_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('controlroom.clinics')
        .update(updates)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: 'Clinic status updated' })
      queryClient.invalidateQueries({ queryKey: ['controlroom', 'clinics'] })
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update status', description: error.message, variant: 'destructive' })
    },
  })

  const handleViewClinic = (clinic: Clinic) => {
    setSelectedClinic(clinic)
    setIsDetailOpen(true)
  }

  const superadmin = {
    email: 'arya@company.com',
    displayName: 'Arya Kusuma',
    tier: 'operator',
  }

  return (
    <ControlRoomLayout
      superadmin={superadmin}
      platformStatus="green"
      onSearch={(q) => setSearchQuery(q)}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-100">Clinic Registry</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage all registered dental clinics on the platform
            </p>
          </div>
          <Button
            onClick={() => setIsOnboardModalOpen(true)}
            className="bg-amber-500 hover:bg-amber-600 text-black gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Onboard Clinic
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Search clinics, city, or email..."
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
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="churned">Churned</SelectItem>
            </SelectContent>
          </Select>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-36 bg-[#0A1120] border-gray-800">
              <SelectValue placeholder="Plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="starter">Starter</SelectItem>
              <SelectItem value="growth">Growth</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {['all', 'trial', 'active', 'suspended'].map((status) => {
            const count = clinics?.filter((c) => status === 'all' || c.status === status).length || 0
            return (
              <div
                key={status}
                className={cn(
                  'bg-[#0A1120] border border-gray-800 rounded-lg p-4 cursor-pointer transition-colors',
                  statusFilter === status && 'border-amber-500/50'
                )}
                onClick={() => setStatusFilter(status === statusFilter ? 'all' : status)}
              >
                <div className="text-2xl font-semibold text-gray-100">{count}</div>
                <div className="text-sm text-gray-500 capitalize">{status === 'all' ? 'Total Clinics' : status}</div>
              </div>
            )
          })}
        </div>

        {/* Clinic List */}
        <div className="bg-[#0A1120] border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Clinic</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Location</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Plan</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Registered</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">Loading...</td>
                </tr>
              ) : paginatedClinics?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No clinics found</td>
                </tr>
              ) : (
                paginatedClinics?.map((clinic) => (
                  <tr key={clinic.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-900/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-amber-500/10 rounded-lg flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-amber-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-100">{clinic.name}</p>
                          <p className="text-xs text-gray-500">{clinic.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-300">{clinic.city}</p>
                      <p className="text-xs text-gray-500">{clinic.province}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn('text-xs', planColors[clinic.plan_tier] || planColors.starter)}>
                        {clinic.plan_tier}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn('text-xs', statusColors[clinic.status] || statusColors.trial)}>
                        {clinic.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-300">{format(new Date(clinic.created_at), 'dd MMM yyyy')}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewClinic(clinic)}
                          className="text-gray-400 hover:text-gray-100"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {clinic.status === 'suspended' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateClinicStatus.mutate({ id: clinic.id, status: 'active' })}
                            className="text-green-400 hover:text-green-300"
                          >
                            <UserCheck className="w-4 h-4" />
                          </Button>
                        )}
                        {clinic.status !== 'suspended' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateClinicStatus.mutate({ id: clinic.id, status: 'suspended' })}
                            className="text-red-400 hover:text-red-300"
                          >
                            <UserX className="w-4 h-4" />
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredClinics?.length || 0)} of {filteredClinics?.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="border-gray-700 text-gray-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-300">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="border-gray-700 text-gray-300"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Onboard Clinic Modal */}
      <Dialog open={isOnboardModalOpen} onOpenChange={setIsOnboardModalOpen}>
        <DialogContent className="bg-[#0A1120] border-gray-800 text-gray-100">
          <DialogHeader>
            <DialogTitle>Onboard New Clinic</DialogTitle>
            <DialogDescription>Register a new dental clinic on the platform</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              onboardClinic.mutate({
                name: formData.get('name') as string,
                city: formData.get('city') as string,
                province: formData.get('province') as string,
                email: formData.get('email') as string,
                phone: formData.get('phone') as string,
                license_number: formData.get('license_number') as string,
                plan_tier: formData.get('plan_tier') as string,
              })
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="name">Clinic Name</Label>
              <Input id="name" name="name" required className="bg-[#05080F] border-gray-700" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" required className="bg-[#05080F] border-gray-700" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="province">Province</Label>
                <Input id="province" name="province" required className="bg-[#05080F] border-gray-700" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required className="bg-[#05080F] border-gray-700" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" required className="bg-[#05080F] border-gray-700" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="license_number">SIK / License Number</Label>
              <Input id="license_number" name="license_number" className="bg-[#05080F] border-gray-700" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan_tier">Plan Tier</Label>
              <Select name="plan_tier" defaultValue="starter">
                <SelectTrigger className="bg-[#05080F] border-gray-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOnboardModalOpen(false)} className="border-gray-700">
                Cancel
              </Button>
              <Button type="submit" disabled={onboardClinic.isPending} className="bg-amber-500 hover:bg-amber-600 text-black">
                {onboardClinic.isPending ? 'Creating...' : 'Create Clinic'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </ControlRoomLayout>
  )
}