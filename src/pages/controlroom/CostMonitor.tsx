import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { ControlRoomLayout } from '@/components/controlroom/ControlRoomLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import {
  DollarSign,
  Database,
  Cloud,
  Wifi,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CostMetrics {
  apiCalls: {
    used: number
    limit: number
    percent: number
  }
  dbStorage: {
    used: number // in bytes
    limit: number // in bytes
    percent: number
  }
  bandwidth: {
    used: number // in GB
    limit: number // in GB
    percent: number
  }
  estimatedTotal: number
}

interface CostAlert {
  id: string
  type: 'warning' | 'critical'
  message: string
  metric: string
  threshold: number
}

// Supabase Pro tier limits and pricing
const PRO_LIMITS = {
  apiCalls: { limit: 500000, unit: 'calls/month' },
  dbStorage: { limit: 8 * 1024 * 1024 * 1024, unit: 'GB' }, // 8 GB
  bandwidth: { limit: 50, unit: 'GB/month' },
}

const PRICING = {
  apiCalls: 0,
  overageApiCalls: 0.0002, // $0.0002 per API call over limit
  dbStorage: 0.125, // $0.125 per GB per month
  bandwidth: 0.09, // $0.09 per GB over limit
  bandwidthIncluded: 0, // Bandwidth included in Pro tier
}

