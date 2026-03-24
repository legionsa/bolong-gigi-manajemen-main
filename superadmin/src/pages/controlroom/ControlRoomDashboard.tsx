import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { ControlRoomLayout, MetricCard, AlertItem } from '@/components/controlroom/ControlRoomLayout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import {
  Building2,
  Users,
  Activity,
  MessageSquare,
  AlertCircle,
  Clock,
  Database,
  DollarSign,
  CheckCircle,
  RefreshCw,
} from 'lucide-react'

interface ClinicStats {
  status: string
  count: number
}

interface ServiceHealth {
  service: string
  status: 'operational' | 'degraded' | 'down'
  latency?: string
  uptime?: string
  lastChecked: string
}

export default function ControlRoomDashboard() {
  // Fetch clinic stats
  const { data: clinicStats } = useQuery<ClinicStats[]>({
    queryKey: ['controlroom', 'clinic-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('controlroom.clinics')
        .select('status')

      if (error) throw error

      const stats = (data || []).reduce((acc: Record<string, number>, clinic) => {
        acc[clinic.status] = (acc[clinic.status] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      return Object.entries(stats).map(([status, count]) => ({ status, count }))
    },
    staleTime: 60 * 1000,
  })

  // Fetch recent critical alerts
  const { data: recentAlerts } = useQuery({
    queryKey: ['controlroom', 'recent-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('controlroom.audit_log')
        .select('*')
        .eq('severity', 'critical')
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      return data
    },
    staleTime: 30 * 1000,
  })

  // Mock service health data
  const serviceHealth: ServiceHealth[] = [
    { service: 'Supabase Database', status: 'operational', latency: '12ms', uptime: '99.94%', lastChecked: '30s ago' },
    { service: 'Supabase Auth', status: 'operational', uptime: '99.99%', lastChecked: '30s ago' },
    { service: 'Supabase Storage', status: 'operational', uptime: '99.98%', lastChecked: '30s ago' },
    { service: 'WhatsApp Cloud API', status: 'operational', lastChecked: '30s ago' },
    { service: 'Midtrans', status: 'operational', lastChecked: '30s ago' },
    { service: 'Resend (Email)', status: 'operational', lastChecked: '60s ago' },
    { service: 'Vercel Edge', status: 'operational', lastChecked: '30s ago' },
  ]

  // Calculate totals
  const totalClinics = clinicStats?.reduce((sum, s) => sum + s.count, 0) || 0
  const activeClinics = clinicStats?.find(s => s.status === 'active')?.count || 0
  const trialClinics = clinicStats?.find(s => s.status === 'trial')?.count || 0
  const suspendedClinics = clinicStats?.find(s => s.status === 'suspended')?.count || 0

  const superadmin = {
    email: 'arya@company.com',
    displayName: 'Arya Kusuma',
    tier: 'operator',
  }

  const handleLogout = () => console.log('Logout')
  const handleSearch = (query: string) => console.log('Search:', query)

  const platformStatus = serviceHealth.some(s => s.status === 'down')
    ? 'red'
    : serviceHealth.some(s => s.status === 'degraded')
    ? 'amber'
    : 'green'

  return (
    <ControlRoomLayout
      superadmin={superadmin}
      onLogout={handleLogout}
      platformStatus={platformStatus}
      onSearch={handleSearch}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-100">Command Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time overview of the DentiCare Pro platform
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Active Clinics"
            value={activeClinics}
            change="+3 this week"
            trend="up"
            icon={<Building2 className="w-5 h-5" />}
          />
          <MetricCard
            title="Trial Clinics"
            value={trialClinics}
            change="2 expiring soon"
            trend="neutral"
            icon={<Clock className="w-5 h-5" />}
          />
          <MetricCard
            title="Active Users (24h)"
            value={247}
            change="+12% vs avg"
            trend="up"
            icon={<Users className="w-5 h-5" />}
          />
          <MetricCard
            title="Appointments Today"
            value={384}
            change="vs 342 avg"
            trend="up"
            icon={<Activity className="w-5 h-5" />}
          />
        </div>

        {/* Second Row Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Storage Used"
            value="47.3 GB"
            change="of 500 GB"
            trend="neutral"
            icon={<Database className="w-5 h-5" />}
          />
          <MetricCard
            title="This Month Cost"
            value="$311"
            change="$580 budget"
            trend="neutral"
            icon={<DollarSign className="w-5 h-5" />}
          />
          <MetricCard
            title="WhatsApp Delivery"
            value="97.3%"
            change="+0.4%"
            trend="up"
            icon={<MessageSquare className="w-5 h-5" />}
          />
          <MetricCard
            title="Error Rate"
            value="0.12%"
            change="-0.03%"
            trend="up"
            icon={<AlertCircle className="w-5 h-5" />}
          />
        </div>

        {/* Service Health & Alerts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Service Health */}
          <div className="lg:col-span-2 bg-[#0A1120] border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-100 flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-500" />
                Service Health
              </h2>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-100">
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
            </div>

            <div className="space-y-3">
              {serviceHealth.map((service) => (
                <div
                  key={service.service}
                  className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        service.status === 'operational'
                          ? 'bg-green-500'
                          : service.status === 'degraded'
                          ? 'bg-amber-500'
                          : 'bg-red-500'
                      }`}
                    />
                    <span className="text-sm text-gray-100">{service.service}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {service.latency && <span>{service.latency}</span>}
                    {service.uptime && <span>Uptime: {service.uptime}</span>}
                    <span>{service.lastChecked}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="bg-[#0A1120] border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-100 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Recent Alerts
              </h2>
              <Badge variant="outline" className="text-xs border-amber-500 text-amber-500">
                {recentAlerts?.length || 0} critical
              </Badge>
            </div>

            <div className="space-y-3">
              {recentAlerts && recentAlerts.length > 0 ? (
                recentAlerts.map((alert: any) => (
                  <AlertItem
                    key={alert.id}
                    severity={alert.severity as 'info' | 'warning' | 'critical'}
                    message={alert.action}
                    time={format(new Date(alert.created_at), 'HH:mm:ss')}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm">No critical alerts</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pending Actions */}
        <div className="bg-[#0A1120] border border-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-100 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              Pending Actions
            </h2>
            <Badge variant="outline" className="text-xs border-orange-500 text-orange-500">
              4 items
            </Badge>
          </div>

          <div className="space-y-2">
            {[
              { id: 1, message: 'Klinik Maju Sehat - BPJS credentials expiring in 7 days', type: 'warning', action: 'Renew' },
              { id: 2, message: '3 clinics have users with no MFA enrolled', type: 'warning', action: 'View' },
              { id: 3, message: 'New clinic registration pending review: Klinik Idaman', type: 'info', action: 'Review' },
              { id: 4, message: 'Storage alert: Klinik A approaching 80% limit', type: 'warning', action: 'Manage' },
            ].map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-[#05080F] rounded-lg border border-gray-800"
              >
                <div className="flex items-center gap-3">
                  {item.type === 'warning' ? (
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-cyan-500" />
                  )}
                  <span className="text-sm text-gray-300">{item.message}</span>
                </div>
                <Button variant="outline" size="sm" className="border-gray-700 text-gray-300 hover:bg-gray-800">
                  {item.action}
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Stats Footer */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-[#0A1120] border border-gray-800 rounded-lg p-3">
            <div className="text-2xl font-semibold text-green-400">{activeClinics}</div>
            <div className="text-xs text-gray-500">Active</div>
          </div>
          <div className="bg-[#0A1120] border border-gray-800 rounded-lg p-3">
            <div className="text-2xl font-semibold text-amber-400">{trialClinics}</div>
            <div className="text-xs text-gray-500">Trial</div>
          </div>
          <div className="bg-[#0A1120] border border-gray-800 rounded-lg p-3">
            <div className="text-2xl font-semibold text-red-400">{suspendedClinics}</div>
            <div className="text-xs text-gray-500">Suspended</div>
          </div>
          <div className="bg-[#0A1120] border border-gray-800 rounded-lg p-3">
            <div className="text-2xl font-semibold text-gray-100">{totalClinics}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
        </div>
      </div>
    </ControlRoomLayout>
  )
}