import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { ControlRoomLayout } from '@/components/controlroom/ControlRoomLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  Smartphone,
  MessageSquare,
  Mail,
  Shield,
  Key,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Save,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface OtpSettings {
  id: string
  provider: string
  account_sid: string
  auth_token_ref: string
  verify_service_sid: string
  api_key_ref: string
  from_number: string
  from_email: string
  from_name: string
  reply_to_email: string
  code_length: number
  expiry_seconds: number
  max_attempts: number
  lockout_duration_minutes: number
  resend_cooldown_seconds: number
  channels_priority: string[]
  is_active: boolean
  updated_at: string
}

const providerIcons: Record<string, React.ReactNode> = {
  twilio: <Smartphone className="w-5 h-5" />,
  zenziva: <MessageSquare className="w-5 h-5" />,
  whatsapp: <MessageSquare className="w-5 h-5" />,
  resend: <Mail className="w-5 h-5" />,
  sendgrid: <Mail className="w-5 h-5" />,
}

export default function OtpSettings() {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    provider: 'resend',
    account_sid: '',
    auth_token_ref: '',
    verify_service_sid: '',
    api_key_ref: '',
    from_number: '',
    from_email: 'noreply@denticare.pro',
    from_name: 'DentiCare Pro',
    reply_to_email: 'support@denticare.pro',
    code_length: 6,
    expiry_seconds: 300,
    max_attempts: 5,
    lockout_duration_minutes: 15,
    resend_cooldown_seconds: 60,
    channels_priority: ['whatsapp', 'sms', 'email'],
  })

  // Fetch OTP settings
  const { data: settings, isLoading } = useQuery<OtpSettings[]>({
    queryKey: ['controlroom', 'otp-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('controlroom.otp_settings')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    staleTime: 60 * 1000,
  })

  // Update OTP settings mutation
  const updateSettings = useMutation({
    mutationFn: async (data: Partial<OtpSettings>) => {
      const { error } = await supabase
        .from('controlroom.otp_settings')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', settings?.[0]?.id)

      if (error) throw error
    },
    onSuccess: () => {
      toast({ title: 'OTP settings updated successfully' })
      queryClient.invalidateQueries({ queryKey: ['controlroom', 'otp-settings'] })
    },
    onError: (error: Error) => {
      toast({ title: 'Failed to update settings', description: error.message, variant: 'destructive' })
    },
  })

  // Use first settings record or defaults
  const currentSettings = settings?.[0] || formData

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = () => {
    updateSettings.mutate(formData)
  }

  const handleTestOtp = (channel: string) => {
    toast({ title: `Test ${channel} OTP sent`, description: 'Check your device/email' })
  }

  const superadmin = {
    email: 'arya@company.com',
    displayName: 'Arya Kusuma',
    tier: 'owner',
  }

  return (
    <ControlRoomLayout superadmin={superadmin} platformStatus="green">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-100">OTP Settings</h1>
            <p className="text-sm text-gray-500 mt-1">
              Configure OTP/verification providers for patient authentication
            </p>
          </div>
          <Button onClick={handleSave} className="bg-amber-500 hover:bg-amber-600 text-black gap-1.5">
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </div>

        <Tabs defaultValue="provider" className="space-y-4">
          <TabsList className="bg-[#0A1120] border border-gray-800">
            <TabsTrigger value="provider" className="data-[state=active]:bg-amber-500/20">Provider</TabsTrigger>
            <TabsTrigger value="channels" className="data-[state=active]:bg-amber-500/20">Channels</TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-amber-500/20">Security</TabsTrigger>
            <TabsTrigger value="templates" className="data-[state=active]:bg-amber-500/20">Templates</TabsTrigger>
          </TabsList>

          {/* Provider Configuration */}
          <TabsContent value="provider" className="space-y-4">
            <Card className="bg-[#0A1120] border-gray-800">
              <CardHeader>
                <CardTitle className="text-gray-100 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Provider Configuration
                </CardTitle>
                <CardDescription>Select and configure your OTP provider</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  {['twilio', 'zenziva', 'whatsapp', 'resend', 'sendgrid'].map((provider) => (
                    <div
                      key={provider}
                      className={cn(
                        'p-4 rounded-lg border cursor-pointer transition-colors',
                        currentSettings.provider === provider
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'border-gray-800 bg-[#05080F] hover:border-gray-700'
                      )}
                      onClick={() => handleInputChange('provider', provider)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center',
                          currentSettings.provider === provider ? 'bg-amber-500/20 text-amber-500' : 'bg-gray-800 text-gray-500'
                        )}>
                          {providerIcons[provider]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-100 capitalize">{provider}</p>
                          <p className="text-xs text-gray-500">
                            {provider === 'twilio' && 'SMS + Voice + WhatsApp'}
                            {provider === 'zenziva' && 'Indonesian SMS Gateway'}
                            {provider === 'whatsapp' && 'WhatsApp Business API'}
                            {provider === 'resend' && 'Email + OTP'}
                            {provider === 'sendgrid' && 'Email Provider'}
                          </p>
                        </div>
                        {currentSettings.provider === provider && (
                          <CheckCircle className="w-5 h-5 text-amber-500 ml-auto" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-800">
                  {currentSettings.provider === 'twilio' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="account_sid">Account SID</Label>
                        <Input
                          id="account_sid"
                          value={currentSettings.account_sid || ''}
                          onChange={(e) => handleInputChange('account_sid', e.target.value)}
                          className="bg-[#05080F] border-gray-700"
                          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="auth_token_ref">Auth Token (Vault Ref)</Label>
                        <Input
                          id="auth_token_ref"
                          value={currentSettings.auth_token_ref || ''}
                          onChange={(e) => handleInputChange('auth_token_ref', e.target.value)}
                          className="bg-[#05080F] border-gray-700"
                          placeholder="vault:secret_name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="verify_service_sid">Verify Service SID</Label>
                        <Input
                          id="verify_service_sid"
                          value={currentSettings.verify_service_sid || ''}
                          onChange={(e) => handleInputChange('verify_service_sid', e.target.value)}
                          className="bg-[#05080F] border-gray-700"
                          placeholder="VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="from_number">From Number</Label>
                        <Input
                          id="from_number"
                          value={currentSettings.from_number || ''}
                          onChange={(e) => handleInputChange('from_number', e.target.value)}
                          className="bg-[#05080F] border-gray-700"
                          placeholder="+1234567890"
                        />
                      </div>
                    </>
                  )}

                  {currentSettings.provider === 'zenziva' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="api_key_ref">User Key (Vault Ref)</Label>
                        <Input
                          id="api_key_ref"
                          value={currentSettings.api_key_ref || ''}
                          onChange={(e) => handleInputChange('api_key_ref', e.target.value)}
                          className="bg-[#05080F] border-gray-700"
                          placeholder="vault:zenziva_userkey"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="auth_token_ref">Pass Key (Vault Ref)</Label>
                        <Input
                          id="auth_token_ref"
                          value={currentSettings.auth_token_ref || ''}
                          onChange={(e) => handleInputChange('auth_token_ref', e.target.value)}
                          className="bg-[#05080F] border-gray-700"
                          placeholder="vault:zenziva_passkey"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="from_number">From Number</Label>
                        <Input
                          id="from_number"
                          value={currentSettings.from_number || ''}
                          onChange={(e) => handleInputChange('from_number', e.target.value)}
                          className="bg-[#05080F] border-gray-700"
                          placeholder="KLINIK"
                        />
                      </div>
                    </>
                  )}

                  {currentSettings.provider === 'resend' && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="api_key_ref">Resend API Key (Vault Ref)</Label>
                        <Input
                          id="api_key_ref"
                          value={currentSettings.api_key_ref || ''}
                          onChange={(e) => handleInputChange('api_key_ref', e.target.value)}
                          className="bg-[#05080F] border-gray-700"
                          placeholder="vault:resend_api_key"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="from_email">From Email</Label>
                        <Input
                          id="from_email"
                          type="email"
                          value={currentSettings.from_email}
                          onChange={(e) => handleInputChange('from_email', e.target.value)}
                          className="bg-[#05080F] border-gray-700"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="from_name">From Name</Label>
                        <Input
                          id="from_name"
                          value={currentSettings.from_name}
                          onChange={(e) => handleInputChange('from_name', e.target.value)}
                          className="bg-[#05080F] border-gray-700"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reply_to_email">Reply-To Email</Label>
                        <Input
                          id="reply_to_email"
                          type="email"
                          value={currentSettings.reply_to_email}
                          onChange={(e) => handleInputChange('reply_to_email', e.target.value)}
                          className="bg-[#05080F] border-gray-700"
                        />
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Channel Configuration */}
          <TabsContent value="channels" className="space-y-4">
            <Card className="bg-[#0A1120] border-gray-800">
              <CardHeader>
                <CardTitle className="text-gray-100">Channel Priority</CardTitle>
                <CardDescription>Set the order of channels for OTP delivery</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {['whatsapp', 'sms', 'email'].map((channel, index) => (
                    <div key={channel} className="flex items-center justify-between p-3 bg-[#05080F] rounded-lg border border-gray-800">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 font-medium">
                          {index + 1}
                        </div>
                        {channel === 'whatsapp' && <MessageSquare className="w-5 h-5 text-green-500" />}
                        {channel === 'sms' && <Smartphone className="w-5 h-5 text-blue-500" />}
                        {channel === 'email' && <Mail className="w-5 h-5 text-purple-500" />}
                        <span className="text-gray-100 capitalize">{channel}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="text-gray-500 hover:text-gray-300">
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  System will try channels in order until delivery is confirmed. Falls back to next channel if delivery fails.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-4">
            <Card className="bg-[#0A1120] border-gray-800">
              <CardHeader>
                <CardTitle className="text-gray-100 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security Parameters
                </CardTitle>
                <CardDescription>Configure OTP security settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="code_length">Code Length</Label>
                    <Select
                      value={String(currentSettings.code_length || 6)}
                      onValueChange={(v) => handleInputChange('code_length', parseInt(v))}
                    >
                      <SelectTrigger className="bg-[#05080F] border-gray-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="4">4 digits</SelectItem>
                        <SelectItem value="5">5 digits</SelectItem>
                        <SelectItem value="6">6 digits</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiry_seconds">OTP Expiry</Label>
                    <Select
                      value={String(currentSettings.expiry_seconds || 300)}
                      onValueChange={(v) => handleInputChange('expiry_seconds', parseInt(v))}
                    >
                      <SelectTrigger className="bg-[#05080F] border-gray-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="60">1 minute</SelectItem>
                        <SelectItem value="180">3 minutes</SelectItem>
                        <SelectItem value="300">5 minutes</SelectItem>
                        <SelectItem value="600">10 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_attempts">Max Attempts</Label>
                    <Select
                      value={String(currentSettings.max_attempts || 5)}
                      onValueChange={(v) => handleInputChange('max_attempts', parseInt(v))}
                    >
                      <SelectTrigger className="bg-[#05080F] border-gray-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3">3 attempts</SelectItem>
                        <SelectItem value="5">5 attempts</SelectItem>
                        <SelectItem value="10">10 attempts</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lockout_duration_minutes">Lockout Duration</Label>
                    <Select
                      value={String(currentSettings.lockout_duration_minutes || 15)}
                      onValueChange={(v) => handleInputChange('lockout_duration_minutes', parseInt(v))}
                    >
                      <SelectTrigger className="bg-[#05080F] border-gray-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 minutes</SelectItem>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="resend_cooldown_seconds">Resend Cooldown</Label>
                    <Select
                      value={String(currentSettings.resend_cooldown_seconds || 60)}
                      onValueChange={(v) => handleInputChange('resend_cooldown_seconds', parseInt(v))}
                    >
                      <SelectTrigger className="bg-[#05080F] border-gray-700">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 seconds</SelectItem>
                        <SelectItem value="60">60 seconds</SelectItem>
                        <SelectItem value="120">2 minutes</SelectItem>
                        <SelectItem value="300">5 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Message Templates */}
          <TabsContent value="templates" className="space-y-4">
            <Card className="bg-[#0A1120] border-gray-800">
              <CardHeader>
                <CardTitle className="text-gray-100">OTP Message Templates</CardTitle>
                <CardDescription>Customize OTP message content per channel</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>WhatsApp Template</Label>
                  <Textarea
                    className="bg-[#05080F] border-gray-700 h-24"
                    defaultValue="Halo {{patient_name}}! Kode verifikasi DentiCare Pro kamu adalah {{otp_code}}. Jangan bagikan kode ini ke siapapun. Berlaku selama {{expiry_minutes}} menit."
                    placeholder="Enter WhatsApp template..."
                  />
                  <p className="text-xs text-gray-500">Variables: {'{{patient_name}}'}, {'{{otp_code}}'}, {'{{expiry_minutes}}'}, {'{{clinic_name}}'}</p>
                </div>
                <div className="space-y-2">
                  <Label>SMS Template</Label>
                  <Textarea
                    className="bg-[#05080F] border-gray-700 h-20"
                    defaultValue="[DentiCare] Kode verifikasi: {{otp_code}}. Jangan bagikan. Berlaku {{expiry_minutes}} menit."
                    placeholder="Enter SMS template..."
                  />
                  <p className="text-xs text-gray-500">SMS is limited to 160 characters. Keep it short.</p>
                </div>
                <div className="space-y-2">
                  <Label>Email Subject</Label>
                  <Input
                    className="bg-[#05080F] border-gray-700"
                    defaultValue="Kode Verifikasi DentiCare Pro Anda"
                    placeholder="Enter email subject..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Body</Label>
                  <Textarea
                    className="bg-[#05080F] border-gray-700 h-32"
                    defaultValue="Halo {{patient_name}},&#10;&#10;Kode verifikasi DentiCare Pro kamu adalah:&#10;&#10;{{otp_code}}&#10;&#10;Jangan bagikan kode ini ke siapapun.&#10;&#10;Kode berlaku selama {{expiry_minutes}} menit.&#10;&#10;Salam,&#10;DentiCare Pro"
                    placeholder="Enter email body..."
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ControlRoomLayout>
  )
}