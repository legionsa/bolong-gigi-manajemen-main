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
  HardDrive,
  Database,
  Cloud,
  File,
  FolderOpen,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface BucketInfo {
  id: string
  name: string
  public: boolean
  created_at: string
  file_count?: number
  total_size?: number
}

interface FileInfo {
  name: string
  size: number
  bucket: string
  created_at: string
  id: string
}

export default function StorageMonitor() {
  const { toast } = useToast()

  const [buckets, setBuckets] = useState<BucketInfo[]>([])
  const [topFiles, setTopFiles] = useState<FileInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  // Estimated costs (based on Supabase pricing)
  const STORAGE_COST_PER_GB = 0.021 // $0.021 per GB per month (Pro plan)
  const BANDWIDTH_COST_PER_GB = 0.09 // $0.09 per GB transfer

  // Free tier limits
  const FREE_STORAGE_GB = 1
  const FREE_BANDWIDTH_GB = 5

  useEffect(() => {
    fetchStorageData()
  }, [])

  const fetchStorageData = async () => {
    setIsLoading(true)

    try {
      // Fetch bucket information via Supabase Storage API
      const { data: bucketList, error } = await supabase.storage.listBuckets()

      if (error) throw error

      // Process buckets with mock data (in production, would need additional queries)
      const processedBuckets: BucketInfo[] = (bucketList || []).map(bucket => ({
        id: bucket.id,
        name: bucket.name,
        public: bucket.public,
        created_at: bucket.created_at,
        file_count: getMockFileCount(bucket.name),
        total_size: getMockBucketSize(bucket.name),
      }))

      // Sort by total size
      processedBuckets.sort((a, b) => (b.total_size || 0) - (a.total_size || 0))

      setBuckets(processedBuckets)

      // Fetch top files across all buckets
      const allFiles: FileInfo[] = []
      for (const bucket of processedBuckets) {
        const { data: files } = await supabase.storage.from(bucket.name).list({ limit: 5, sortBy: { column: 'size', order: 'desc' } })
        if (files) {
          files.forEach(file => {
            if (file.metadata && file.id) {
              allFiles.push({
                name: file.name,
                size: file.metadata.size || 0,
                bucket: bucket.name,
                created_at: file.created_at || new Date().toISOString(),
                id: file.id,
              })
            }
          })
        }
      }

      // Sort by size and take top 10
      allFiles.sort((a, b) => b.size - a.size)
      setTopFiles(allFiles.slice(0, 10))

      setLastRefresh(new Date())
    } catch (error: any) {
      toast({
        title: 'Failed to fetch storage data',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Mock data generators (replace with actual API calls in production)
  function getMockFileCount(bucketName: string): number {
    const counts: Record<string, number> = {
      'avatars': 1247,
      'clinic-logos': 342,
      'patient-documents': 5893,
      'prescriptions': 8234,
      'invoices': 15678,
      'chat-media': 45231,
    }
    return counts[bucketName] || Math.floor(Math.random() * 1000)
  }

  function getMockBucketSize(bucketName: string): number {
    const sizes: Record<string, number> = {
      'avatars': 512 * 1024 * 1024, // 512 MB
      'clinic-logos': 128 * 1024 * 1024, // 128 MB
      'patient-documents': 2.3 * 1024 * 1024 * 1024, // 2.3 GB
      'prescriptions': 1.8 * 1024 * 1024 * 1024, // 1.8 GB
      'invoices': 890 * 1024 * 1024, // 890 MB
      'chat-media': 12.4 * 1024 * 1024 * 1024, // 12.4 GB
    }
    return sizes[bucketName] || Math.floor(Math.random() * 1024 * 1024 * 500)
  }

  // Format bytes to human readable
  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Calculate totals
  const totalStorage = buckets.reduce((sum, b) => sum + (b.total_size || 0), 0)
  const totalFiles = buckets.reduce((sum, b) => sum + (b.file_count || 0), 0)
  const estimatedMonthlyStorageCost = (totalStorage / (1024 * 1024 * 1024)) * STORAGE_COST_PER_GB
  const estimatedBandwidthCost = 3.2 * BANDWIDTH_COST_PER_GB // Mock bandwidth
  const totalMonthlyCost = estimatedMonthlyStorageCost + estimatedBandwidthCost

  // Usage percentage for free tier
  const storageUsagePercent = Math.min((totalStorage / (FREE_STORAGE_GB * 1024 * 1024 * 1024)) * 100, 100)
  const isNearLimit = storageUsagePercent > 80
  const isOverLimit = storageUsagePercent > 100

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
              <HardDrive className="w-6 h-6" />
              Storage Monitor
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Supabase Storage usage and quota tracking
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Last updated: {format(lastRefresh, 'HH:mm:ss')}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStorageData}
              className="border-gray-700 text-gray-300"
            >
              <RefreshCw className={cn('w-4 h-4 mr-1', isLoading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Usage Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Storage */}
          <Card className="bg-[#0A1120] border-gray-800">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Storage Used</p>
                  <p className="text-2xl font-semibold text-gray-100">{formatBytes(totalStorage)}</p>
                  <p className="text-xs text-gray-500 mt-1">of {FREE_STORAGE_GB} GB free tier</p>
                </div>
                <div className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center',
                  isOverLimit ? 'bg-red-500/20 text-red-500' : isNearLimit ? 'bg-amber-500/20 text-amber-500' : 'bg-green-500/20 text-green-500'
                )}>
                  {isOverLimit ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : (
                    <Database className="w-6 h-6" />
                  )}
                </div>
              </div>
              <div className="mt-3">
                <Progress
                  value={Math.min(storageUsagePercent, 100)}
                  className="h-2"
                />
                <p className="text-xs text-gray-500 mt-1">{storageUsagePercent.toFixed(1)}% used</p>
              </div>
            </CardContent>
          </Card>

          {/* Total Files */}
          <Card className="bg-[#0A1120] border-gray-800">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Files</p>
                  <p className="text-2xl font-semibold text-gray-100">{totalFiles.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">across all buckets</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                  <File className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Monthly Cost */}
          <Card className="bg-[#0A1120] border-gray-800">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Est. Monthly Cost</p>
                  <p className="text-2xl font-semibold text-gray-100">${totalMonthlyCost.toFixed(2)}</p>
                  <p className="text-xs text-gray-500 mt-1">storage + bandwidth</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-500">
                  <Cloud className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alert for over limit */}
        {isOverLimit && (
          <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
            <div>
              <p className="text-sm text-red-400 font-medium">Storage Limit Exceeded</p>
              <p className="text-xs text-gray-400">
                You have exceeded the {FREE_STORAGE_GB} GB free tier limit. Consider upgrading to a paid plan or cleaning up unused files.
              </p>
            </div>
          </div>
        )}

        {/* Per-Bucket Breakdown */}
        <Card className="bg-[#0A1120] border-gray-800">
          <CardHeader>
            <CardTitle className="text-gray-100 flex items-center gap-2">
              <FolderOpen className="w-5 h-5" />
              Bucket Breakdown
            </CardTitle>
            <CardDescription>Storage usage per bucket</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {buckets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FolderOpen className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                  <p>No buckets found</p>
                </div>
              ) : (
                buckets.map((bucket) => {
                  const sizeGB = (bucket.total_size || 0) / (1024 * 1024 * 1024)
                  const bucketPercent = (bucket.total_size || 0) / totalStorage * 100 || 0

                  return (
                    <div key={bucket.id} className="p-4 bg-[#05080F] rounded-lg border border-gray-800">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center',
                            bucket.public ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-500'
                          )}>
                            {bucket.public ? (
                              <Cloud className="w-5 h-5" />
                            ) : (
                              <Lock className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-100">{bucket.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-xs border-gray-700 text-gray-400">
                                {bucket.file_count?.toLocaleString() || 0} files
                              </Badge>
                              {bucket.public ? (
                                <Badge variant="outline" className="text-xs border-green-500/50 text-green-500">
                                  Public
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs border-gray-600 text-gray-500">
                                  Private
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-100">{formatBytes(bucket.total_size || 0)}</p>
                          <p className="text-xs text-gray-500">{bucketPercent.toFixed(1)}% of total</p>
                        </div>
                      </div>
                      <Progress
                        value={bucketPercent}
                        className="h-1.5"
                      />
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top 10 Largest Files */}
        <Card className="bg-[#0A1120] border-gray-800">
          <CardHeader>
            <CardTitle className="text-gray-100 flex items-center gap-2">
              <File className="w-5 h-5" />
              Top 10 Largest Files
            </CardTitle>
            <CardDescription>Largest files across all buckets (names masked for privacy)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">File Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Bucket</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Size</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {topFiles.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        No files found
                      </td>
                    </tr>
                  ) : (
                    topFiles.map((file, idx) => (
                      <tr key={file.id || idx} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <File className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-300 font-mono">
                              {maskFileName(file.name)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs border-gray-700 text-gray-400">
                            {file.bucket}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-300">{formatBytes(file.size)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-500">
                            {format(new Date(file.created_at), 'dd MMM yyyy')}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Cost Breakdown */}
        <Card className="bg-[#0A1120] border-gray-800">
          <CardHeader>
            <CardTitle className="text-gray-100">Estimated Costs</CardTitle>
            <CardDescription>Based on Supabase Pro tier pricing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-[#05080F] rounded-lg border border-gray-800">
                <p className="text-xs text-gray-500 mb-1">Storage</p>
                <p className="text-lg font-semibold text-gray-100">
                  {formatBytes(totalStorage)} × ${STORAGE_COST_PER_GB}/GB
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  ${estimatedMonthlyStorageCost.toFixed(2)}/month
                </p>
              </div>
              <div className="p-4 bg-[#05080F] rounded-lg border border-gray-800">
                <p className="text-xs text-gray-500 mb-1">Bandwidth (est.)</p>
                <p className="text-lg font-semibold text-gray-100">
                  3.2 GB × ${BANDWIDTH_COST_PER_GB}/GB
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  ${estimatedBandwidthCost.toFixed(2)}/month
                </p>
              </div>
            </div>
            <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Total Estimated Monthly</span>
                <span className="text-lg font-semibold text-amber-400">${totalMonthlyCost.toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Free tier: {FREE_STORAGE_GB} GB storage, {FREE_BANDWIDTH_GB} GB bandwidth
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </ControlRoomLayout>
  )
}

// Mask file name for privacy (show first 4 and last 4 chars)
function maskFileName(name: string): string {
  if (name.length <= 12) return name
  const ext = name.split('.').pop() || ''
  const base = name.slice(0, -ext.length - 1)
  return base.slice(0, 4) + '****' + base.slice(-4) + '.' + ext
}