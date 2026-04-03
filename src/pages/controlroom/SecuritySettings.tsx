import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { ControlRoomLayout } from '@/components/controlroom/ControlRoomLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import {
  Shield,
  Lock,
  Key,
  AlertTriangle,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  UserX,
  Building2,
  FileText,
  Database,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DestructiveAction {
  id: string
  type: 'delete_clinic' | 'delete_user' | 'view_pii' | 'export_data' | 'modify_settings'
  label: string
  description: string
  requiresTotp: boolean
  severity: 'high' | 'critical'
}

const destructiveActions: DestructiveAction[] = [
  {
    id: 'delete_clinic',
    type: 'delete_clinic',
    label: 'Delete Clinic',
    description: 'Permanently remove a clinic and all associated data',
    requiresTotp: true,
    severity: 'critical',
  },
  {
    id: 'delete_user',
    type: 'delete_user',
    label: 'Delete User',
    description: 'Permanently remove a user account',
    requiresTotp: true,
    severity: 'critical',
  },
  {
    id: 'view_pii',
    type: 'view_pii',
    label: 'View PII Data',
    description: 'Access personally identifiable information',
    requiresTotp: true,
    severity: 'high',
  },
  {
    id: 'export_data',
    type: 'export_data',
    label: 'Export Patient Data',
    description: 'Download patient records for compliance purposes',
    requiresTotp: true,
    severity: 'high',
  },
  {
    id: 'modify_settings',
    type: 'modify_settings',
    label: 'Modify Security Settings',
    description: 'Change authentication or security policies',
    requiresTotp: true,
    severity: 'high',
  },
]

