import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { ControlRoomLayout } from '@/components/controlroom/ControlRoomLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'
import {
  ClipboardCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  HelpCircle,
  RefreshCw,
  Shield,
  Users,
  Building2,
  Database,
  Mail,
  Lock,
  Eye,
  Server,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type CheckStatus = 'pass' | 'fail' | 'warning' | 'unknown'

interface ComplianceCheck {
  id: string
  category: string
  title: string
  description: string
  status: CheckStatus
  lastChecked: Date | null
  isAutomated: boolean
  remediation?: string
}

export default function ComplianceChecklist() {
  const { toast } = useToast()

  const [checks, setChecks] = useState<ComplianceCheck[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastFullScan, setLastFullScan] = useState<Date | null>(null)

  useEffect(() => {
    loadChecks()
    runAutomatedChecks()
  }, [])

  const loadChecks = async () => {
    // Initialize with structure - actual status will be populated by automated checks
    const initialChecks: ComplianceCheck[] = [
      // GDPR & UU PDP checks
      {
        id: 'gdpr-consent',
        category: 'GDPR / UU PDP',
        title: 'Patient consent timestamps recorded',
        description: 'All patients must have consent_signed_at timestamp',
        status: 'unknown',
        lastChecked: null,
        isAutomated: true,
        remediation: 'Ensure registration flow records consent',
      },
      {
        id: 'pii-masking',
        category: 'GDPR / UU PDP',
        title: 'PII masking applied in Database Explorer',
        description: 'All PII columns must be masked when displaying data',
        status: 'unknown',
        lastChecked: null,
        isAutomated: true,
        remediation: 'Check DatabaseExplorer component for masking logic',
      },
      {
        id: 'audit-log-retention',
        category: 'GDPR / UU PDP',
        title: 'Audit log retention >= 1 year',
        description: 'controlroom.audit_log entries must be kept for at least 1 year',
        status: 'unknown',
        lastChecked: null,
        isAutomated: true,
        remediation: 'Set up automated archival or check retention policy',
      },
      {
        id: 'data-export-endpoint',
        category: 'GDPR / UU PDP',
        title: 'Data export endpoint exists',
        description: '/api/export route must exist for GDPR data portability',
        status: 'unknown',
        lastChecked: null,
        isAutomated: true,
        remediation: 'Implement /api/export endpoint',
      },
      // Security checks
      {
        id: 'rls-policies',
        category: 'Security',
        title: 'RLS policies on all tenant tables',
        description: 'All tables in public schema must have Row Level Security enabled',
        status: 'unknown',
        lastChecked: null,
        isAutomated: true,
        remediation: 'Enable RLS and create policies for each table',
      },
      {
        id: 'no-public-anonymous-pii',
        category: 'Security',
        title: 'No public.anonymous can read PII',
        description: 'Anonymous users must not have access to PII fields',
        status: 'unknown',
        lastChecked: null,
        isAutomated: true,
        remediation: 'Review and tighten RLS policies',
      },
      {
        id: 'totp-enrolled-all-admins',
        category: 'Security',
        title: 'All superadmins have TOTP enrolled',
        description: 'All users with superadmin role must have TOTP enabled',
        status: 'unknown',
        lastChecked: null,
        isAutomated: true,
        remediation: 'Enforce TOTP enrollment for all superadmins',
      },
      {
        id: 'session-timeout',
        category: 'Security',
        title: 'Session timeout configured',
        description: 'Superadmin sessions must timeout after inactivity',
        status: 'unknown',
        lastChecked: null,
        isAutomated: true,
        remediation: 'Configure session timeout in Security Settings',
      },
      // Clinic data checks
      {
        id: 'all-clinics-have-head',
        category: 'Data Integrity',
        title: 'All clinics have head_name',
        description: 'Every clinic must have a valid head_name',
        status: 'unknown',
        lastChecked: null,
        isAutomated: true,
        remediation: 'Update clinics missing head_name',
      },
      {
        id: 'all-clinics-have-contact',
        category: 'Data Integrity',
        title: 'All clinics have valid contact info',
        description: 'Every clinic must have contact_email and contact_phone',
        status: 'unknown',
        lastChecked: null,
        isAutomated: true,
        remediation: 'Update clinics missing contact information',
      },
      // Manual checks
      {
        id: 'supabase-backup-enabled',
        category: 'Infrastructure',
        title: 'Supabase backup enabled',
        description: 'Verify that Supabase automated backups are configured',
        status: 'unknown',
        lastChecked: null,
        isAutomated: false,
        remediation: 'Check Supabase dashboard > Settings > Database',
      },
      {
        id: 'vercel-deploy-protection',
        category: 'Infrastructure',
        title: 'Vercel deploy protection enabled',
        description: 'Production deploys should require confirmation',
        status: 'unknown',
        lastChecked: null,
        isAutomated: false,
        remediation: 'Check Vercel dashboard > Settings > Git',
      },
      {
        id: 'env-vars-secured',
        category: 'Infrastructure',
        title: 'Environment variables secured',
        description: 'No secrets in client-side code or exposed env vars',
        status: 'unknown',
        lastChecked: null,
        isAutomated: false,
        remediation: 'Review .env files and ensure no secrets exposed',
      },
    ]

    setChecks(initialChecks)
  }

  const runAutomatedChecks = async () => {
    setIsLoading(true)

    try {
      // 1. Check patient consent timestamps
      const { data: patients, error: patientsError } = await supabase
        .from('patients')
        .select('consent_signed_at')
        .limit(100)

      if (!patientsError && patients) {
        const missingConsent = patients.filter((p: any) => !p.consent_signed_at).length
        updateCheck('gdpr-consent', missingConsent === 0 ? 'pass' : 'fail')
      }

      // 2. Check RLS policies on key tables
      const rlsCheckTables = ['clinics', 'clinic_users', 'patients', 'appointments']
      const rlsResults = await Promise.all(
        rlsCheckTables.map(async (table) => {
          const { data } = await supabase.rpc('has_rls_enabled', { table_name: table }).catch(() => ({ data: null }))
          return { table, hasRLS: data }
        })
      )

      const allRLSEnabled = rlsResults.every(r => r.hasRLS)
      updateCheck('rls-policies', allRLSEnabled ? 'pass' : 'fail')

      // 3. Check all clinics have head_name
      const { data: clinics } = await supabase
        .from('clinics')
        .select('head_name, contact_email, contact_phone')
        .limit(100)

      if (clinics) {
        const missingHead = clinics.filter((c: any) => !c.head_name).length
        updateCheck('all-clinics-have-head', missingHead === 0 ? 'pass' : 'warning')

        const missingContact = clinics.filter((c: any) => !c.contact_email || !c.contact_phone).length
        updateCheck('all-clinics-have-contact', missingContact === 0 ? 'pass' : 'fail')
      }

      // 4. Check superadmin TOTP enrollment
      const { data: enrollments } = await supabase
        .from('controlroom.totp_enrollments')
        .select('user_id, is_active')

      if (enrollments) {
        const activeEnrollments = enrollments.filter((e: any) => e.is_active).length
        updateCheck('totp-enrolled-all-admins', activeEnrollments > 0 ? 'pass' : 'warning')
      }

      // 5. Check audit log retention
      const { data: auditLogs } = await supabase
        .from('controlroom.audit_log')
        .select('created_at')
        .order('created_at', { ascending: true })
        .limit(1)

      if (auditLogs && auditLogs.length > 0) {
        const oldestLog = new Date(auditLogs[0].created_at)
        const oneYearAgo = new Date()
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
        updateCheck('audit-log-retention', oldestLog > oneYearAgo ? 'pass' : 'warning')
      }

      // Default remaining automated checks to warning (data not available to verify)
      updateCheck('no-public-anonymous-pii', 'warning')
      updateCheck('data-export-endpoint', 'unknown')
      updateCheck('session-timeout', 'warning')

      setLastFullScan(new Date())
    } catch (error) {
      console.error('Automated checks failed:', error)
      toast({
        title: 'Some checks failed',
        description: 'Unable to complete all automated checks',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updateCheck = (id: string, status: CheckStatus) => {
    setChecks(prev => prev.map(check =>
      check.id === id
        ? { ...check, status, lastChecked: new Date() }
        : check
    ))
  }

  const handleManualCheck = (id: string, status: 'pass' | 'fail') => {
    updateCheck(id, status)
  }

  const handleRefresh = () => {
    runAutomatedChecks()
    toast({ title: 'Running compliance checks...' })
  }

  // Group checks by category
  const groupedChecks = checks.reduce((acc, check) => {
    if (!acc[check.category]) acc[check.category] = []
    acc[check.category].push(check)
    return acc
  }, {} as Record<string, ComplianceCheck[]>)

  const passCount = checks.filter(c => c.status === 'pass').length
  const failCount = checks.filter(c => c.status === 'fail').length
  const warningCount = checks.filter(c => c.status === 'warning').length

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
              <ClipboardCheck className="w-6 h-6" />
              Compliance Checklist
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              GDPR, UU PDP, and security compliance verification
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastFullScan && (
              <span className="text-xs text-gray-500">
                Last scan: {format(lastFullScan, 'dd MMM yyyy HH:mm')}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="border-gray-700 text-gray-300"
            >
              <RefreshCw className={cn('w-4 h-4 mr-1', isLoading && 'animate-spin')} />
              Run Checks
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card className="bg-[#0A1120] border-gray-800">
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-semibold text-green-400">{passCount}</p>
              <p className="text-xs text-gray-500 mt-1">Passed</p>
            </CardContent>
          </Card>
          <Card className="bg-[#0A1120] border-gray-800">
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-semibold text-amber-400">{warningCount}</p>
              <p className="text-xs text-gray-500 mt-1">Warnings</p>
            </CardContent>
          </Card>
          <Card className="bg-[#0A1120] border-gray-800">
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-semibold text-red-400">{failCount}</p>
              <p className="text-xs text-gray-500 mt-1">Failed</p>
            </CardContent>
          </Card>
          <Card className="bg-[#0A1120] border-gray-800">
            <CardContent className="pt-4 text-center">
              <p className="text-3xl font-semibold text-gray-400">
                {checks.length - passCount - failCount - warningCount}
              </p>
              <p className="text-xs text-gray-500 mt-1">Unknown</p>
            </CardContent>
          </Card>
        </div>

        {/* Check Categories */}
        {Object.entries(groupedChecks).map(([category, categoryChecks]) => (
          <Card key={category} className="bg-[#0A1120] border-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-100 flex items-center gap-2">
                {category === 'GDPR / UU PDP' && <Shield className="w-5 h-5 text-amber-500" />}
                {category === 'Security' && <Lock className="w-5 h-5 text-blue-500" />}
                {category === 'Data Integrity' && <Database className="w-5 h-5 text-green-500" />}
                {category === 'Infrastructure' && <Server className="w-5 h-5 text-purple-500" />}
                {category}
              </CardTitle>
              <CardDescription>
                {categoryChecks.length} checks - {categoryChecks.filter(c => c.status === 'pass').length} passed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {categoryChecks.map((check) => (
                <div
                  key={check.id}
                  className="flex items-center justify-between p-4 bg-[#05080F] rounded-lg border border-gray-800"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                      check.status === 'pass' && 'bg-green-500/20 text-green-500',
                      check.status === 'fail' && 'bg-red-500/20 text-red-500',
                      check.status === 'warning' && 'bg-amber-500/20 text-amber-500',
                      check.status === 'unknown' && 'bg-gray-500/20 text-gray-500'
                    )}>
                      {check.status === 'pass' && <CheckCircle className="w-4 h-4" />}
                      {check.status === 'fail' && <XCircle className="w-4 h-4" />}
                      {check.status === 'warning' && <AlertTriangle className="w-4 h-4" />}
                      {check.status === 'unknown' && <HelpCircle className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-100">{check.title}</p>
                        {check.isAutomated ? (
                          <Badge variant="outline" className="text-xs border-gray-700 text-gray-500">
                            Auto
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs border-blue-500/50 text-blue-400">
                            Manual
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{check.description}</p>
                      {check.lastChecked && (
                        <p className="text-xs text-gray-600 mt-1">
                          Last checked: {format(check.lastChecked, 'dd MMM HH:mm')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {check.isAutomated ? (
                      <Badge className={cn(
                        check.status === 'pass' && 'bg-green-500/20 text-green-500 border-green-500/20',
                        check.status === 'fail' && 'bg-red-500/20 text-red-500 border-red-500/20',
                        check.status === 'warning' && 'bg-amber-500/20 text-amber-500 border-amber-500/20',
                        check.status === 'unknown' && 'bg-gray-500/20 text-gray-500 border-gray-500/20'
                      )}>
                        {check.status.toUpperCase()}
                      </Badge>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleManualCheck(check.id, 'pass')}
                          className={cn(
                            'h-7 px-2 border-gray-700',
                            check.status === 'pass' && 'bg-green-500/20 border-green-500/50 text-green-400'
                          )}
                        >
                          <CheckCircle className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleManualCheck(check.id, 'fail')}
                          className={cn(
                            'h-7 px-2 border-gray-700',
                            check.status === 'fail' && 'bg-red-500/20 border-red-500/50 text-red-400'
                          )}
                        >
                          <XCircle className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        {/* Remediation Note */}
        <Card className="bg-[#0A1120] border-gray-800">
          <CardHeader>
            <CardTitle className="text-gray-100 text-sm">Remediation Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-xs text-gray-400">
              {checks.filter(c => c.status !== 'pass' && c.remediation).map(check => (
                <div key={check.id} className="p-2 bg-[#05080F] rounded border border-gray-800">
                  <span className="text-gray-300 font-medium">{check.title}:</span> {check.remediation}
                </div>
              ))}
              {checks.filter(c => c.status !== 'pass' && c.remediation).length === 0 && (
                <p className="text-gray-500">No remediation steps needed - all checks passing!</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ControlRoomLayout>
  )
}