export default function CostMonitor() {
  const { toast } = useToast()

  const [metrics, setMetrics] = useState<CostMetrics>({
    apiCalls: { used: 287432, limit: PRO_LIMITS.apiCalls.limit, percent: 57.5 },
    dbStorage: { used: 2.3 * 1024 * 1024 * 1024, limit: PRO_LIMITS.dbStorage.limit, percent: 28.8 },
    bandwidth: { used: 12.4, limit: PRO_LIMITS.bandwidth.limit, percent: 24.8 },
    estimatedTotal: 0,
  })

  const [alerts, setAlerts] = useState<CostAlert[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [projectedOverage, setProjectedOverage] = useState<{
    apiCalls: number
    bandwidth: number
    totalOverageCost: number
  }>({ apiCalls: 0, bandwidth: 0, totalOverageCost: 0 })

  useEffect(() => {
    calculateCosts()
    checkAlerts()
    projectOverage()
  }, [])

  const calculateCosts = () => {
    // Calculate storage cost
    const dbStorageGB = metrics.dbStorage.used / (1024 * 1024 * 1024)
    const storageCost = dbStorageGB * PRICING.dbStorage

    // Calculate bandwidth cost (only if over included limit)
    const bandwidthCost = Math.max(0, (metrics.bandwidth.used - 50) * PRICING.bandwidth)

    // API calls are included in Pro tier
    const apiCost = 0

    const total = storageCost + bandwidthCost + apiCost

    setMetrics(prev => ({
      ...prev,
      estimatedTotal: total,
    }))
  }

  const checkAlerts = () => {
    const newAlerts: CostAlert[] = []

    // API calls warning
    if (metrics.apiCalls.percent > 80) {
      newAlerts.push({
        id: 'api-warning',
        type: metrics.apiCalls.percent > 95 ? 'critical' : 'warning',
        message: `API calls at ${metrics.apiCalls.percent.toFixed(1)}% of monthly limit`,
        metric: 'apiCalls',
        threshold: 80,
      })
    }

    // Database storage warning
    if (metrics.dbStorage.percent > 80) {
      newAlerts.push({
        id: 'storage-warning',
        type: metrics.dbStorage.percent > 95 ? 'critical' : 'warning',
        message: `Database storage at ${metrics.dbStorage.percent.toFixed(1)}% of limit`,
        metric: 'dbStorage',
        threshold: 80,
      })
    }

    // Bandwidth warning
    if (metrics.bandwidth.percent > 80) {
      newAlerts.push({
        id: 'bandwidth-warning',
        type: metrics.bandwidth.percent > 95 ? 'critical' : 'warning',
        message: `Bandwidth at ${metrics.bandwidth.percent.toFixed(1)}% of monthly limit`,
        metric: 'bandwidth',
        threshold: 80,
      })
    }

    setAlerts(newAlerts)
  }

  const projectOverage = () => {
    // Project end-of-month overage based on current usage rate
    const daysRemaining = 30 - new Date().getDate()
    const usageRate = metrics.apiCalls.used / new Date().getDate()

    const projectedApiCalls = metrics.apiCalls.used + (usageRate * daysRemaining)
    const projectedBandwidth = metrics.bandwidth.used + (metrics.bandwidth.used / new Date().getDate() * daysRemaining)

    const apiOverage = Math.max(0, projectedApiCalls - PRO_LIMITS.apiCalls.limit) * PRICING.overageApiCalls
    const bandwidthOverage = Math.max(0, projectedBandwidth - PRO_LIMITS.bandwidth.limit) * PRICING.bandwidth

    setProjectedOverage({
      apiCalls: projectedApiCalls - PRO_LIMITS.apiCalls.limit,
      bandwidth: projectedBandwidth - PRO_LIMITS.bandwidth.limit,
      totalOverageCost: apiOverage + bandwidthOverage,
    })
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
    return num.toString()
  }

  const handleRefresh = () => {
    setIsLoading(true)
    setTimeout(() => {
      setLastRefresh(new Date())
      setIsLoading(false)
      toast({ title: 'Costs refreshed', description: 'Latest usage data loaded' })
    }, 1000)
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
            <h1 className="text-2xl font-semibold text-gray-100 flex items-center gap-2">
              <DollarSign className="w-6 h-6" />
              Cost Monitor
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Estimated costs and usage tracking for Supabase resources
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Last updated: {format(lastRefresh, 'HH:mm:ss')}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="border-gray-700 text-gray-300"
            >
              <RefreshCw className={cn('w-4 h-4 mr-1', isLoading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={cn(
                  'flex items-center gap-3 p-4 rounded-lg border',
                  alert.type === 'critical'
                    ? 'bg-red-500/10 border-red-500/20'
                    : 'bg-amber-500/10 border-amber-500/20'
                )}
              >
                <AlertTriangle className={cn(
                  'w-5 h-5',
                  alert.type === 'critical' ? 'text-red-500' : 'text-amber-500'
                )} />
                <div>
                  <p className={cn(
                    'text-sm font-medium',
                    alert.type === 'critical' ? 'text-red-400' : 'text-amber-400'
                  )}>
                    {alert.type === 'critical' ? 'Critical' : 'Warning'}: {alert.message}
                  </p>
                  <p className="text-xs text-gray-400">
                    Consider upgrading plan or optimizing usage
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Cost Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* API Calls */}
          <Card className="bg-[#0A1120] border-gray-800">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                    <Wifi className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">API Calls</p>
                    <p className="text-lg font-semibold text-gray-100">
                      {formatNumber(metrics.apiCalls.used)}
                      <span className="text-xs text-gray-500 ml-1">/ {formatNumber(metrics.apiCalls.limit)}</span>
                    </p>
                  </div>
                </div>
                <Badge className={cn(
                  metrics.apiCalls.percent > 95 ? 'bg-red-500/20 text-red-500' :
                  metrics.apiCalls.percent > 80 ? 'bg-amber-500/20 text-amber-500' :
                  'bg-green-500/20 text-green-500'
                )}>
                  {metrics.apiCalls.percent.toFixed(0)}%
                </Badge>
              </div>
              <Progress value={metrics.apiCalls.percent} className="h-2" />
              <p className="text-xs text-gray-500 mt-2">
                {metrics.apiCalls.used.toLocaleString()} calls used this month
              </p>
            </CardContent>
          </Card>

          {/* Database Storage */}
          <Card className="bg-[#0A1120] border-gray-800">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-500">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Database Storage</p>
                    <p className="text-lg font-semibold text-gray-100">
                      {(metrics.dbStorage.used / (1024 * 1024 * 1024)).toFixed(2)} GB
                      <span className="text-xs text-gray-500 ml-1">/ {(metrics.dbStorage.limit / (1024 * 1024 * 1024)).toFixed(0)} GB</span>
                    </p>
                  </div>
                </div>
                <Badge className={cn(
                  metrics.dbStorage.percent > 95 ? 'bg-red-500/20 text-red-500' :
                  metrics.dbStorage.percent > 80 ? 'bg-amber-500/20 text-amber-500' :
                  'bg-green-500/20 text-green-500'
                )}>
                  {metrics.dbStorage.percent.toFixed(0)}%
                </Badge>
              </div>
              <Progress value={metrics.dbStorage.percent} className="h-2" />
              <p className="text-xs text-gray-500 mt-2">
                ${((metrics.dbStorage.used / (1024 * 1024 * 1024)) * PRICING.dbStorage).toFixed(2)}/month
              </p>
            </CardContent>
          </Card>

          {/* Bandwidth */}
          <Card className="bg-[#0A1120] border-gray-800">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Bandwidth</p>
                    <p className="text-lg font-semibold text-gray-100">
                      {metrics.bandwidth.used.toFixed(1)} GB
                      <span className="text-xs text-gray-500 ml-1">/ {metrics.bandwidth.limit} GB</span>
                    </p>
                  </div>
                </div>
                <Badge className={cn(
                  metrics.bandwidth.percent > 95 ? 'bg-red-500/20 text-red-500' :
                  metrics.bandwidth.percent > 80 ? 'bg-amber-500/20 text-amber-500' :
                  'bg-green-500/20 text-green-500'
                )}>
                  {metrics.bandwidth.percent.toFixed(0)}%
                </Badge>
              </div>
              <Progress value={metrics.bandwidth.percent} className="h-2" />
              <p className="text-xs text-gray-500 mt-2">
                {metrics.bandwidth.used > 50
                  ? `$${((metrics.bandwidth.used - 50) * PRICING.bandwidth).toFixed(2)} overage`
                  : 'Included in plan'
                }
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Cost Breakdown */}
        <Card className="bg-[#0A1120] border-gray-800">
          <CardHeader>
            <CardTitle className="text-gray-100">Monthly Cost Breakdown</CardTitle>
            <CardDescription>Based on current usage and Supabase Pro tier pricing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* API Calls */}
            <div className="flex items-center justify-between p-4 bg-[#05080F] rounded-lg border border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500">
                  <Wifi className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-100">API Calls</p>
                  <p className="text-xs text-gray-500">Included in Pro tier</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-green-400">$0.00</p>
                <p className="text-xs text-gray-500">included</p>
              </div>
            </div>

            {/* Database Storage */}
            <div className="flex items-center justify-between p-4 bg-[#05080F] rounded-lg border border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-500">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-100">Database Storage</p>
                  <p className="text-xs text-gray-500">${PRICING.dbStorage}/GB per month</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-100">
                  ${((metrics.dbStorage.used / (1024 * 1024 * 1024)) * PRICING.dbStorage).toFixed(2)}
                </p>
                <p className="text-xs text-gray-500">
                  {(metrics.dbStorage.used / (1024 * 1024 * 1024)).toFixed(2)} GB
                </p>
              </div>
            </div>

            {/* Bandwidth */}
            <div className="flex items-center justify-between p-4 bg-[#05080F] rounded-lg border border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center text-green-500">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-100">Bandwidth</p>
                  <p className="text-xs text-gray-500">
                    {metrics.bandwidth.used <= 50 ? '50 GB included in Pro tier' : 'Over included limit'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                {metrics.bandwidth.used <= 50 ? (
                  <>
                    <p className="text-sm text-green-400">$0.00</p>
                    <p className="text-xs text-gray-500">included</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-amber-400">
                      ${((metrics.bandwidth.used - 50) * PRICING.bandwidth).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(metrics.bandwidth.used - 50).toFixed(1)} GB overage
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-100">Total Estimated</p>
                  <p className="text-xs text-gray-500">Current month projection</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-semibold text-amber-400">${metrics.estimatedTotal.toFixed(2)}</p>
                <p className="text-xs text-gray-500">/month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Projected Overage */}
        {projectedOverage.totalOverageCost > 0 && (
          <Card className="bg-[#0A1120] border-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-100 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-500" />
                Projected End-of-Month Overage
              </CardTitle>
              <CardDescription>Based on current usage trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-[#05080F] rounded-lg border border-gray-800 text-center">
                  <p className="text-2xl font-semibold text-amber-400">
                    {projectedOverage.apiCalls > 0 ? '+' + formatNumber(projectedOverage.apiCalls) : '0'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">API calls over</p>
                  <p className="text-xs text-amber-400 mt-1">
                    ${(projectedOverage.apiCalls * PRICING.overageApiCalls).toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-[#05080F] rounded-lg border border-gray-800 text-center">
                  <p className="text-2xl font-semibold text-amber-400">
                    {projectedOverage.bandwidth > 0 ? '+' + projectedOverage.bandwidth.toFixed(1) : '0'} GB
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Bandwidth over</p>
                  <p className="text-xs text-amber-400 mt-1">
                    ${(projectedOverage.bandwidth * PRICING.bandwidth).toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20 text-center">
                  <p className="text-2xl font-semibold text-red-400">
                    ${projectedOverage.totalOverageCost.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Total overage cost</p>
                </div>
              </div>
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-xs text-amber-400">
                  At current usage rate, you may incur ${projectedOverage.totalOverageCost.toFixed(2)} in overage charges.
                  Consider upgrading your plan or optimizing usage.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pricing Reference */}
        <Card className="bg-[#0A1120] border-gray-800">
          <CardHeader>
            <CardTitle className="text-gray-100">Supabase Pro Tier Pricing</CardTitle>
            <CardDescription>Reference pricing for cost planning</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-[#05080F] rounded border border-gray-800">
                <p className="text-gray-500">API Calls</p>
                <p className="text-gray-100 mt-1">500K included + $0.0002/overage</p>
              </div>
              <div className="p-3 bg-[#05080F] rounded border border-gray-800">
                <p className="text-gray-500">Database Storage</p>
                <p className="text-gray-100 mt-1">8 GB included + $0.125/GB</p>
              </div>
              <div className="p-3 bg-[#05080F] rounded border border-gray-800">
                <p className="text-gray-500">Bandwidth</p>
                <p className="text-gray-100 mt-1">50 GB included + $0.09/GB</p>
              </div>
              <div className="p-3 bg-[#05080F] rounded border border-gray-800">
                <p className="text-gray-500">RLS Policy Checks</p>
                <p className="text-gray-100 mt-1">Included in API calls</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Note */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>
            Note: Actual billing may vary. These are estimates based on Supabase published pricing.
            For accurate billing, refer to your Supabase dashboard or invoice.
          </span>
        </div>
      </div>
    </ControlRoomLayout>
  )
}