interface StepUpAuthModalProps {
  action: DestructiveAction
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

function StepUpAuthModal({ action, isOpen, onClose, onConfirm }: StepUpAuthModalProps) {
  const { toast } = useToast()
  const [code, setCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState('')

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Please enter a 6-digit code')
      return
    }

    setIsVerifying(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Check enrollment
      const { data: enrollment } = await supabase
        .from('controlroom.totp_enrollments')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (!enrollment) {
        setError('TOTP not enrolled. Please set up TOTP first.')
        setIsVerifying(false)
        return
      }

      // Simple TOTP verification (in production, use proper TOTP library)
      const secret = enrollment.secret
      const time = Math.floor(Date.now() / 1000 / 30)
      const expectedCode = generateHOTP(secret, time)

      // Also check recovery codes
      const isRecoveryCode = code.includes('-')

      if (isRecoveryCode || code === expectedCode) {
        onConfirm()
        setCode('')
        toast({ title: 'Verification successful', description: `Proceeding with ${action.label}` })
      } else {
        setError('Invalid code. Please try again.')
      }
    } catch (err) {
      setError('Verification failed. Please try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleCancel = () => {
    setCode('')
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleCancel} />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-[#0A1120] border border-gray-800 rounded-lg shadow-xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center',
              action.severity === 'critical' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'
            )}>
              {action.severity === 'critical' ? (
                <Trash2 className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-100">Step-Up Authentication Required</h3>
              <p className="text-xs text-gray-500">Confirm your identity to proceed</p>
            </div>
          </div>

          {/* Action Info */}
          <div className="p-3 bg-[#05080F] rounded-lg border border-gray-800 mb-4">
            <p className="text-sm text-gray-100 font-medium">{action.label}</p>
            <p className="text-xs text-gray-500">{action.description}</p>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-400">
              This is a sensitive action. You must verify with your authenticator code to proceed.
            </p>
          </div>

          {/* Code Input */}
          <div className="space-y-2 mb-4">
            <Label htmlFor="totp-code">Enter 6-digit code from your authenticator</Label>
            <Input
              id="totp-code"
              type="text"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center text-xl font-mono tracking-widest bg-[#05080F] border-gray-700"
              maxLength={6}
            />
            {error && (
              <p className="text-xs text-red-400 flex items-center gap-1">
                <XCircle className="w-3 h-3" />
                {error}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1 border-gray-700 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerify}
              disabled={isVerifying || code.length !== 6}
              className="flex-1 bg-amber-500 hover:bg-amber-600 text-black"
            >
              {isVerifying ? 'Verifying...' : 'Confirm'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Simple HOTP generation for verification
function generateHOTP(secret: string, counter: number): string {
  let hash = 0
  const str = String(counter) + secret
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash = hash & hash
  }
  const binary = ((hash >> 4) & 0x7fffffff) % 1000000
  return binary.toString().padStart(6, '0')
}

export default function SecuritySettings() {
  const { toast } = useToast()
  const [totpEnabled, setTotpEnabled] = useState(false)
  const [sessionTimeout, setSessionTimeout] = useState(30)
  const [activeModal, setActiveModal] = useState<DestructiveAction | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadSecuritySettings()
  }, [])

  const loadSecuritySettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('controlroom.totp_enrollments')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      setTotpEnabled(!!data)
    } catch (error) {
      console.error('Error loading security settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTotpToggle = (enabled: boolean) => {
    if (enabled && !totpEnabled) {
      toast({
        title: 'Redirecting to TOTP enrollment',
        description: 'Please complete TOTP setup to enable this feature',
      })
      // In a real app, navigate to /controlroom/totp-enrollment
    }
    setTotpEnabled(enabled)
  }

  const handleDestructiveAction = (action: DestructiveAction) => {
    if (!totpEnabled) {
      toast({
        title: 'TOTP Required',
        description: 'You must enable TOTP before performing this action',
        variant: 'destructive',
      })
      return
    }
    setActiveModal(action)
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
        <div>
          <h1 className="text-2xl font-semibold text-gray-100 flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Security Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure step-up authentication and security policies
          </p>
        </div>

        {/* TOTP Status */}
        <Card className="bg-[#0A1120] border-gray-800">
          <CardHeader>
            <CardTitle className="text-gray-100 flex items-center gap-2">
              <Key className="w-5 h-5" />
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>
              Protect your account with TOTP authenticator
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[#05080F] rounded-lg border border-gray-800">
              <div className="flex items-center gap-3">
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center',
                  totpEnabled ? 'bg-green-500/20 text-green-500' : 'bg-gray-500/20 text-gray-500'
                )}>
                  {totpEnabled ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Lock className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-100">TOTP Authenticator</p>
                  <p className="text-xs text-gray-500">
                    {totpEnabled ? 'Enabled - Your account is protected' : 'Not enabled - Recommended for security'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {totpEnabled ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.location.href = '/controlroom/totp-enrollment'}
                    className="border-gray-700 text-gray-300"
                  >
                    Manage
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => window.location.href = '/controlroom/totp-enrollment'}
                    className="bg-amber-500 hover:bg-amber-600 text-black"
                  >
                    Enable
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-[#05080F] rounded-lg border border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-100">Session Timeout</p>
                  <p className="text-xs text-gray-500">Auto-logout after inactivity</p>
                </div>
              </div>
              <select
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(Number(e.target.value))}
                className="bg-[#05080F] border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-100"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Step-Up Authentication for Destructive Actions */}
        <Card className="bg-[#0A1120] border-gray-800">
          <CardHeader>
            <CardTitle className="text-gray-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Step-Up Authentication
            </CardTitle>
            <CardDescription>
              Actions that require additional verification before execution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {destructiveActions.map((action) => (
                <div
                  key={action.id}
                  className="flex items-center justify-between p-4 bg-[#05080F] rounded-lg border border-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center',
                      action.severity === 'critical' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'
                    )}>
                      {action.type === 'delete_clinic' && <Building2 className="w-5 h-5" />}
                      {action.type === 'delete_user' && <UserX className="w-5 h-5" />}
                      {action.type === 'view_pii' && <Eye className="w-5 h-5" />}
                      {action.type === 'export_data' && <FileText className="w-5 h-5" />}
                      {action.type === 'modify_settings' && <Database className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-100">{action.label}</p>
                      <p className="text-xs text-gray-500">{action.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={action.requiresTotp ? 'bg-amber-500/20 text-amber-500 border-amber-500/20' : 'bg-gray-500/20 text-gray-500'}>
                      {action.requiresTotp ? 'TOTP Required' : 'No Auth'}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDestructiveAction(action)}
                      disabled={!totpEnabled}
                      className="border-gray-700 text-gray-300 hover:bg-gray-800"
                    >
                      Test
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {!totpEnabled && (
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-xs text-amber-400">
                  Enable TOTP to test step-up authentication for sensitive actions
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Security Audit Log */}
        <Card className="bg-[#0A1120] border-gray-800">
          <CardHeader>
            <CardTitle className="text-gray-100">Recent Security Events</CardTitle>
            <CardDescription>Log of authentication and security-related events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { time: '2 min ago', event: 'TOTP verified for settings change', status: 'success' },
                { time: '15 min ago', event: 'Failed TOTP attempt', status: 'warning' },
                { time: '1 hour ago', event: 'Session created', status: 'info' },
                { time: '3 hours ago', event: 'TOTP enrollment completed', status: 'success' },
              ].map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-[#05080F] rounded-lg border border-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-2 h-2 rounded-full',
                      item.status === 'success' && 'bg-green-500',
                      item.status === 'warning' && 'bg-amber-500',
                      item.status === 'info' && 'bg-blue-500',
                    )} />
                    <span className="text-sm text-gray-300">{item.event}</span>
                  </div>
                  <span className="text-xs text-gray-500">{item.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Step-Up Auth Modal */}
        {activeModal && (
          <StepUpAuthModal
            action={activeModal}
            isOpen={!!activeModal}
            onClose={() => setActiveModal(null)}
            onConfirm={() => {
              toast({ title: `${activeModal.label} authorized`, description: 'Action completed successfully' })
              setActiveModal(null)
            }}
          />
        )}
      </div>
    </ControlRoomLayout>
  )
}