import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { ControlRoomLayout } from '@/components/controlroom/ControlRoomLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import { Search, UserX, UserCheck, ChevronLeft, ChevronRight, Shield, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SuperadminUser {
  id: string; email: string; display_name: string; tier: string; is_active: boolean
  is_locked: boolean; failed_attempts: number; last_login_at: string; created_at: string
}

const tierColors: Record<string, string> = {
  owner: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  operator: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  viewer: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
}

export default function UserManagement() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [tierFilter, setTierFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const { data: users, isLoading } = useQuery<SuperadminUser[]>({
    queryKey: ['controlroom', 'superadmin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('controlroom.superadmin_users').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    staleTime: 60 * 1000,
  })

  const filteredUsers = users?.filter((user) => {
    const matchesSearch = user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.display_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesTier = tierFilter === 'all' || user.tier === tierFilter
    return matchesSearch && matchesTier
  })

  const totalPages = Math.ceil((filteredUsers?.length || 0) / pageSize)
  const paginatedUsers = filteredUsers?.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const deactivateUser = useMutation({
    mutationFn: async (userId: string) => {
      await supabase.from('controlroom.superadmin_users').update({ is_active: false }).eq('id', userId)
    },
    onSuccess: () => { toast({ title: 'User deactivated' }); queryClient.invalidateQueries({ queryKey: ['controlroom', 'superadmin-users'] }) },
    onError: (e: Error) => { toast({ title: 'Error', description: e.message, variant: 'destructive' }) },
  })

  const reactivateUser = useMutation({
    mutationFn: async (userId: string) => {
      await supabase.from('controlroom.superadmin_users').update({ is_active: true, is_locked: false, failed_attempts: 0 }).eq('id', userId)
    },
    onSuccess: () => { toast({ title: 'User reactivated' }); queryClient.invalidateQueries({ queryKey: ['controlroom', 'superadmin-users'] }) },
    onError: (e: Error) => { toast({ title: 'Error', description: e.message, variant: 'destructive' }) },
  })

  const superadmin = { email: 'arya@company.com', displayName: 'Arya Kusuma', tier: 'operator' }

  return (
    <ControlRoomLayout superadmin={superadmin} platformStatus="green" onSearch={(q) => setSearchQuery(q)}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-100">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage superadmin accounts across the platform</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input type="search" placeholder="Search..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#0A1120] border-gray-800 text-gray-100" />
          </div>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-36 bg-[#0A1120] border-gray-800"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="owner">Owner</SelectItem>
              <SelectItem value="operator">Operator</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="bg-[#0A1120] border border-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tier</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Last Login</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Loading...</td></tr>
              ) : paginatedUsers?.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No users found</td></tr>
              ) : paginatedUsers?.map((user) => (
                <tr key={user.id} className="border-b border-gray-800 last:border-0 hover:bg-gray-900/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-cyan-500/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-cyan-500">{user.display_name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-100">{user.display_name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={cn('text-xs', tierColors[user.tier] || tierColors.viewer)}>
                      <Shield className="w-3 h-3 mr-1" />{user.tier}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {user.is_locked ? (
                      <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">
                        <AlertTriangle className="w-3 h-3 mr-1" />Locked
                      </Badge>
                    ) : user.is_active ? (
                      <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-xs">
                        <UserCheck className="w-3 h-3 mr-1" />Active
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20 text-xs">
                        <UserX className="w-3 h-3 mr-1" />Inactive
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-300">{user.last_login_at ? format(new Date(user.last_login_at), 'dd MMM yyyy, HH:mm') : 'Never'}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {user.is_active ? (
                        <Button variant="ghost" size="sm" onClick={() => deactivateUser.mutate(user.id)} className="text-red-400 hover:text-red-300">
                          <UserX className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => reactivateUser.mutate(user.id)} className="text-green-400 hover:text-green-300">
                          <UserCheck className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Page {currentPage} of {totalPages}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="border-gray-700">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="border-gray-700">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </ControlRoomLayout>
  )
}
